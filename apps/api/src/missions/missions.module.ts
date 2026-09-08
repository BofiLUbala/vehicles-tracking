import { Module } from '@nestjs/common';
import { MissionsController } from './missions.controller';
import { MobileMissionsController } from './mobile-missions.controller';
import { MissionsService } from './missions.service';

@Module({
  controllers: [MissionsController, MobileMissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}
