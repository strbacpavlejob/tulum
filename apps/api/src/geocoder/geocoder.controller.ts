import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GeocoderService } from './geocoder.service';

@ApiTags('geocode')
@Controller('geocode')
export class GeocoderController {
  constructor(private readonly geocoderService: GeocoderService) {}

  @Get()
  async geocode(@Query('address') address: string) {
    if (!address || address.trim().length < 3) {
      throw new BadRequestException('Invalid address parameter');
    }
    try {
      return await this.geocoderService.geocode(address);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Geocoding failed';
      if (message.includes('No results')) throw new NotFoundException(message);
      throw err;
    }
  }
}
