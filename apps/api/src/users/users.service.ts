import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Bootstrap minimal (lecture seule) — suffisant pour l'auth admin en Phase 1. CRUD complet en Phase 2+. */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async invite(organizationId: string, rawEmail: string) {
    const email = rawEmail.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Un compte ou une invitation existe déjà pour cet e-mail');
    const role = await this.prisma.role.findUniqueOrThrow({ where: { name: RoleName.ADMIN } });
    await this.prisma.user.create({
      data: {
        organizationId,
        email,
        passwordHash: 'INVITATION_PENDING',
        roleId: role.id,
        isActive: false,
      },
    });
    return { message: 'Invitation créée. L’administrateur peut maintenant activer son compte.' };
  }

  async findAll(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true, role: true, createdAt: true },
    });
  }

  async findOne(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true, role: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }
}
