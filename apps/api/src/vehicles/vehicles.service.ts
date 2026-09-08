import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateVehicleDto) {
    return this.prisma.vehicle.create({ data: { ...dto, organizationId } });
  }

  async findAll(organizationId: string) {
    return this.prisma.vehicle.findMany({ where: { organizationId, deletedAt: null } });
  }

  async findOne(organizationId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!vehicle) throw new NotFoundException('Véhicule introuvable');
    return vehicle;
  }

  async update(organizationId: string, id: string, dto: UpdateVehicleDto) {
    await this.findOne(organizationId, id);
    return this.prisma.vehicle.update({ where: { id }, data: dto });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.vehicle.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async assignDriver(organizationId: string, vehicleId: string, driverId: string) {
    await this.findOne(organizationId, vehicleId);
    const driver = await this.prisma.driver.findFirst({ where: { id: driverId, organizationId, deletedAt: null } });
    if (!driver) throw new NotFoundException('Chauffeur introuvable');

    await this.prisma.driverVehicleAssignment.updateMany({
      where: { vehicleId, endedAt: null },
      data: { endedAt: new Date() },
    });

    return this.prisma.driverVehicleAssignment.create({ data: { driverId, vehicleId } });
  }

  /** Historique des affectations chauffeur pour ce véhicule (le suivi GPS/missions arrive en Phase 2/3). */
  async history(organizationId: string, vehicleId: string) {
    await this.findOne(organizationId, vehicleId);
    return this.prisma.driverVehicleAssignment.findMany({
      where: { vehicleId },
      include: { driver: true },
      orderBy: { startedAt: 'desc' },
    });
  }
}
