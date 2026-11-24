import { Module } from '@nestjs/common';
import { R2Module } from '../r2/r2.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { ExternalPicturesController } from './external-pictures.controller';
import { ExternalPicturesCronService } from './external-pictures-cron.service';
import { ExternalPicturesDataService } from './external-pictures-data.service';
import { ExternalPicturesService } from './external-pictures.service';

@Module({
  imports: [SupabaseModule, R2Module, UsersModule],
  controllers: [ExternalPicturesController],
  providers: [
    ExternalPicturesService,
    ExternalPicturesDataService,
    ExternalPicturesCronService,
  ],
  exports: [ExternalPicturesService],
})
export class ExternalPicturesModule {}
