/**
 * The users row for a user the create-user webhook hasn't reached yet
 * (Maskenbal N-20): the API makes it from the Clerk user, as the webhook
 * would, so that GET /users/me and onboarding work at once. Supabase is
 * in-memory tables with the real tables' keys, unique constraints and the
 * guests foreign key; the Clerk Backend API is stubbed.
 */
import { Logger } from '@nestjs/common';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { GuestSafetyService } from '../guest-safety/guest-safety.service';
import {
  GenderEnum,
  OnboardingDto,
  SeekingEnum,
} from '../guests/dto/onboarding.dto';
import { GuestsService } from '../guests/guests.service';
import { R2Service } from '../r2/r2.service';
import { VenueTypeEnum } from '../scrape/domain/scraper-venue.interfaces';
import { SupabaseService } from '../supabase/supabase.service';
import { UserProvisioningService } from './user-provisioning.service';

const CALLER = 'user_2abcDEF123xyz';

type Row = Record<string, unknown>;
type DbError = { code: string; message: string };
type Result = { data: unknown; error: DbError | null };
type Table = 'users' | 'hosts' | 'guests';

let tables: Record<Table, Row[]>;
let usersQueries: number;

const uniqueViolation = (constraint: string): DbError => ({
  code: '23505',
  message: `duplicate key value violates unique constraint "${constraint}"`,
});

// An upsert as Postgres runs it: on the table's key, then its unique
// constraints and the guests foreign key.
function upsert(
  table: Table,
  values: Row,
  ignoreDuplicates: boolean,
): { rows: Row[]; error: DbError | null } {
  const rows = tables[table];
  const key = table === 'users' ? 'id' : 'user_id';
  const existing = rows.find((row) => row[key] === values[key]);
  if (existing) {
    if (ignoreDuplicates) return { rows: [], error: null };
    Object.assign(existing, values);
    return { rows: [existing], error: null };
  }
  if (table === 'users') {
    if (rows.some((row) => row.username === values.username)) {
      return { rows: [], error: uniqueViolation('users_username_key') };
    }
    if (rows.some((row) => row.email === values.email)) {
      return { rows: [], error: uniqueViolation('users_email_key') };
    }
  }
  if (
    table === 'guests' &&
    !tables.users.some((user) => user.id === values.user_id)
  ) {
    return {
      rows: [],
      error: {
        code: '23503',
        message:
          'insert or update on table "guests" violates foreign key constraint "guests_user_id_fkey"',
      },
    };
  }
  const row = { ...values };
  rows.push(row);
  return { rows: [row], error: null };
}

function from(table: Table) {
  if (table === 'users') usersQueries += 1;
  const filters: ((row: Row) => boolean)[] = [];
  let write: (() => { rows: Row[]; error: DbError | null }) | null = null;
  const matching = () =>
    tables[table].filter((row) => filters.every((f) => f(row)));
  const run = () => (write ? write() : { rows: matching(), error: null });

  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => {
      filters.push((row) => row[column] === value);
      return query;
    },
    update: (values: Row) => {
      write = () => {
        const found = matching();
        for (const row of found) Object.assign(row, values);
        return { rows: found, error: null };
      };
      return query;
    },
    upsert: (values: Row, options?: { ignoreDuplicates?: boolean }) => {
      write = () => upsert(table, values, options?.ignoreDuplicates ?? false);
      return query;
    },
    maybeSingle: () => {
      const { rows, error } = run();
      return Promise.resolve<Result>({ data: rows[0] ?? null, error });
    },
    single: () => {
      const { rows, error } = run();
      if (error) return Promise.resolve<Result>({ data: null, error });
      return Promise.resolve<Result>(
        rows.length === 1
          ? { data: rows[0], error: null }
          : { data: null, error: { code: 'PGRST116', message: 'not one row' } },
      );
    },
    then: (
      resolve: (value: Result) => unknown,
      reject: (reason: unknown) => unknown,
    ) => {
      const { rows, error } = run();
      return Promise.resolve<Result>({
        data: error ? null : rows,
        error,
      }).then(resolve, reject);
    },
  };
  return query;
}

const supabase = { getClient: () => ({ from }) } as unknown as SupabaseService;

// A Clerk user as the Backend API returns it.
const clerkUser = (overrides: Row = {}) => ({
  id: CALLER,
  primaryEmailAddressId: 'idn_primary',
  emailAddresses: [
    { id: 'idn_other', emailAddress: 'old@example.com' },
    { id: 'idn_primary', emailAddress: 'ana.test@example.com' },
  ],
  username: null,
  firstName: 'Ana',
  lastName: 'Test',
  imageUrl: 'https://img.clerk.com/ana.png',
  ...overrides,
});

const getUser = jest.fn<(userId: string) => Promise<unknown>>();
let provisioning: UserProvisioningService;
let warn: ReturnType<typeof jest.spyOn>;

