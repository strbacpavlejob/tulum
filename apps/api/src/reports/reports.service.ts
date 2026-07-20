import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateBugDto } from './dto/create-bug.dto';
import { CreateVenueSuggestionDto } from './dto/create-venue-suggestion.dto';
import { BugRecord, VenueSuggestionRecord } from './reports.types';

const BUGS_TABLE = 'bugs';
const VENUE_SUGGESTIONS_TABLE = 'venue_suggestions';

@Injectable()
export class ReportsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  async createBug(
    userId: string | undefined,
    dto: CreateBugDto,
  ): Promise<BugRecord> {
    const payload = {
      user_id: userId ?? null,
      status: 'pending',
      description: dto.description,
      additional_info: dto.additionalInfo ?? null,
    } as any;

    const { data, error } = await this.db
      .from(BUGS_TABLE)
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as unknown as BugRecord;
  }

  async createVenueSuggestion(
    userId: string | undefined,
    dto: CreateVenueSuggestionDto,
  ): Promise<VenueSuggestionRecord> {
    const payload = {
      user_id: userId ?? null,
      name: dto.name,
      instagram_handle: dto.instagram_handle ?? null,
      additional_info: dto.additionalInfo ?? null,
      status: 'pending',
    } as any;

    const { data, error } = await this.db
      .from(VENUE_SUGGESTIONS_TABLE)
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as unknown as VenueSuggestionRecord;
  }
}
