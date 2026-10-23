import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';

const MOCK_CONVERSATIONS = [
  [
    { fromSelf: false, text: 'Hey! I saw you at the bar earlier 👋' },
    { fromSelf: true, text: 'Oh hey! Yeah, what a vibe tonight right?' },
    {
      fromSelf: false,
      text: 'Absolutely! The DJ is incredible. Have you been here before?',
    },
    {
      fromSelf: true,
      text: 'First time actually. My friend dragged me here lol',
    },
    { fromSelf: false, text: 'Haha same story for me 😂 What do you do?' },
    {
      fromSelf: true,
      text: "I'm a UX designer. You?",
    },
    { fromSelf: false, text: "Software engineer. We'd make a good team 😏" },
    { fromSelf: true, text: 'Ha, maybe! Want to grab a drink?' },
  ],
  [
    { fromSelf: true, text: 'That was such a good set earlier!' },
    { fromSelf: false, text: "Right?? I've been a fan of his for years" },
    { fromSelf: true, text: 'No way, me too! Where are you from originally?' },
    { fromSelf: false, text: 'Belgrade actually, moved here 2 years ago' },
    { fromSelf: true, text: "Oh cool! I'm from Novi Sad" },
    {
      fromSelf: false,
      text: 'Small world 😄 Are you going to the after party?',
    },
    { fromSelf: true, text: "Haven't decided yet, depends on the company 😊" },
    { fromSelf: false, text: 'Well consider it decided then 😉' },
  ],
  [
    { fromSelf: false, text: 'Nice to match with you!' },
    { fromSelf: true, text: 'You too! How are you finding the event?' },
    { fromSelf: false, text: "It's been amazing honestly. Love the crowd" },
    { fromSelf: true, text: 'Same! Do you come to these often?' },
    {
      fromSelf: false,
      text: 'Trying to go out more. Just moved to the city 3 months ago',
    },
    { fromSelf: true, text: 'Oh nice! Still exploring then?' },
    {
      fromSelf: false,
      text: 'Exactly! Any recommendations for spots like this?',
    },
    { fromSelf: true, text: "Loads! We should grab coffee and I'll tell you" },
    { fromSelf: false, text: "I'd love that 🙌" },
  ],
];

const TEST_VENUE_NAME = 'Tulum Test Venue';
const TEST_EVENT_TITLE = 'Tulum Test Event';
const TEST_VENUE_ADDRESS = 'Test Street 1, Belgrade';

export interface SeedEventOptions {
  /** Minutes until a newly created test event starts (default 5). */
  startsInMinutes?: number;
  /** Duration in minutes of a newly created test event (default 15). */
  durationMinutes?: number;
  /**
   * When false, the target user gets no active event session so the app's
   * own check-in (POST /events/sessions) creates it (default true).
   */
  includeTargetSession?: boolean;
  /** Create a new test event even if an active one already exists (default false). */
  forceNew?: boolean;
  /**
   * Fraction of incoming likes turned into matches (default 0.8). 0 leaves the
   * target user with unused likes so a manual Like can produce a match.
   */
  matchRatio?: number;
}

interface SeedEventResult {
  venue_id: string;
  event_id: string;
  event_title: string;
  starts_at: string;
  ends_at: string;
  attendees_total: number;
  other_guest_user_ids: string[];
}

interface SeedMatchResult {
  match_id: number;
  other_user_id: string;
}

interface SeedSwipeResult extends SeedEventResult {
  incoming_likes_target: number;
  incoming_like_user_ids: string[];
  matches_target: number;
  matches: SeedMatchResult[];
}

@Injectable()
export class SeedService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  async seedMockTestEvent(userId: string, options: SeedEventOptions = {}) {
    await this.ensureUserExists(userId);

    const defaultHostId = this.configService.getOrThrow<string>(
      'DEFAULT_VENUE_HOST_ID',
    );
    await this.ensureUserExists(defaultHostId);

