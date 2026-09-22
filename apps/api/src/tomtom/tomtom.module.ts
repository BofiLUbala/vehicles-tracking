import { Module } from '@nestjs/common';
import { TomTomService } from './tomtom.service';

@Module({ providers: [TomTomService], exports: [TomTomService] })
export class TomTomModule {}
