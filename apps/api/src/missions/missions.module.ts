import { Module } from '@nestjs/common';
import { MissionsController } from './missions.controller';
import { MobileMissionsController } from './mobile-missions.controller';
import { MissionsService } from './missions.service';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [TrackingModule],
  controllers: [MissionsController, MobileMissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}