    const { error: hostErr } = await this.db
      .from('hosts')
      .upsert(
        { user_id: defaultHostId },
        { onConflict: 'user_id', ignoreDuplicates: true },
      );
    if (hostErr) throw hostErr;

    const { data: guests, error: guestsErr } = await this.db
      .from('guests')
      .select('user_id');
    if (guestsErr) throw guestsErr;

    const attendeeUserIds = Array.from(
      new Set(
        ((guests ?? []) as Array<{ user_id: string }>)
          .map((g) => g.user_id)
          .filter((id) => id.length > 0),
      ),
    );

    if (!attendeeUserIds.includes(userId)) {
      throw new BadRequestException(
        `User ${userId} does not have a guest profile and cannot attend seeded guest-only event.`,
      );
    }

    const attendeeCount = attendeeUserIds.length;
    const venueCapacity = attendeeCount * 2;

    const { data: venue, error: venueErr } = await this.db
      .from('venues')
      .upsert(
        {
          host_id: defaultHostId,
          venue_type: 'club',
          name: TEST_VENUE_NAME,
          description: 'Temporary mock venue for event testing.',
          latitude: 44.8418626,
          longitude: 20.3904346,
          address: TEST_VENUE_ADDRESS,
          capacity: venueCapacity,
        },
        { onConflict: 'name' },
      )
      .select('id')
      .single();
    if (venueErr) throw venueErr;

