import { Injectable } from '@nestjs/common';
import { parseDbTimestampMs } from '../common/db-timestamp';
import { SupabaseService } from '../supabase/supabase.service';

export type PictureTable = 'events' | 'venues';

export interface ExternalPicture {
  table: PictureTable;
  id: string;
  /** The picture's address on the other site. */
  pictureUrl: string;
  /** An event that hasn't ended; false for venues. */
  upcoming: boolean;
}

interface PictureRow {
  id: string;
  picture_url: string;
  end_date_time?: string | null;
}

/** The external picture job's reads and writes. */
@Injectable()
export class ExternalPicturesDataService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  /**
   * Events and venues with a picture that isn't under storedBaseUrl, the
   * address the bucket's objects are served from.
   */
  async fetchExternalPictures(
    storedBaseUrl: string,
  ): Promise<ExternalPicture[]> {
    const [events, venues] = await Promise.all([
      this.fetchRows('events', 'id, picture_url, end_date_time', storedBaseUrl),
      this.fetchRows('venues', 'id, picture_url', storedBaseUrl),
    ]);

    const now = Date.now();
    return [
      ...events.map((row) => ({
        table: 'events' as const,
        id: row.id,
        pictureUrl: row.picture_url,
        upcoming: (parseDbTimestampMs(row.end_date_time) ?? 0) >= now,
      })),
      ...venues.map((row) => ({
        table: 'venues' as const,
        id: row.id,
        pictureUrl: row.picture_url,
        upcoming: false,
      })),
    ];
  }

  /**
   * Sets the row's picture to `to` if it is still `from`, so a picture a
   * host uploaded meanwhile is kept. Returns whether the row was changed.
   */
  async replacePicture(
    table: PictureTable,
    id: string,
    from: string,
    to: string | null,
  ): Promise<boolean> {
    const { data, error } = await this.db
      .from(table)
      .update({ picture_url: to })
      .eq('id', id)
      .eq('picture_url', from)
      .select('id');

    if (error) {
      throw new Error(
        `Failed to save the picture of ${table} ${id}: ${error.message}`,
      );
    }
    return (data ?? []).length > 0;
  }

  /** The row's picture_url now; undefined when the row is gone. */
  async currentPicture(
    table: PictureTable,
    id: string,
  ): Promise<string | null | undefined> {
    const { data, error } = await this.db
      .from(table)
      .select('picture_url')
      .eq('id', id)
      .maybeSingle<{ picture_url: string | null }>();

    if (error) {
      throw new Error(
        `Failed to read the picture of ${table} ${id}: ${error.message}`,
      );
    }
    return data ? data.picture_url : undefined;
  }

  private async fetchRows(
    table: PictureTable,
    columns: string,
    storedBaseUrl: string,
  ): Promise<PictureRow[]> {
    const { data, error } = await this.db
      .from(table)
      .select(columns)
      .not('picture_url', 'is', null)
      .neq('picture_url', '')
      .not('picture_url', 'like', `${storedBaseUrl}/%`);

    if (error) {
      throw new Error(
        `Failed to fetch ${table} with external pictures: ${error.message}`,
      );
    }
    return (data as unknown as PictureRow[] | null) ?? [];
  }
}
