/**
 * HTTP-level checks for BUG-004 (API IDOR). Requests go through the real
 * ClerkAuthGuard, AdminGuard, ValidationPipe and controllers; Clerk and the
 * services are stubbed, so nothing reaches Clerk or Supabase.
 */
import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { ChatsController } from './chats/chats.controller';
import { ChatsService } from './chats/chats.service';
import { CleanupController } from './cleanup/cleanup.controller';
import { CleanupService } from './cleanup/cleanup.service';
import { ClerkAuthGuard } from './common/guards/clerk-auth.guard';
import { EventsCrudController } from './events/events-crud.controller';
import { EventsCrudService } from './events/events-crud.service';
import { EventsController } from './events/events.controller';
import { InstagramScraperController } from './instagram/instagram-scraper.controller';
import { InstagramVenueScraperService } from './instagram/instagram-venue-scraper.service';
import { MatchesController } from './matches/matches.controller';
import { MatchesService } from './matches/matches.service';
import { SettingsController } from './settings/settings.controller';
import { SettingsService } from './settings/settings.service';
import { StatisticsController } from './statistics/statistics.controller';
import { StatisticsService } from './statistics/statistics.service';
import { SupabaseService } from './supabase/supabase.service';
import { TicketsController } from './tickets/tickets.controller';
import { TicketsService } from './tickets/tickets.service';
import { AccountDeletionService } from './users/account-deletion.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { VenuesController } from './venues/venues.controller';
import { VenuesService } from './venues/venues.service';

const CALLER = 'user_caller';
const OTHER = 'user_other';
const ADMIN = 'user_admin';
const TOKEN_USERS: Record<string, string> = {
  'caller-token': CALLER,
  'admin-token': ADMIN,
};
const AS_CALLER = { Authorization: 'Bearer caller-token' };
const AS_ADMIN = { Authorization: 'Bearer admin-token' };
const CHAT_ID = '0b6c3f0e-5f8e-4a3e-9d7a-1c2b3d4e5f60';
const EVENT_ID = 'f5f8b2e0-bfcf-4a77-90b7-e7631f38a101';

const resolved = <T>(value: T) => jest.fn(() => Promise.resolve(value));

const usersService = {
  isAdmin: jest.fn((userId: string) => Promise.resolve(userId === ADMIN)),
  getUserById: resolved({ id: OTHER }),
  searchUsersByEmail: resolved([{ id: OTHER }]),
  createUser: resolved({}),
  updateUser: resolved({}),
  deleteUser: resolved(undefined),
  getGuest: resolved({}),
  createGuest: resolved({}),
  updateGuest: resolved({}),
  deleteGuest: resolved(undefined),
  getHost: resolved({}),
  createHost: resolved({}),
  deleteHost: resolved(undefined),
  getSettings: resolved({}),
  updateSettings: resolved({}),
  getMyProfile: jest.fn((userId: string) => Promise.resolve({ id: userId })),
  updateMyProfile: jest.fn((userId: string) => Promise.resolve({ id: userId })),
};
const accountDeletionService = { deleteAccount: resolved(undefined) };
const ticketsService = {
  getTicketById: resolved<Record<string, unknown> | null>(null),
  getTickets: resolved([]),
  getEventAttendees: resolved({}),
  attendEvent: resolved({}),
  unattendEvent: resolved({}),
  createTicket: resolved({}),
  deleteTicket: resolved(undefined),
};
const matchesService = {
  getMatchById: resolved<Record<string, unknown> | null>(null),
  getMatches: resolved([]),
  getMyMatches: resolved([]),
  createMatch: resolved({}),
  submitSwipeDecision: resolved({}),
  deleteMatch: resolved(undefined),
};
const chatsService = {
  assertMatchParticipant: resolved(undefined),
  getChatForParticipant: resolved({ id: CHAT_ID, match_id: 7 }),
  getChatByMatchId: resolved({ id: CHAT_ID }),
  getOrCreateChat: resolved({ id: CHAT_ID }),
  getMessages: resolved([]),
  createChat: resolved({}),
  deleteChat: resolved(undefined),
  createMessage: jest.fn((row: Record<string, unknown>) =>
    Promise.resolve(row),
  ),
  markMessageRead: resolved({}),
  deleteMessage: resolved(undefined),
};
const settingsService = {
  getSettings: resolved({ language: 'EN', theme: 'dark' }),
  upsertSettings: resolved({ language: 'EN', theme: 'dark' }),
};
const cleanupService = {
  previewExpiredMatches: resolved({ total_matches: 0 }),
  cleanupExpiredMatches: resolved({}),
  cleanupMatchesForEvent: resolved({}),
};
const eventsCrudService = {
  getActiveEvents: resolved([]),
  getActiveEventById: resolved({}),
};
const statisticsService = { getStatistics: resolved({}) };
const supabaseService = { deleteOldEvents: resolved(0), getClient: jest.fn() };
const instagramVenueScraperService = {
  scrapeAllVenues: resolved({}),
  scrapeVenue: resolved({}),
  syncInstagramContacts: resolved({}),
  refreshVenueLogosByScraper: resolved({}),
};
const venuesService = {
  refreshAllGoOutInstagramPictures: resolved({}),
  refreshInstagramPicture: resolved({}),
};

