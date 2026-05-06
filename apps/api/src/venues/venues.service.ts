import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';

const VENUES_TABLE = 'venues';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Injectable()
export class VenuesService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly r2Service: R2Service,
  ) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  async getVenues(hostId?: string) {
    let query = this.db.from(VENUES_TABLE).select('*');
    if (hostId) query = query.eq('host_id', hostId);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async getVenueById(venueId: number) {
    const { data, error } = await this.db
      .from(VENUES_TABLE)
      .select('*')
      .eq('id', venueId)
      .single();
    if (error) throw error;
    if (!data) throw new NotFoundException('Venue not found');
    return data;
  }

  async createVenue(
    userId: string,
    venueData: Record<string, unknown>,
    imageFile?: Express.Multer.File,
  ) {
    let pictureUrl: string | null = null;
    if (imageFile) {
      const key = this.buildImageKey(userId, 'temp', imageFile.originalname);
      pictureUrl = await this.r2Service.uploadAndProcessImage(
        imageFile.buffer,
        key,
        200,
        200,
      );
    }

    const { data, error } = await this.db
      .from(VENUES_TABLE)
      .insert({ ...venueData, host_id: userId, picture_url: pictureUrl })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateVenue(
    venueId: number,
    userId: string,
    updates: Record<string, unknown>,
    imageFile?: Express.Multer.File,
  ) {
    const venue = await this.assertOwnership(venueId, userId);

    if (imageFile) {
      if (venue.picture_url) {
        const oldKey = this.r2Service.extractKeyFromUrl(
          venue.picture_url as string,
        );
        if (oldKey) await this.r2Service.deleteObject(oldKey).catch(() => null);
      }
      const key = this.buildImageKey(
        userId,
        venueId.toString(),
        imageFile.originalname,
      );
      updates.picture_url = await this.r2Service.uploadAndProcessImage(
        imageFile.buffer,
        key,
        200,
        200,
      );
    }

    const { data, error } = await this.db
      .from(VENUES_TABLE)
      .update(updates)
      .eq('id', venueId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteVenue(venueId: number, userId: string) {
    const venue = await this.assertOwnership(venueId, userId);
    if (venue.picture_url) {
      const key = this.r2Service.extractKeyFromUrl(venue.picture_url as string);
      if (key) await this.r2Service.deleteObject(key).catch(() => null);
    }
    const { error } = await this.db
      .from(VENUES_TABLE)
      .delete()
      .eq('id', venueId);
    if (error) throw error;
  }

  async uploadVenueImage(
    userId: string,
    venueId: string | undefined,
    file: Express.Multer.File,
  ) {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 5MB limit');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new Error('File must be an image');
    }
    if (venueId) {
      await this.assertOwnership(parseInt(venueId, 10), userId);
    }

    const key = venueId
      ? this.buildImageKey(userId, venueId, file.originalname)
      : `venue-images/${userId}/temp/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.webp`;

    const url = await this.r2Service.uploadAndProcessImage(
      file.buffer,
      key,
      200,
      200,
    );
    return { url, fileName: key, size: file.size, targetDimensions: '200x200' };
  }

  async deleteVenueImage(userId: string, fileName: string) {
    const key = this.r2Service.extractKeyFromUrl(fileName) ?? fileName;
    if (!key.includes(`/${userId}/`)) {
      throw new ForbiddenException('You do not own this file');
    }
    await this.r2Service.deleteObject(key);
  }

  private async assertOwnership(venueId: number, userId: string) {
    const { data: venue } = await this.db
      .from(VENUES_TABLE)
      .select('host_id, picture_url')
      .eq('id', venueId)
      .single();
    if (!venue || (venue as { host_id: string }).host_id !== userId) {
      throw new ForbiddenException('You do not own this venue');
    }
    return venue as { host_id: string; picture_url: string | null };
  }

  private buildImageKey(userId: string, scope: string, originalname: string) {
    const ext = originalname.split('.').pop() ?? 'webp';
    void ext;
    return `venue-images/${userId}/${scope}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.webp`;
  }
}
