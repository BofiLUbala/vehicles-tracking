import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Bootstrap minimal (lecture seule) — suffisant pour l'auth admin en Phase 1. CRUD complet en Phase 2+. */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
