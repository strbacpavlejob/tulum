/// <reference types="multer" />

import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';
import { UserProvisioningService } from '../users/user-provisioning.service';
import { OnboardingDto } from './dto/onboarding.dto';

const USERS_TABLE = 'users';
const GUESTS_TABLE = 'guests';
const MAX_PHOTOS = 3;
// Profile photo dimensions and target quality
const PHOTO_WIDTH = 800;
const PHOTO_HEIGHT = 600;
/**
 * Whether the guest answered what Matches needs: their gender and who they
 * are interested in. Why they're here (seeking) used to count too; the short
 * onboarding leaves it for later.
 */
function isOnboardingComplete(guest: Record<string, unknown> | null): boolean {
  if (!guest) return false;
  return !!(
    guest.gender != null &&
    Array.isArray(guest.interested_in) &&
    (guest.interested_in as unknown[]).length > 0
  );
}

@Injectable()
export class GuestsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly r2Service: R2Service,
    private readonly userProvisioning: UserProvisioningService,
  ) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  async getGuestMe(userId: string) {
    // The app asks this first after sign-in, so a users row the webhook
    // hasn't made yet is made here, before onboarding needs it.
    await this.userProvisioning.ensureUserRow(userId);
    const { data, error } = await this.db
      .from(GUESTS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return {
      guest: data ?? null,
      isOnboardingComplete: isOnboardingComplete(data),
    };
  }

  async upsertOnboarding(userId: string, dto: OnboardingDto) {
    // The name is a users column; the users row is made at sign-up, or here
    // if the webhook that makes it is late. It is saved before the guest row,
    // because that row is what marks onboarding complete: if this write
    // fails, onboarding stays open to submit again.
    await this.userProvisioning.ensureUserRow(userId);
    const { error: nameError } = await this.db
      .from(USERS_TABLE)
      .update({ first_name: dto.first_name })
      .eq('id', userId);
    if (nameError) throw nameError;

    const payload = {
      user_id: userId,
      gender: dto.gender,
      // Left out when not sent, so it isn't cleared.
      ...(dto.seeking ? { seeking: dto.seeking } : {}),
      interested_in: dto.interested_in,
      interests: dto.interests ?? [],
      picture_urls: dto.picture_urls ?? [],
      venue_types: dto.venue_types ?? [],
      bio: dto.bio?.trim() || null,
      birthday: dto.birthday,
    };

    const { data, error } = await this.db
      .from(GUESTS_TABLE)
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return {
      guest: data,
      isOnboardingComplete: isOnboardingComplete(
        data as Record<string, unknown>,
      ),
    };
  }

  async uploadPhoto(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string[]> {
    const { data: guest } = await this.db
      .from(GUESTS_TABLE)
      .select('picture_urls')
      .eq('user_id', userId)
      .maybeSingle();

    const currentUrls: string[] = (guest?.picture_urls as string[]) ?? [];
    if (currentUrls.length >= MAX_PHOTOS) {
      throw new BadRequestException(
        `Maximum ${MAX_PHOTOS} photos allowed. Remove a photo first.`,
      );
    }

    const key = `guests/${userId}/${randomUUID()}.webp`;
    const url = await this.r2Service.uploadAndProcessImage(
      file.buffer,
      key,
      PHOTO_WIDTH,
      PHOTO_HEIGHT,
    );

    const updatedUrls = [...currentUrls, url];

    // Only UPDATE when the guest row already exists. If it doesn't (photo
    // uploaded during onboarding before submitOnboarding is called), skip the
    // DB write — the URL is returned to the client and will be included in
    // picture_urls when submitOnboarding completes.
    // Using UPDATE (not upsert) avoids a silent INSERT failure caused by the
    // NOT NULL constraint on `interested_in` which has no default.
    if (guest) {
      const { error } = await this.db
        .from(GUESTS_TABLE)
        .update({ picture_urls: updatedUrls })
        .eq('user_id', userId);
      if (error) throw error;
    }

    return updatedUrls;
  }

  async deletePhoto(userId: string, url: string): Promise<string[]> {
    const { data: guest } = await this.db
      .from(GUESTS_TABLE)
      .select('picture_urls')
      .eq('user_id', userId)
      .maybeSingle();

    const currentUrls: string[] = (guest?.picture_urls as string[]) ?? [];

    const key = this.r2Service.extractKeyFromUrl(url);
    if (key) {
      await this.r2Service.deleteObject(key).catch(() => {
        // Deletion from R2 is best-effort; proceed even if it fails
      });
    }

    const updatedUrls = currentUrls.filter((u) => u !== url);
    const { error } = await this.db
      .from(GUESTS_TABLE)
      .update({ picture_urls: updatedUrls })
      .eq('user_id', userId);
    if (error) throw error;

    return updatedUrls;
  }
}
