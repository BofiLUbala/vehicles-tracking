import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { MissionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeEventsService } from '../tracking/realtime-events.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { SmtpEmailSender } from '../auth/senders/smtp-email.sender';

/** Statuts de mission qui rendent un chauffeur indisponible pour une nouvelle affectation. */
const OCCUPYING_STATUSES: MissionStatus[] = [MissionStatus.ASSIGNED, MissionStatus.STARTED, MissionStatus.IN_PROGRESS];

/**
 * PRIMARY ARCHITECTURE : l'identité d'un chauffeur a UN seul enregistrement `Driver`. Le compte est
 * créé/activé depuis l'application mobile (OTP) ; l'admin ne crée JAMAIS une seconde ligne pour le
 * même humain — il recherche le compte existant (`listLinkable`) puis le lie/rattache (PATCH).
 * `create` n'est utilisé que pour l'invitation d'un chauffeur sans compte mobile et est protégé
 * contre les doublons (téléphone / e-mail).
 */
@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeEventsService,
    private readonly emailSender: SmtpEmailSender,
  ) {}

  /**
   * Crée un compte chauffeur — à n'utiliser que pour INVITER un chauffeur qui n'a pas (encore) de
   * compte mobile. Refuse la création si un compte actif existe déjà avec le même téléphone ou le
   * même e-mail (un humain = une ligne `Driver`, jamais deux).
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

    let driver;
    try {
      driver = await this.prisma.driver.create({
        data: { ...dto, email: email ?? null, licenseNumber: dto.licenseNumber || null, organizationId },
      });
    } catch (error) {
      // Course possible entre la pré-vérification et l'insertion (contrainte UNIQUE globale).
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ce compte chauffeur est déjà ajouté.');
      }
      throw error;
    }

    this.realtime.emitDriverChanged({ organizationId, driverId: driver.id, status: driver.status });
    if (email) {
      try {
        await this.emailSender.sendDriverInvitation(email, dto.firstName);
      } catch {
        throw new ServiceUnavailableException('Chauffeur ajouté, mais l’e-mail n’a pas pu être envoyé. Utilisez « Renvoyer l’invitation » dans la liste.');
      }
    }
    return driver;
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
    await this.emailSender.sendDriverInvitation(driver.email, driver.firstName);
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

  private async withOperationalContext<T extends { id: string; passwordHash?: string | null }>(drivers: T[]) {
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
      // Le hash argon2 ne quitte jamais l'API (ni liste, ni détail).
      const { passwordHash: _omitted, ...safe } = driver;
      void _omitted;
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
