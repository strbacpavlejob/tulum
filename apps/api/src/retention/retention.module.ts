import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { AttributionService } from './attribution.service';
import { ConsentsController } from './consents.controller';
import { ConsentsService } from './consents.service';

/** Consent to contact guests later, and where each guest came from. */
@Module({
  imports: [SupabaseModule],
  controllers: [ConsentsController],
  providers: [ConsentsService, AttributionService],
  exports: [ConsentsService, AttributionService],
})
export class RetentionModule {}