describe('Route authorization (BUG-004)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    // Real guard, fake Clerk: only the tokens in TOKEN_USERS are signed in.
    const clerkGuard = new ClerkAuthGuard(new Reflector());
    Object.assign(clerkGuard, {
      clerkClient: {
        authenticateRequest: (webRequest: Request) => {
          const token = (webRequest.headers.get('authorization') ?? '').replace(
            'Bearer ',
            '',
          );
          const userId = TOKEN_USERS[token];
          return Promise.resolve({
            isAuthenticated: userId !== undefined,
            toAuth: () => ({ userId }),
          });
        },
      },
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [
        UsersController,
        TicketsController,
        MatchesController,
        ChatsController,
        SettingsController,
        CleanupController,
        EventsController,
        EventsCrudController,
        StatisticsController,
        InstagramScraperController,
        VenuesController,
      ],
      providers: [
        { provide: APP_GUARD, useValue: clerkGuard },
        { provide: UsersService, useValue: usersService },
        { provide: AccountDeletionService, useValue: accountDeletionService },
        { provide: TicketsService, useValue: ticketsService },
        { provide: MatchesService, useValue: matchesService },
        { provide: ChatsService, useValue: chatsService },
        { provide: SettingsService, useValue: settingsService },
        { provide: CleanupService, useValue: cleanupService },
        { provide: EventsCrudService, useValue: eventsCrudService },
        { provide: StatisticsService, useValue: statisticsService },
        { provide: SupabaseService, useValue: supabaseService },
        {
          provide: InstagramVenueScraperService,
          useValue: instagramVenueScraperService,
        },
        { provide: VenuesService, useValue: venuesService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    // Same pipe as main.ts.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const http = () => request(app.getHttpServer());

  describe('the requests from the QA report, as a normal user', () => {
    it('GET /tickets returns only the caller’s tickets', async () => {
      await http().get('/tickets').set(AS_CALLER).expect(200);
      expect(ticketsService.getTickets).toHaveBeenCalledWith(CALLER, undefined);
    });

    it('GET /tickets?guest_id=<other> is refused', async () => {
      await http().get(`/tickets?guest_id=${OTHER}`).set(AS_CALLER).expect(403);
      expect(ticketsService.getTickets).not.toHaveBeenCalled();
    });

    it('GET /users?email=@ is admin-only', async () => {
      await http().get('/users?email=@').set(AS_CALLER).expect(403);
      expect(usersService.searchUsersByEmail).not.toHaveBeenCalled();
    });

    it('GET /users/me?user_id=<other> returns the caller’s own profile', async () => {
      const res = await http()
        .get(`/users/me?user_id=${OTHER}`)
        .set(AS_CALLER)
        .expect(200);
      expect(usersService.getMyProfile).toHaveBeenCalledWith(CALLER);
      expect(res.body).toEqual({ id: CALLER });
    });

    it('GET /matches returns only matches the caller is part of', async () => {
      await http().get('/matches').set(AS_CALLER).expect(200);
      expect(matchesService.getMatches).toHaveBeenCalledWith(CALLER, undefined);
    });

    it('GET /matches?guest_id=<other> is refused', async () => {
      await http().get(`/matches?guest_id=${OTHER}`).set(AS_CALLER).expect(403);
      expect(matchesService.getMatches).not.toHaveBeenCalled();
    });

    it('GET /cleanup/expired-matches is admin-only', async () => {
      await http().get('/cleanup/expired-matches').set(AS_CALLER).expect(403);
      expect(cleanupService.previewExpiredMatches).not.toHaveBeenCalled();
    });

    it('GET /events/active ignores user_id and x-user-id', async () => {
      await http()
        .get(`/events/active?user_id=${OTHER}&only_favorites=true`)
        .set('x-user-id', OTHER)
        .expect(200);
      expect(eventsCrudService.getActiveEvents).toHaveBeenCalledWith(
        { only_favorites: 'true' },
        undefined,
      );
    });

    it('GET /events/active/:id ignores x-user-id', async () => {
      await http()
        .get(`/events/active/${EVENT_ID}`)
        .set('x-user-id', OTHER)
        .expect(200);
      expect(eventsCrudService.getActiveEventById).toHaveBeenCalledWith(
        EVENT_ID,
        undefined,
      );
    });
  });

  describe('identity', () => {
    it('an x-user-id header alone does not authenticate', async () => {
      await http().get('/users/me').set('x-user-id', OTHER).expect(401);
      expect(usersService.getMyProfile).not.toHaveBeenCalled();
    });

    it('public event routes use the verified token when one is sent', async () => {
      await http()
        .get('/events/active?only_favorites=true')
        .set(AS_CALLER)
        .expect(200);
      expect(eventsCrudService.getActiveEvents).toHaveBeenCalledWith(
        { only_favorites: 'true' },
        CALLER,
      );

      await http().get(`/events/active/${EVENT_ID}`).set(AS_CALLER).expect(200);
      expect(eventsCrudService.getActiveEventById).toHaveBeenCalledWith(
        EVENT_ID,
        CALLER,
      );
    });

    it('public event routes still answer with an invalid token', async () => {
      await http()
        .get('/events/active')
        .set('Authorization', 'Bearer expired')
        .expect(200);
      expect(eventsCrudService.getActiveEvents).toHaveBeenCalledWith(
        {},
        undefined,
      );
    });

    it('GET /settings/me ignores ?user_id=', async () => {
      await http()
        .get(`/settings/me?user_id=${OTHER}`)
        .set(AS_CALLER)
        .expect(200);
      expect(settingsService.getSettings).toHaveBeenCalledWith(CALLER);
    });

    it('GET /statistics is computed for the caller', async () => {
      await http().get('/statistics?venue_id=v1').set(AS_CALLER).expect(200);
      expect(statisticsService.getStatistics).toHaveBeenCalledWith(
        CALLER,
        'v1',
        undefined,
      );
    });
  });

  describe('DELETE /users/me', () => {
    it('deletes the caller’s own account', async () => {
      const res = await http().delete('/users/me').set(AS_CALLER).expect(200);
      expect(res.body).toEqual({ success: true });
      expect(accountDeletionService.deleteAccount.mock.calls).toStrictEqual([
        [CALLER],
      ]);
    });

    it('ignores another user’s id in the query and body', async () => {
      await http()
        .delete(`/users/me?id=${OTHER}&user_id=${OTHER}`)
        .set(AS_CALLER)
        .send({ id: OTHER, user_id: OTHER })
        .expect(200);
      expect(accountDeletionService.deleteAccount.mock.calls).toStrictEqual([
        [CALLER],
      ]);
    });

    it('needs a valid token; x-user-id alone is refused', async () => {
      await http().delete('/users/me').expect(401);
      await http()
        .delete('/users/me')
        .set('Authorization', 'Bearer expired')
        .expect(401);
      await http().delete('/users/me').set('x-user-id', OTHER).expect(401);
      expect(accountDeletionService.deleteAccount).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /users/me', () => {
    it('updates the caller and drops fields a user may not set', async () => {
      await http()
        .patch('/users/me')
        .set(AS_CALLER)
        .send({
          user_id: OTHER,
          user: {
            first_name: 'Ana',
            is_admin: true,
            push_token: 'ExponentPushToken[x]',
            email: 'other@example.com',
            id: OTHER,
          },
          guest: { bio: 'Hi', user_id: OTHER },
        })
        .expect(200);
      // toStrictEqual: no undefined placeholders for fields that weren't sent.
      expect(usersService.updateMyProfile.mock.calls).toStrictEqual([
        [CALLER, { first_name: 'Ana' }, { bio: 'Hi' }],
      ]);
    });

    it('sends nothing to the database for an empty user object', async () => {
      await http()
        .patch('/users/me')
        .set(AS_CALLER)
        .send({ user: {} })
        .expect(200);
      expect(usersService.updateMyProfile.mock.calls).toStrictEqual([
        [CALLER, {}, {}],
      ]);
    });

    it('validates guest fields with the onboarding rules', async () => {
      await http()
        .patch('/users/me')
        .set(AS_CALLER)
        .send({ guest: { gender: 'robot' } })
        .expect(400);
      expect(usersService.updateMyProfile).not.toHaveBeenCalled();
    });
  });

  describe('records owned by someone else', () => {
    it('GET /tickets?id= hides another guest’s ticket', async () => {
      ticketsService.getTicketById.mockResolvedValueOnce({
        id: 't1',
        guest_id: OTHER,
      });
      await http().get('/tickets?id=t1').set(AS_CALLER).expect(404);
    });

    it('GET /tickets?id= returns the caller’s own ticket', async () => {
      ticketsService.getTicketById.mockResolvedValueOnce({
        id: 't1',
        guest_id: CALLER,
      });
      await http().get('/tickets?id=t1').set(AS_CALLER).expect(200);
    });

    it('GET /matches?id= hides a match the caller is not part of', async () => {
      matchesService.getMatchById.mockResolvedValueOnce({
        id: 5,
        guest_id_1: OTHER,
        guest_id_2: 'user_third',
      });
      await http().get('/matches?id=5').set(AS_CALLER).expect(404);
    });

    it('GET /matches?id= returns a match the caller is part of', async () => {
      matchesService.getMatchById.mockResolvedValueOnce({
        id: 5,
        guest_id_1: OTHER,
        guest_id_2: CALLER,
      });
      await http().get('/matches?id=5').set(AS_CALLER).expect(200);
    });
  });

  describe('chats', () => {
    it('opens a chat only after checking the caller is in the match', async () => {
      chatsService.assertMatchParticipant.mockRejectedValueOnce(
        new NotFoundException('Match not found'),
      );
      await http().get('/chats/by-match/7').set(AS_CALLER).expect(404);
      expect(chatsService.assertMatchParticipant).toHaveBeenCalledWith(
        7,
        CALLER,
      );
      expect(chatsService.getOrCreateChat).not.toHaveBeenCalled();
    });

    it('reads messages only through the participant check', async () => {
      await http()
        .get(`/chats/messages?chat_id=${CHAT_ID}`)
        .set(AS_CALLER)
        .expect(200);
      expect(chatsService.getChatForParticipant).toHaveBeenCalledWith(
        CHAT_ID,
        CALLER,
      );
    });

    it('sends a message as the caller and stores only known fields', async () => {
      await http()
        .post('/chats/messages')
        .set(AS_CALLER)
        .send({ chat_id: CHAT_ID, message: 'Hey', is_read: true })
        .expect(201);
      expect(chatsService.getChatForParticipant).toHaveBeenCalledWith(
        CHAT_ID,
        CALLER,
      );
      expect(chatsService.createMessage).toHaveBeenCalledWith({
        chat_id: CHAT_ID,
        sender_id: CALLER,
        message: 'Hey',
      });
    });

    it('accepts the caller’s own id as sender_id', async () => {
      await http()
        .post('/chats/messages')
        .set(AS_CALLER)
        .send({ chat_id: CHAT_ID, sender_id: CALLER, message: 'Hey' })
        .expect(201);
    });

    it('refuses to send a message as another user', async () => {
      await http()
        .post('/chats/messages')
        .set(AS_CALLER)
        .send({ chat_id: CHAT_ID, sender_id: OTHER, message: 'Hey' })
        .expect(403);
      expect(chatsService.createMessage).not.toHaveBeenCalled();
    });

    it('marks a message read for the caller', async () => {
      await http()
        .patch('/chats/messages')
        .set(AS_CALLER)
        .send({ message_id: CHAT_ID })
        .expect(200);
      expect(chatsService.markMessageRead).toHaveBeenCalledWith(
        CHAT_ID,
        CALLER,
      );
    });
  });

  describe('admin-only routes', () => {
    const adminOnly: Array<[string, string]> = [
      ['get', `/users?id=${OTHER}`],
      ['post', '/users'],
      ['patch', '/users'],
      ['delete', `/users?id=${OTHER}`],
      ['get', `/users/guests?user_id=${OTHER}`],
      ['post', '/users/guests'],
      ['patch', '/users/guests'],
      ['delete', `/users/guests?user_id=${OTHER}`],
      ['get', `/users/hosts?user_id=${OTHER}`],
      ['post', '/users/hosts'],
      ['delete', `/users/hosts?user_id=${OTHER}`],
      ['get', `/users/settings?user_id=${OTHER}`],
      ['patch', '/users/settings'],
      ['post', '/tickets'],
      ['delete', `/tickets?id=${CHAT_ID}`],
      ['post', '/matches'],
      ['delete', '/matches?id=1'],
      ['post', '/chats'],
      ['delete', `/chats?id=${CHAT_ID}`],
      ['delete', `/chats/messages?id=${CHAT_ID}`],
      ['get', '/cleanup/expired-matches'],
      ['delete', '/cleanup/expired-matches'],
      ['delete', '/cleanup/events/1/matches'],
      ['delete', '/events/cleanup'],
      // Paid scrapes
      ['post', '/instagram/scrape/venues'],
      ['post', '/instagram/scrape/venues/some_venue'],
      ['post', '/instagram/sync-contacts'],
      ['post', '/instagram/refresh-logos/go-out'],
      ['post', '/venues/refresh-instagram-picture'],
    ];

    it.each(adminOnly)(
      '%s %s is refused for a normal user',
      async (method, path) => {
        await http()[method as 'get'](path).set(AS_CALLER).expect(403);
      },
    );

    it.each(adminOnly)(
      '%s %s is allowed for an admin',
      async (method, path) => {
        const res = await http()[method as 'get'](path).set(AS_ADMIN);
        expect([200, 201]).toContain(res.status);
      },
    );

    it('refreshing one venue’s picture is left to the venue owner check', async () => {
      await http()
        .post(`/venues/${EVENT_ID}/refresh-instagram-picture`)
        .set(AS_CALLER)
        .expect(201);
      expect(venuesService.refreshInstagramPicture).toHaveBeenCalledWith(
        EVENT_ID,
        CALLER,
      );
    });

    it('PATCH /users cannot make the caller an admin', async () => {
      await http()
        .patch('/users')
        .set(AS_CALLER)
        .send({ id: CALLER, updates: { is_admin: true } })
        .expect(403);
      expect(usersService.updateUser).not.toHaveBeenCalled();
    });

    it('an admin can still list every ticket and match', async () => {
      await http().get('/tickets').set(AS_ADMIN).expect(200);
      expect(ticketsService.getTickets).toHaveBeenCalledWith(
        undefined,
        undefined,
      );

      await http().get(`/matches?guest_id=${OTHER}`).set(AS_ADMIN).expect(200);
      expect(matchesService.getMatches).toHaveBeenCalledWith(OTHER, undefined);
    });
  });
});
