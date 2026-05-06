import { Module } from '@nestjs/common';
import { GeocoderController } from './geocoder.controller';
import { GeocoderService } from './geocoder.service';

@Module({
  controllers: [GeocoderController],
  providers: [GeocoderService],
})
export class GeocoderModule {}
