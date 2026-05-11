import { Injectable, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class SeedService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  async seedMockChats(userId: string) {
    // 1 ── Verify the user exists
    const { data: user, error: userErr } = await this.db
      .from('users')
      .select('id, first_name')
      .eq('id', userId)
      .maybeSingle();
    if (userErr) throw userErr;
    if (!user) throw new BadRequestException(`User ${userId} not found`);

    // 2 ── Ensure the user has a guest profile (needed for FK on matches)
    await this.db.from('guests').upsert(
      {
        user_id: userId,
        gender: 'other',
        seeking: 'party',
        interested_in: ['male', 'female', 'other'],
        interests: ['Music', 'Travel', 'Tech'],
        picture_urls: [],
        birthday: new Date('1995-01-01').toISOString(),
      },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );

    // 3 ── Ensure the user has a host profile (needed to own a venue)
    await this.db
      .from('hosts')
      .upsert(
        { user_id: userId },
        { onConflict: 'user_id', ignoreDuplicates: true },
      );

    // 4 ── Create a mock venue owned by this user
    const { data: venue, error: venueErr } = await this.db
      .from('venues')
      .insert({
        host_id: userId,
        venue_type: 'nightclub',
        name: 'Mock Club Tulum',
        description: 'A fictional venue created for testing purposes.',
        latitude: 44.8176,
        longitude: 20.4569,
        address: 'Knez Mihailova 1, Belgrade',
        capacity: 300,
      })
      .select('id')
      .single();
    if (venueErr) throw venueErr;

    // 5 ── Create a mock event at that venue (already ended so it won't pollute the active feed)
    const startDt = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
    const endDt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data: event, error: eventErr } = await this.db
      .from('events')
      .insert({
        venue_id: venue.id,
        title: 'Mock Night — Tulum Test Event',
        description: 'Seeded event for development/testing purposes.',
        start_date_time: startDt,
        end_date_time: endDt,
        tags: ['electronic', 'techno', 'testing'],
        status: 'active',
      })
      .select('id')
      .single();
    if (eventErr) throw eventErr;

    // 6 ── Get up to 3 other guests (must have a guest profile for the FK to work)
    const { data: otherGuests, error: guestsErr } = await this.db
      .from('guests')
      .select('user_id')
      .neq('user_id', userId)
      .limit(3);
    if (guestsErr) throw guestsErr;

    if (!otherGuests || otherGuests.length === 0) {
      throw new BadRequestException(
        'No other guest profiles found in the database. ' +
          'Create at least one other user with a completed guest profile and try again.',
      );
    }

    const created: {
      match_id: number;
      chat_id: number;
      other_user_id: string;
      message_count: number;
    }[] = [];

    for (let i = 0; i < otherGuests.length; i++) {
      const otherId = otherGuests[i].user_id as string;

      // 7 ── Create match (ignore duplicate if it already exists)
      const { data: match, error: matchErr } = await this.db
        .from('matches')
        .insert({
          guest_id_1: userId,
          guest_id_2: otherId,
          event_id: event.id,
        })
        .select('id')
        .single();

      // Skip this pair if a match already exists for this event
      if (matchErr) {
        if ((matchErr as { code?: string }).code === '23505') continue; // unique violation
        throw matchErr;
      }

      // 8 ── Create chat for the match
      const { data: chat, error: chatErr } = await this.db
        .from('chats')
        .insert({ match_id: match.id, event_id: event.id })
        .select('id')
        .single();
      if (chatErr) throw chatErr;

      // 9 ── Insert mock messages
      const convo = MOCK_CONVERSATIONS[i % MOCK_CONVERSATIONS.length];
      const now = Date.now();
      const messages = convo.map((msg, idx) => ({
        chat_id: chat.id,
        sender_id: msg.fromSelf ? userId : otherId,
        message: msg.text,
        sent_at: new Date(
          now - (convo.length - idx) * 5 * 60 * 1000,
        ).toISOString(),
      }));

      const { error: msgsErr } = await this.db
        .from('chat_messages')
        .insert(messages);
      if (msgsErr) throw msgsErr;

      created.push({
        match_id: match.id as number,
        chat_id: chat.id as number,
        other_user_id: otherId,
        message_count: messages.length,
      });
    }

    return {
      venue_id: venue.id as number,
      event_id: event.id as number,
      matches_created: created.length,
      matches: created,
    };
  }
}
