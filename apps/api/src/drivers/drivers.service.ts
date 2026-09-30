import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { MissionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeEventsService } from '../tracking/realtime-events.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { SmtpEmailSender } from '../auth/senders/smtp-email.sender';
import { DRIVER_INVITATION_TTL_MS, generateDriverLinkToken } from './driver-link-token';

/** Statuts de mission qui rendent un chauffeur indisponible pour une nouvelle affectation. */
const OCCUPYING_STATUSES: MissionStatus[] = [MissionStatus.ASSIGNED, MissionStatus.STARTED, MissionStatus.IN_PROGRESS];

/**
 * PRIMARY ARCHITECTURE : l'identité d'un chauffeur a UN seul enregistrement `Driver`. L'admin invite
 * le chauffeur (`create`) : un lien d'activation à usage unique part par e-mail, et le chauffeur
 * choisit son mot de passe dans l'application mobile en l'ouvrant. L'admin ne crée JAMAIS une
 * seconde ligne pour le même humain — il recherche le compte existant (`listLinkable`) puis le
 * lie/rattache (PATCH). `create` est protégé contre les doublons (téléphone / e-mail).
 */
@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeEventsService,
    private readonly emailSender: SmtpEmailSender,
  ) {}

  /**
   * Invite un chauffeur qui n'a pas (encore) de compte mobile : crée sa fiche puis lui envoie par
   * e-mail le lien d'activation. Refuse la création si un compte existe déjà avec le même téléphone
   * ou le même e-mail (un humain = une ligne `Driver`, jamais deux).
   */
  async create(organizationId: string, dto: CreateDriverDto) {
    const phone = dto.phone;
    const email = dto.email?.trim() ? dto.email.trim().toLowerCase() : undefined;
    const [existingByPhone, existingByEmail] = await Promise.all([
      phone ? this.prisma.driver.findFirst({ where: { phone, deletedAt: null } }) : null,
      email ? this.prisma.driver.findFirst({ where: { email, deletedAt: null } }) : null,
    ]);
    if (existingByPhone) {
      throw new ConflictException(
        existingByPhone.organizationId === organizationId
          ? `Ce numéro est déjà utilisé par ${existingByPhone.firstName} ${existingByPhone.lastName}. Ouvrez sa fiche dans la liste des chauffeurs.`
          : 'Ce numéro est déjà utilisé par un autre compte chauffeur. Vérifiez le numéro ou contactez un administrateur.',
      );
    }
    if (existingByEmail) {
      throw new ConflictException(
        existingByEmail.organizationId === organizationId
          ? `Cet e-mail est déjà utilisé par ${existingByEmail.firstName} ${existingByEmail.lastName}. Ouvrez sa fiche dans la liste des chauffeurs.`
          : 'Cet e-mail est déjà utilisé par un autre compte chauffeur. Vérifiez l’adresse ou contactez un administrateur.',
      );
    }

    // Le lien d'activation part par e-mail : sans adresse (appels internes), pas d'invitation.
    const invitation = email ? generateDriverLinkToken(DRIVER_INVITATION_TTL_MS) : null;
    let driver;
    try {
      driver = await this.prisma.driver.create({
        data: {
          ...dto,
          email: email ?? null,
          licenseNumber: dto.licenseNumber || null,
          organizationId,
          invitationTokenHash: invitation?.tokenHash ?? null,
          invitationExpiresAt: invitation?.expiresAt ?? null,
        },
      });
    } catch (error) {
      // Course possible entre la pré-vérification et l'insertion (contrainte UNIQUE globale).
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ce compte chauffeur est déjà ajouté.');
      }
      throw error;
    }

    this.realtime.emitDriverChanged({ organizationId, driverId: driver.id, status: driver.status });
    if (email && invitation) {
      try {
        await this.emailSender.sendDriverInvitation(email, dto.firstName, invitation.token);
      } catch {
        throw new ServiceUnavailableException('Chauffeur ajouté, mais l’e-mail n’a pas pu être envoyé. Utilisez « Renvoyer l’invitation » dans la liste.');
      }
    }
    const { invitationTokenHash: _hash, ...safe } = driver;
    void _hash;
    return safe;
  }

  /**
   * Comptes chauffeurs éligibles au rattachement par l'admin : appartiennent à l'organisation, sont
   * vérifiés (ACTIVE) et non supprimés. Un compte n'a pas besoin d'être en ligne pour être lisible :
   * la présence est simplement enrichie (device / lastSeenAt).
   */
  async listLinkable(organizationId: string) {
    const drivers = await this.prisma.driver.findMany({
      where: { organizationId, deletedAt: null, status: 'ACTIVE' },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return this.withOperationalContext(drivers);
  }

  async resendInvitation(organizationId: string, id: string) {
    const driver = await this.prisma.driver.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!driver) throw new NotFoundException('Chauffeur introuvable');
    if (driver.passwordHash) throw new BadRequestException('Ce chauffeur possède déjà un compte mobile');
    if (!driver.email) throw new BadRequestException('Ajoutez une adresse e-mail au chauffeur avant de renvoyer l’invitation');
    // Nouveau lien à chaque envoi : l'ancien lien cesse de fonctionner.
    const { token, tokenHash, expiresAt } = generateDriverLinkToken(DRIVER_INVITATION_TTL_MS);
    await this.prisma.driver.update({
      where: { id: driver.id },
      data: { invitationTokenHash: tokenHash, invitationExpiresAt: expiresAt },
    });
    await this.emailSender.sendDriverInvitation(driver.email, driver.firstName, token);
    return { message: 'Invitation envoyée' };
  }

  /**
   * Liste les chauffeurs avec leur contexte opérationnel (véhicule actuel + mission active + compte
   * mobile / appareil / complétude de profil), pour que l'admin voie d'un coup d'œil qui est
   * réellement assignable.
   */
  async findAll(organizationId: string) {
    const drivers = await this.prisma.driver.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return this.withOperationalContext(drivers);
  }

  async findOne(organizationId: string, id: string) {
    const driver = await this.prisma.driver.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!driver) throw new NotFoundException('Chauffeur introuvable');
    const [enriched] = await this.withOperationalContext([driver]);
    return enriched;
  }

  private async withOperationalContext<T extends { id: string; passwordHash?: string | null; invitationTokenHash?: string | null; passwordResetTokenHash?: string | null }>(drivers: T[]) {
    if (drivers.length === 0) return [];
    const driverIds = drivers.map((d) => d.id);
    const [assignments, activeMissions, devices] = await Promise.all([
      this.prisma.driverVehicleAssignment.findMany({
        where: { driverId: { in: driverIds }, endedAt: null },
        include: { vehicle: { select: { id: true, plateNumber: true, status: true } } },
      }),
      this.prisma.mission.findMany({
        where: { driverId: { in: driverIds }, status: { in: OCCUPYING_STATUSES } },
        select: { id: true, driverId: true, status: true },
      }),
      this.prisma.device.findMany({
        where: { driverId: { in: driverIds }, revokedAt: null },
        orderBy: { lastSeenAt: 'desc' },
        select: { id: true, driverId: true, deviceId: true, platform: true, lastSeenAt: true },
      }),
    ]);
    const vehicleByDriver = new Map(assignments.map((a) => [a.driverId, a.vehicle]));
    const missionByDriver = new Map(activeMissions.map((m) => [m.driverId, { id: m.id, status: m.status }]));
    const deviceByDriver = new Map<string, { id: string; driverId: string | null; deviceId: string; platform: string | null; lastSeenAt: Date | null }>();
    for (const device of devices) {
      if (device.driverId && !deviceByDriver.has(device.driverId)) deviceByDriver.set(device.driverId, device);
    }
    return drivers.map((driver) => {
      // Les hash (mot de passe, jeton d'invitation) ne quittent jamais l'API (ni liste, ni détail).
      const { passwordHash: _omitted, invitationTokenHash: _invitation, passwordResetTokenHash: _reset, ...safe } = driver;
      void _omitted;
      void _invitation;
      void _reset;
      const device = deviceByDriver.get(driver.id) ?? null;
      return {
        ...safe,
        hasMobileAccount: (driver.passwordHash ?? null) !== null,
        device,
        lastSeenAt: device?.lastSeenAt?.toISOString() ?? null,
        currentVehicle: vehicleByDriver.get(driver.id) ?? null,
        activeMission: missionByDriver.get(driver.id) ?? null,
        profile: profileCompleteness(driver),
      };
    });
  }

  async update(organizationId: string, id: string, dto: UpdateDriverDto) {
    await this.findOne(organizationId, id);
    const email = dto.email ? dto.email.trim().toLowerCase() : undefined;
    const updated = await this.prisma.driver.update({ where: { id }, data: { ...dto, email: email ?? dto.email } });
    this.realtime.emitDriverChanged({ organizationId, driverId: id, status: updated.status });
    return this.findOne(organizationId, id);
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    const updated = await this.prisma.driver.update({ where: { id }, data: { deletedAt: new Date() } });
    this.realtime.emitDriverChanged({ organizationId, driverId: id, status: updated.status });
    return updated;
  }

  async assignVehicle(organizationId: string, driverId: string, vehicleId: string) {
    await this.findOne(organizationId, driverId);
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, organizationId, deletedAt: null } });
    if (!vehicle) throw new NotFoundException('Véhicule introuvable');

    // Clôt toute affectation active existante pour ce chauffeur avant d'en créer une nouvelle.
    await this.prisma.driverVehicleAssignment.updateMany({
      where: { driverId, endedAt: null },
      data: { endedAt: new Date() },
    });

    const assignment = await this.prisma.driverVehicleAssignment.create({ data: { driverId, vehicleId } });
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (driver) this.realtime.emitDriverChanged({ organizationId, driverId, status: driver.status });
    return assignment;
  }

  async revokeDevice(organizationId: string, driverId: string, deviceId: string) {
    await this.findOne(organizationId, driverId);
    const device = await this.prisma.device.findUnique({ where: { deviceId } });
    if (!device || device.driverId !== driverId) {
      throw new BadRequestException("Cet appareil n'est pas associé à ce chauffeur");
    }
    return this.prisma.device.update({ where: { deviceId }, data: { revokedAt: new Date() } });
  }
}

type CompletenessSource = { email?: string | null; phone?: string | null; licenseNumber?: string | null; passwordHash?: string | null };

/** Complétude du profil du point de vue de l'administration (champ métier + compte mobile muni d'un mot de passe). */
function profileCompleteness(driver: CompletenessSource): { complete: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!driver.phone) missing.push('phone');
  if (!driver.email) missing.push('email');
  if (!driver.licenseNumber) missing.push('licenseNumber');
  if (!driver.passwordHash) missing.push('password');
  return { complete: missing.length === 0, missing };
}
