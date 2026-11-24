import { Module } from '@nestjs/common';
import { R2Module } from '../r2/r2.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { VenuePictureLookupService } from './venue-picture-lookup.service';
import { VenuePicturesController } from './venue-pictures.controller';
import { VenuePicturesCronService } from './venue-pictures-cron.service';
import { VenuePicturesDataService } from './venue-pictures-data.service';
import { VenuePicturesService } from './venue-pictures.service';

@Module({
  imports: [SupabaseModule, R2Module, UsersModule],
  controllers: [VenuePicturesController],
  providers: [
    VenuePicturesService,
    VenuePicturesDataService,
    VenuePictureLookupService,
    VenuePicturesCronService,
  ],
})
export class VenuePicturesModule {}
