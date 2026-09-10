import { Module } from '@nestjs/common';
import { GeocoderController } from './geocoder.controller';
import { GeocoderService } from './geocoder.service';

@Module({
  controllers: [GeocoderController],
  providers: [GeocoderService],
  exports: [GeocoderService],
})
export class GeocoderModule {}
