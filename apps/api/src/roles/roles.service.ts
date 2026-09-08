import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Bootstrap minimal — suffisant pour l'auth admin en Phase 1. Gestion CRUD complète en Phase 2+. */
@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany();
  }
}
