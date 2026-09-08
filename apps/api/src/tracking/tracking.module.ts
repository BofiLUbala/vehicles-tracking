import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { TrackingGateway } from './tracking.gateway';
import { RealtimeEventsService } from './realtime-events.service';

@Module({
  imports: [JwtModule.register({})], // secret passé explicitement à verifyAsync() dans TrackingGateway
  controllers: [TrackingController],
  providers: [TrackingService, TrackingGateway, RealtimeEventsService],
  exports: [TrackingService, RealtimeEventsService],
})
export class TrackingModule {}
