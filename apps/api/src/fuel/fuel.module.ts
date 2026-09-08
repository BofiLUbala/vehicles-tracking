import { Module } from '@nestjs/common';
import { FuelRecordsController } from './fuel-records.controller';
import { VehicleFuelController } from './vehicle-fuel.controller';
import { FuelService } from './fuel.service';
import { FilesModule } from '../files/files.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [FilesModule, TrackingModule],
  controllers: [FuelRecordsController, VehicleFuelController],
  providers: [FuelService],
  exports: [FuelService],
})
export class FuelModule {}
