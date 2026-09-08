import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateDriverDto) {
    return this.prisma.driver.create({ data: { ...dto, organizationId } });
  }

  async findAll(organizationId: string) {
    return this.prisma.driver.findMany({ where: { organizationId, deletedAt: null } });
  }

  async findOne(organizationId: string, id: string) {
    const driver = await this.prisma.driver.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!driver) throw new NotFoundException('Chauffeur introuvable');
    return driver;
  }

  async update(organizationId: string, id: string, dto: UpdateDriverDto) {
    await this.findOne(organizationId, id);
    return this.prisma.driver.update({ where: { id }, data: dto });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.driver.update({ where: { id }, data: { deletedAt: new Date() } });
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

    return this.prisma.driverVehicleAssignment.create({ data: { driverId, vehicleId } });
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
