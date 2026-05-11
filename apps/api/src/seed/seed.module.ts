import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';

@Module({
  imports: [SupabaseModule],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
