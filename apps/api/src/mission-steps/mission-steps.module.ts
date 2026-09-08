import { Module } from '@nestjs/common';
import { MissionStepsController } from './mission-steps.controller';
import { MissionStepsService } from './mission-steps.service';
import { LocationsModule } from '../locations/locations.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [LocationsModule, FilesModule],
  controllers: [MissionStepsController],
  providers: [MissionStepsService],
  exports: [MissionStepsService],
})
export class MissionStepsModule {}