    const { data: existingEvent, error: existingEventErr } = options.forceNew
      ? { data: null, error: null }
      : await this.db
          .from('events')
          .select('id, title, start_date_time, end_date_time')
          .eq('venue_id', venue.id)
          .eq('title', TEST_EVENT_TITLE)
          .gte('end_date_time', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
    if (existingEventErr) throw existingEventErr;

    const venueId = String(venue.id);
    const event =
      existingEvent ??
      (await this.createTestEvent(
        venueId,
        options.startsInMinutes,
        options.durationMinutes,
      ));
    const eventId = String(event.id);

    await this.ensureTicketsForEvent(eventId, attendeeUserIds);
    await this.ensureActiveSessionsForEvent(
      eventId,
      options.includeTargetSession === false
        ? attendeeUserIds.filter((id) => id !== userId)
        : attendeeUserIds,
    );

    const otherGuestUserIds = attendeeUserIds.filter((id) => id !== userId);

    return {
      venue_id: venueId,
      event_id: eventId,
      event_title: String(event.title),
      starts_at: String(event.start_date_time),
      ends_at: String(event.end_date_time),
      attendees_total: attendeeUserIds.length,
      other_guest_user_ids: otherGuestUserIds,
    } satisfies SeedEventResult;
  }
  async seedMockSwipes(userId: string, options: SeedEventOptions = {}) {
    const eventSeed = await this.seedMockTestEvent(userId, options);

    const otherGuestIds = eventSeed.other_guest_user_ids;
    if (otherGuestIds.length === 0) {
      throw new BadRequestException(
        'No other existing users found for swipe seeding.',
      );
    }

    const likeTarget = this.calculatePercentageCount(otherGuestIds.length, 0.5);

    const { data: existingIncomingLikes, error: existingLikesErr } =
      await this.db
        .from('guest_swipes')
        .select('swiper_user_id')
        .eq('event_id', eventSeed.event_id)
        .eq('swiped_user_id', userId)
        .eq('liked', true)
        .in('swiper_user_id', otherGuestIds);
    if (existingLikesErr) throw existingLikesErr;

    const likeUserIds = new Set<string>(
      ((existingIncomingLikes ?? []) as Array<{ swiper_user_id: string }>).map(
        (s) => s.swiper_user_id,
      ),
    );

    const missingLikes = Math.max(likeTarget - likeUserIds.size, 0);
    if (missingLikes > 0) {
      const availableForLike = this.shuffle(
        otherGuestIds.filter((id) => !likeUserIds.has(id)),
      ).slice(0, missingLikes);

      const likeRows = availableForLike.map((swiperId) => ({
        swiper_user_id: swiperId,
        swiped_user_id: userId,
        event_id: eventSeed.event_id,
        liked: true,
      }));

      if (likeRows.length > 0) {
        const { error: likeErr } = await this.db
          .from('guest_swipes')
          .upsert(likeRows, {
            onConflict: 'swiper_user_id,swiped_user_id,event_id',
          });
        if (likeErr) throw likeErr;

        for (const row of likeRows) {
          likeUserIds.add(row.swiper_user_id);
        }
      }
    }

    const incomingLikeUserIds = Array.from(likeUserIds);
    const matchRatio = options.matchRatio ?? 0.8;
    const matchesTarget =
      matchRatio <= 0
        ? 0
        : this.calculatePercentageCount(incomingLikeUserIds.length, matchRatio);

    const { data: existingMatches, error: existingMatchesErr } = await this.db
      .from('matches')
      .select('id, guest_id_1, guest_id_2')
      .eq('event_id', eventSeed.event_id)
      .or(`guest_id_1.eq.${userId},guest_id_2.eq.${userId}`);
    if (existingMatchesErr) throw existingMatchesErr;

    const matchesByOtherUser = new Map<string, number>();
    for (const m of (existingMatches ?? []) as Array<{
      id: number;
      guest_id_1: string;
      guest_id_2: string;
    }>) {
      const otherUserId = m.guest_id_1 === userId ? m.guest_id_2 : m.guest_id_1;
      if (!incomingLikeUserIds.includes(otherUserId)) continue;
      matchesByOtherUser.set(otherUserId, Number(m.id));
    }

    const matchesToCreate = Math.max(
      matchesTarget - matchesByOtherUser.size,
      0,
    );
    if (matchesToCreate > 0) {
      const candidates = this.shuffle(
        incomingLikeUserIds.filter((id) => !matchesByOtherUser.has(id)),
      ).slice(0, matchesToCreate);

      for (const otherUserId of candidates) {
        const { error: selfSwipeErr } = await this.db
          .from('guest_swipes')
          .upsert(
            {
              swiper_user_id: userId,
              swiped_user_id: otherUserId,
              event_id: eventSeed.event_id,
              liked: true,
            },
            { onConflict: 'swiper_user_id,swiped_user_id,event_id' },
          );
        if (selfSwipeErr) throw selfSwipeErr;

        const matchId = await this.ensureMatchExists(
          eventSeed.event_id,
          userId,
          otherUserId,
        );
        matchesByOtherUser.set(otherUserId, matchId);
      }
    }

    const matches: SeedMatchResult[] = Array.from(matchesByOtherUser.entries())
      .map(([otherUserId, matchId]) => ({
        match_id: matchId,
        other_user_id: otherUserId,
      }))
      .sort((a, b) => a.other_user_id.localeCompare(b.other_user_id));

    return {
      ...eventSeed,
      incoming_likes_target: likeTarget,
      incoming_like_user_ids: incomingLikeUserIds,
      matches_target: matchesTarget,
      matches,
    } satisfies SeedSwipeResult;
  }

