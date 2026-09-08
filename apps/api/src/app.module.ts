import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './auth/auth.module';
import { DriversModule } from './drivers/drivers.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { LocationsModule } from './locations/locations.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';
import { MissionsModule } from './missions/missions.module';
import { MissionStepsModule } from './mission-steps/mission-steps.module';
import { TrackingModule } from './tracking/tracking.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
    DriversModule,
    VehiclesModule,
    LocationsModule,
    RolesModule,
    UsersModule,
    FilesModule,
    MissionsModule,
    MissionStepsModule,
    TrackingModule,
  ],
  controllers: [HealthController],
  providers: [
    // Ordre important : Throttler -> Jwt (peuple req.user) -> Roles (lit req.user.role)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
