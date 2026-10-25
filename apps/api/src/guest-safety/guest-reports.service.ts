import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { toUtcIsoString } from '../common/db-timestamp';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateGuestReportDto } from './dto/create-guest-report.dto';
import type { GuestReportStatus } from './dto/guest-report-status.dto';
import { GuestSafetyService } from './guest-safety.service';

const GUEST_REPORTS_TABLE = 'guest_reports';
/** How many of a chat's last messages a report from the chat keeps. */
const CHAT_SNAPSHOT_LIMIT = 50;
/** The most reports GET /reports/guests returns, newest first. */
const ADMIN_LIST_LIMIT = 200;

interface ChatSnapshotMessage {
  sender_id: string;
  message: string;
  sent_at: string;
}

interface UserEmbed {
  first_name: string | null;
  last_name: string | null;
  avatar_url?: string | null;
  guest?: GuestEmbed | GuestEmbed[] | null;
}

interface GuestEmbed {
  picture_urls: string[] | null;
  bio: string | null;
}

interface ReportRow {
  id: string;
  status: string;
  reason: string;
  source: string;
  details: string | null;
  messages: ChatSnapshotMessage[] | null;
  match_id: number | null;
  reporter_id: string | null;
  reported_user_id: string | null;
  created_at: string;
  reviewed_at: string | null;
  reporter: UserEmbed | null;
  reported: UserEmbed | null;
  reviewer: UserEmbed | null;
  event: {
    id: string;
    title: string | null;
    start_date_time: string | null;
  } | null;
}

const REPORT_COLUMNS = `
  id,
  status,
  reason,
  source,
  details,
  messages,
  match_id,
  reporter_id,
  reported_user_id,
  created_at,
  reviewed_at,
  reporter:users!guest_reports_reporter_id_fkey(first_name, last_name),
  reported:users!guest_reports_reported_user_id_fkey(
    first_name,
    last_name,
    avatar_url,
    guest:guests(picture_urls, bio)
  ),
  reviewer:users!guest_reports_reviewed_by_fkey(first_name, last_name),
  event:events!guest_reports_event_id_fkey(id, title, start_date_time)
`;

function fullName(user: UserEmbed | null): string | null {
  if (!user) return null;
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || null;
}

/**
 * Reports of guests (QA TASK-001). A guest reports another from a profile
 * or a chat; an admin reviews them through GET and PATCH /reports/guests.
 */