  async seedMockMessages(userId: string, options: SeedEventOptions = {}) {
    const swipeSeed = await this.seedMockSwipes(userId, options);

    const matchIds = swipeSeed.matches.map((m) => m.match_id);
    if (matchIds.length === 0) {
      return {
        ...swipeSeed,
        chats_target: 0,
        chats_seeded: 0,
        chats: [],
      };
    }

    const chatsTarget = this.calculatePercentageCount(
      swipeSeed.incoming_like_user_ids.length,
      0.8,
    );

    const matchById = new Map<number, SeedMatchResult>(
      swipeSeed.matches.map((m) => [m.match_id, m]),
    );

    const { data: existingChats, error: existingChatsErr } = await this.db
      .from('chats')
      .select('id, match_id')
      .in('match_id', matchIds);
    if (existingChatsErr) throw existingChatsErr;

    const chatsByMatchId = new Map<number, string>();
    for (const row of (existingChats ?? []) as Array<{
      id: string;
      match_id: number;
    }>) {
      chatsByMatchId.set(Number(row.match_id), row.id);
    }

    const existingChatMatchIds = Array.from(chatsByMatchId.keys());
    const chatsToCreate = Math.max(
      chatsTarget - existingChatMatchIds.length,
      0,
    );

    if (chatsToCreate > 0) {
      const candidates = this.shuffle(
        swipeSeed.matches.filter((m) => !chatsByMatchId.has(m.match_id)),
      ).slice(0, chatsToCreate);

      for (const candidate of candidates) {
        const { data: chat, error: chatErr } = await this.db
          .from('chats')
          .insert({
            match_id: candidate.match_id,
            event_id: swipeSeed.event_id,
          })
          .select('id, match_id')
          .single();

        if (chatErr) {
          const isDuplicate = (chatErr as { code?: string }).code === '23505';
          if (!isDuplicate) throw chatErr;

          const { data: existingChat, error: existingChatErr } = await this.db
            .from('chats')
            .select('id, match_id')
            .eq('match_id', candidate.match_id)
            .single();
          if (existingChatErr) throw existingChatErr;

          chatsByMatchId.set(
            Number(existingChat.match_id),
            String(existingChat.id),
          );
          continue;
        }

        chatsByMatchId.set(Number(chat.match_id), String(chat.id));
      }
    }

    const selectedMatchIds = Array.from(chatsByMatchId.keys()).sort(
      (a, b) => a - b,
    );

    const seededChats: Array<{
      chat_id: string;
      match_id: number;
      other_user_id: string;
      message_count: number;
      inserted_messages: number;
    }> = [];

    for (let i = 0; i < selectedMatchIds.length; i++) {
      const matchId = selectedMatchIds[i];
      const chatId = chatsByMatchId.get(matchId);
      const matchInfo = matchById.get(matchId);
      if (!chatId || !matchInfo) continue;

      const { count: existingMessageCount, error: countErr } = await this.db
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('chat_id', chatId);
      if (countErr) throw countErr;

      let insertedMessages = 0;
      if ((existingMessageCount ?? 0) === 0) {
        const convo = MOCK_CONVERSATIONS[i % MOCK_CONVERSATIONS.length].filter(
          (msg) => !msg.fromSelf,
        );
        const now = Date.now();
        const messages = convo.map((msg, idx) => ({
          chat_id: chatId,
          sender_id: matchInfo.other_user_id,
          message: msg.text,
          sent_at: new Date(
            now - (convo.length - idx) * 5 * 60 * 1000,
          ).toISOString(),
        }));

        if (messages.length > 0) {
          const { error: msgsErr } = await this.db
            .from('chat_messages')
            .insert(messages);
          if (msgsErr) throw msgsErr;
          insertedMessages = messages.length;
        }
      }

      seededChats.push({
        chat_id: chatId,
        match_id: matchId,
        other_user_id: matchInfo.other_user_id,
        message_count: existingMessageCount ?? 0,
        inserted_messages: insertedMessages,
      });
    }

    return {
      ...swipeSeed,
      chats_target: chatsTarget,
      chats_seeded: seededChats.length,
      chats: seededChats,
    };
  }

  async seedMockChats(userId: string, options: SeedEventOptions = {}) {
    return this.seedMockMessages(userId, options);
  }

  private async ensureUserExists(userId: string) {
    const { data: user, error: userErr } = await this.db
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (userErr) throw userErr;
    if (!user) {
      throw new BadRequestException(`User ${userId} not found`);
    }
  }