beforeEach(() => {
  tables = { users: [], hosts: [], guests: [] };
  usersQueries = 0;
  getUser.mockReset();
  getUser.mockImplementation(() => Promise.resolve(clerkUser()));
  provisioning = new UserProvisioningService(supabase);
  Object.assign(provisioning, { clerkClient: { users: { getUser } } });
  warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('The users row of a signed-in user', () => {
  it('leaves an existing row alone, and looks it up once', async () => {
    const row = {
      id: CALLER,
      email: 'ana.test@example.com',
      username: 'ana',
      first_name: 'Ana',
      last_name: null,
      avatar_url: null,
    };
    tables.users.push({ ...row });

    await provisioning.ensureUserRow(CALLER);
    await provisioning.ensureUserRow(CALLER);

    expect(getUser).not.toHaveBeenCalled();
    expect(tables.users).toEqual([row]);
    expect(tables.hosts).toEqual([]);
    expect(usersQueries).toBe(1);
  });

  it('makes a missing row from the Clerk user, as the create-user webhook does', async () => {
    await provisioning.ensureUserRow(CALLER);

    expect(getUser).toHaveBeenCalledWith(CALLER);
    expect(tables.users).toEqual([
      {
        id: CALLER,
        email: 'ana.test@example.com',
        username: 'ana.test',
        first_name: 'Ana',
        last_name: 'Test',
        avatar_url: 'https://img.clerk.com/ana.png',
      },
    ]);
    expect(tables.hosts).toEqual([{ user_id: CALLER }]);
    expect(warn).toHaveBeenCalledWith(
      `Made the users row of ${CALLER}; the create-user webhook hadn't yet`,
    );

    // Known now: no second lookup.
    await provisioning.ensureUserRow(CALLER);
    expect(usersQueries).toBe(2);
  });

  it('keeps the Clerk username, with a suffix from the Clerk id when another row has it', async () => {
    getUser.mockImplementation(() =>
      Promise.resolve(clerkUser({ username: 'ana' })),
    );
    tables.users.push({
      id: 'user_seeded',
      email: 'seeded@example.com',
      username: 'ana',
    });

    await provisioning.ensureUserRow(CALLER);

    expect(tables.users.find((u) => u.id === CALLER)?.username).toBe(
      'ana_123xyz',
    );
  });

  it('leaves the user without a row, and the request unharmed, when another row has the email', async () => {
    tables.users.push({
      id: 'user_deleted_in_clerk',
      email: 'ana.test@example.com',
      username: 'someone',
    });

    await expect(provisioning.ensureUserRow(CALLER)).resolves.toBeUndefined();

    expect(tables.users.map((u) => u.id)).toEqual(['user_deleted_in_clerk']);
    expect(tables.hosts).toEqual([]);
    // Not remembered: the next request tries again.
    await provisioning.ensureUserRow(CALLER);
    expect(getUser).toHaveBeenCalledTimes(2);
  });

  it('leaves the request unharmed when Clerk cannot be reached, and tries again next time', async () => {
    getUser.mockImplementation(() =>
      Promise.reject(new Error('Clerk is down')),
    );

    await expect(provisioning.ensureUserRow(CALLER)).resolves.toBeUndefined();
    expect(tables.users).toEqual([]);

    getUser.mockImplementation(() => Promise.resolve(clerkUser()));
    await provisioning.ensureUserRow(CALLER);
    expect(tables.users.map((u) => u.id)).toEqual([CALLER]);
  });

  it('makes no row for a Clerk user without an email address', async () => {
    getUser.mockImplementation(() =>
      Promise.resolve(clerkUser({ emailAddresses: [] })),
    );

    await provisioning.ensureUserRow(CALLER);

    expect(tables.users).toEqual([]);
  });

  it('asks Clerk once for parallel requests of the same user', async () => {
    await Promise.all([
      provisioning.ensureUserRow(CALLER),
      provisioning.ensureUserRow(CALLER),
      provisioning.ensureUserRow(CALLER),
    ]);

    expect(getUser).toHaveBeenCalledTimes(1);
    expect(tables.users).toHaveLength(1);
  });
});

describe('Onboarding before the create-user webhook arrives', () => {
  const onboarding: OnboardingDto = {
    first_name: 'Ana',
    gender: GenderEnum.FEMALE,
    seeking: SeekingEnum.FRIENDSHIP,
    interested_in: [GenderEnum.MALE],
    interests: ['Music'],
    picture_urls: [],
    venue_types: [VenueTypeEnum.BAR],
    bio: 'Hi',
    birthday: '1998-04-12',
  };
  const guestsWith = (userProvisioning: UserProvisioningService) =>
    new GuestsService(
      supabase,
      {} as R2Service,
      new GuestSafetyService(supabase),
      userProvisioning,
    );

  it('could not save the guests row without the users row', async () => {
    const noFallback = {
      ensureUserRow: () => Promise.resolve(),
    } as unknown as UserProvisioningService;

    await expect(
      guestsWith(noFallback).upsertOnboarding(CALLER, onboarding),
    ).rejects.toMatchObject({ code: '23503' });
    expect(tables.guests).toEqual([]);
  });

  it('saves the answers once the API has made the users row', async () => {
    const result = await guestsWith(provisioning).upsertOnboarding(
      CALLER,
      onboarding,
    );

    expect(result.isOnboardingComplete).toBe(true);
    expect(tables.users[0]).toMatchObject({ id: CALLER, first_name: 'Ana' });
    expect(tables.guests).toEqual([
      expect.objectContaining({ user_id: CALLER, gender: 'female' }),
    ]);
  });

  it('makes the row as soon as the app asks whether onboarding is done', async () => {
    const status = await guestsWith(provisioning).getGuestMe(CALLER);

    expect(status.isOnboardingComplete).toBe(false);
    expect(tables.users.map((u) => u.id)).toEqual([CALLER]);
  });
});