@Injectable()
export class GuestReportsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly guestSafety: GuestSafetyService,
  ) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  /**
   * Stores the report and blocks the reported guest, so each leaves the
   * other's deck, guest lists, inbox and chats right away.
   */
  async createReport(reporterId: string, dto: CreateGuestReportDto) {
    const reportedId = dto.reported_user_id;
    if (reportedId === reporterId) {
      throw new BadRequestException('You cannot report yourself');
    }
    if (!(await this.guestSafety.isGuest(reportedId))) {
      throw new NotFoundException('Guest not found');
    }

    let eventId = dto.event_id ?? null;
    let messages: ChatSnapshotMessage[] | null = null;
    if (dto.match_id != null) {
      const match = await this.findMatchBetween(
        dto.match_id,
        reporterId,
        reportedId,
      );
      eventId = match.event_id;
      messages = await this.chatSnapshot(match.id);
    }

    await this.guestSafety.block(reporterId, reportedId);

    const { data, error } = await this.db
      .from(GUEST_REPORTS_TABLE)
      .insert({
        reporter_id: reporterId,
        reported_user_id: reportedId,
        event_id: eventId,
        match_id: dto.match_id ?? null,
        source: dto.source,
        reason: dto.reason,
        details: dto.details ?? null,
        messages,
      })
      .select('id, status, created_at')
      .single();
    if (error) {
      // An event_id that names no event.
      if ((error as { code?: string }).code === '23503') {
        throw new BadRequestException('Unknown event');
      }
      throw error;
    }
    return { ...data, blocked: true };
  }

  /** The match, if it is between these two guests; otherwise 404. */
  private async findMatchBetween(
    matchId: number,
    reporterId: string,
    reportedId: string,
  ) {
    const { data, error } = await this.db
      .from('matches')
      .select('id, guest_id_1, guest_id_2, event_id')
      .eq('id', matchId)
      .maybeSingle();
    if (error) throw error;
    const guests = [data?.guest_id_1, data?.guest_id_2];
    if (!data || !guests.includes(reporterId) || !guests.includes(reportedId)) {
      throw new NotFoundException('Match not found');
    }
    return data as { id: number; event_id: string };
  }

  /**
   * The chat's last messages, oldest first, or null when the match has no
   * chat. The cleanup deletes chats after the event, so the report keeps
   * its own copy for the review.
   */
  private async chatSnapshot(
    matchId: number,
  ): Promise<ChatSnapshotMessage[] | null> {
    const { data: chat, error: chatError } = await this.db
      .from('chats')
      .select('id')
      .eq('match_id', matchId)
      .maybeSingle();
    if (chatError) throw chatError;
    if (!chat) return null;

    const { data, error } = await this.db
      .from('chat_messages')
      .select('sender_id, message, sent_at')
      .eq('chat_id', chat.id as string)
      .order('sent_at', { ascending: false })
      .limit(CHAT_SNAPSHOT_LIMIT);
    if (error) throw error;
    return ((data ?? []) as ChatSnapshotMessage[]).reverse();
  }

  /** GET /reports/guests: the newest reports, with who and what for review. */
  async listReports(status?: GuestReportStatus) {
    let query = this.db
      .from(GUEST_REPORTS_TABLE)
      .select(REPORT_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(ADMIN_LIST_LIMIT);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as unknown as ReportRow[];

    // How many reports each reported guest has in all, so a guest reported
    // again and again stands out.
    const reportedIds = [
      ...new Set(
        rows
          .map((row) => row.reported_user_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const reportCounts = new Map<string, number>();
    if (reportedIds.length > 0) {
      const { data: all, error: countError } = await this.db
        .from(GUEST_REPORTS_TABLE)
        .select('reported_user_id')
        .in('reported_user_id', reportedIds);
      if (countError) throw countError;
      for (const { reported_user_id: id } of (all ?? []) as {
        reported_user_id: string;
      }[]) {
        reportCounts.set(id, (reportCounts.get(id) ?? 0) + 1);
      }
    }

    return rows.map((row) => {
      const guest =
        (Array.isArray(row.reported?.guest)
          ? row.reported?.guest[0]
          : row.reported?.guest) ?? null;
      const photos = guest?.picture_urls ?? [];
      return {
        id: row.id,
        status: row.status,
        reason: row.reason,
        source: row.source,
        details: row.details,
        created_at: row.created_at,
        reviewed_at: row.reviewed_at,
        reviewed_by: fullName(row.reviewer),
        match_id: row.match_id,
        reporter: row.reporter_id
          ? { user_id: row.reporter_id, name: fullName(row.reporter) }
          : null,
        reported: row.reported_user_id
          ? {
              user_id: row.reported_user_id,
              name: fullName(row.reported),
              photos:
                photos.length > 0
                  ? photos
                  : row.reported?.avatar_url
                    ? [row.reported.avatar_url]
                    : [],
              bio: guest?.bio ?? null,
              report_count: reportCounts.get(row.reported_user_id) ?? 0,
            }
          : null,
        event: row.event
          ? {
              id: row.event.id,
              title: row.event.title,
              start_date_time: toUtcIsoString(row.event.start_date_time),
            }
          : null,
        // Who wrote each message, instead of user ids.
        messages:
          row.messages?.map((message) => ({
            from:
              message.sender_id === row.reporter_id
                ? ('reporter' as const)
                : message.sender_id === row.reported_user_id
                  ? ('reported' as const)
                  : ('other' as const),
            message: message.message,
            sent_at: message.sent_at,
          })) ?? null,
      };
    });
  }

  /** GET /reports/guests/summary: how many reports wait for a review. */
  async pendingCount() {
    const { count, error } = await this.db
      .from(GUEST_REPORTS_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (error) throw error;
    return { pending: count ?? 0 };
  }

  /** PATCH /reports/guests/:id: an admin moves the report along. */
  async updateStatus(
    reportId: string,
    status: GuestReportStatus,
    adminId: string,
  ) {
    const now = new Date().toISOString();
    const { data, error } = await this.db
      .from(GUEST_REPORTS_TABLE)
      .update({
        status,
        reviewed_by: adminId,
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', reportId)
      .select('id, status, reviewed_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException('Report not found');
    return data;
  }
}