  private async createTestEvent(
    venueId: string,
    startsInMinutes = 5,
    durationMinutes = 15,
  ) {
    const startMs = Date.now() + startsInMinutes * 60 * 1000;
    const startAt = new Date(startMs).toISOString();
    const endAt = new Date(startMs + durationMinutes * 60 * 1000).toISOString();

    const { data: event, error: eventErr } = await this.db
      .from('events')
      .insert({
        venue_id: venueId,
        title: TEST_EVENT_TITLE,
        description:
          'Mock event starting in 5 minutes for development/testing.',
        start_date_time: startAt,
        end_date_time: endAt,
        tags: ['testing', 'techno', 'electronic'],
        status: 'active',
      })
      .select('id, title, start_date_time, end_date_time')
      .single();
    if (eventErr) throw eventErr;

    return event;
  }

  private async ensureTicketsForEvent(eventId: string, guestIds: string[]) {
    if (guestIds.length === 0) return;

    const { data: existingTickets, error: ticketsErr } = await this.db
      .from('tickets')
      .select('guest_id')
      .eq('event_id', eventId)
      .in('guest_id', guestIds);
    if (ticketsErr) throw ticketsErr;

    const existingGuestIds = new Set(
      ((existingTickets ?? []) as Array<{ guest_id: string }>).map(
        (t) => t.guest_id,
      ),
    );

    const missingRows = guestIds
      .filter((guestId) => !existingGuestIds.has(guestId))
      .map((guestId) => ({
        guest_id: guestId,
        event_id: eventId,
      }));

    if (missingRows.length > 0) {
      const { error: insertErr } = await this.db
        .from('tickets')
        .insert(missingRows);
      if (insertErr) throw insertErr;
    }
  }

  private async ensureActiveSessionsForEvent(
    eventId: string,
    userIds: string[],
  ) {
    if (userIds.length === 0) return;

    const { data: sessions, error: sessionsErr } = await this.db
      .from('event_sessions')
      .select('user_id')
      .eq('event_id', eventId)
      .is('exited_at', null)
      .in('user_id', userIds);
    if (sessionsErr) throw sessionsErr;

    const activeUserSet = new Set(
      ((sessions ?? []) as Array<{ user_id: string }>).map((s) => s.user_id),
    );

    const rowsToInsert = userIds
      .filter((id) => !activeUserSet.has(id))
      .map((id) => ({ user_id: id, event_id: eventId }));

    if (rowsToInsert.length > 0) {
      const { error: insertErr } = await this.db
        .from('event_sessions')
        .insert(rowsToInsert);
      if (insertErr) throw insertErr;
    }
  }

  private async ensureMatchExists(
    eventId: string,
    userId: string,
    otherUserId: string,
  ): Promise<number> {
    const [guestId1, guestId2] = [userId, otherUserId].sort((a, b) =>
      a.localeCompare(b),
    );

    const { data: existing, error: existingErr } = await this.db
      .from('matches')
      .select('id')
      .eq('guest_id_1', guestId1)
      .eq('guest_id_2', guestId2)
      .eq('event_id', eventId)
      .maybeSingle();
    if (existingErr) throw existingErr;
    if (existing) {
      return Number(existing.id);
    }

    const { data: inserted, error: insertErr } = await this.db
      .from('matches')
      .insert({ guest_id_1: guestId1, guest_id_2: guestId2, event_id: eventId })
      .select('id')
      .single();

    if (insertErr) {
      const isDuplicate = (insertErr as { code?: string }).code === '23505';
      if (!isDuplicate) throw insertErr;

      const { data: concurrent, error: concurrentErr } = await this.db
        .from('matches')
        .select('id')
        .eq('guest_id_1', guestId1)
        .eq('guest_id_2', guestId2)
        .eq('event_id', eventId)
        .single();
      if (concurrentErr) throw concurrentErr;

      return Number(concurrent.id);
    }

    return Number(inserted.id);
  }

  private calculatePercentageCount(total: number, ratio: number): number {
    if (total <= 0) return 0;
    return Math.max(1, Math.round(total * ratio));
  }

  private shuffle<T>(items: T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}
