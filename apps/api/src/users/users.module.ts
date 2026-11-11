import { Module } from '@nestjs/common';
import { R2Module } from '../r2/r2.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AccountDeletionService } from './account-deletion.service';
import { UserProvisioningService } from './user-provisioning.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [SupabaseModule, R2Module],
  controllers: [UsersController],
  providers: [UsersService, AccountDeletionService, UserProvisioningService],
  exports: [UsersService, UserProvisioningService],
})
export class UsersModule {}
