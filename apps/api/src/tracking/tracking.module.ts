import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { TrackingGateway } from './tracking.gateway';
import { RealtimeEventsService } from './realtime-events.service';
import { VehicleOfflineCron } from './vehicle-offline.cron';
import { MissionGeoController } from './mission-geo.controller';
import { MissionGeoService } from './mission-geo.service';
import { TomTomModule } from '../tomtom/tomtom.module';

@Module({
  imports: [JwtModule.register({}), TomTomModule], // secret passé explicitement à verifyAsync() dans TrackingGateway
  controllers: [TrackingController, MissionGeoController],
  providers: [TrackingService, TrackingGateway, RealtimeEventsService, VehicleOfflineCron, MissionGeoService],
  exports: [TrackingService, RealtimeEventsService, VehicleOfflineCron],
})
export class TrackingModule {}
