import { describe, expect, it, jest } from '@jest/globals';
import { SupabaseService } from '../supabase/supabase.service';
import { AttributionService } from './attribution.service';

type Result = { data: unknown; error: unknown };

/** The update chain: update(values).eq(...).is(...), answering result. */
function serviceAnswering(result: Result) {
  const calls: { values?: unknown; eq?: unknown[]; is?: unknown[] } = {};
  const chain = {
    eq: jest.fn((...args: unknown[]) => {
      calls.eq = args;
      return chain;
    }),
    is: jest.fn((...args: unknown[]) => {
      calls.is = args;
      return Promise.resolve(result);
    }),
  };
  const from = jest.fn(() => ({
    update: (values: unknown) => {
      calls.values = values;
      return chain;
    },
  }));
  const service = new AttributionService({
    getClient: () => ({ from }),
  } as unknown as SupabaseService);
  return { service, calls, from };
}

describe('AttributionService', () => {
  it('records the first event and its QR poster only while none is recorded', async () => {
    const { service, calls, from } = serviceAnswering({
      data: null,
      error: null,
    });

    await service.recordFirstEvent('user_ana', 'event-1', 'p07');

    expect(from).toHaveBeenCalledWith('guests');
    expect(calls.values).toEqual({
      first_event_id: 'event-1',
      first_source: 'p07',
    });
    expect(calls.eq).toEqual(['user_id', 'user_ana']);
    expect(calls.is).toEqual(['first_event_id', null]);
  });

  it('keeps a poster tag only when it looks like one', async () => {
    const { service, calls } = serviceAnswering({ data: null, error: null });
    await service.recordFirstEvent('user_ana', 'event-1', '<script>');
    expect(calls.values).toEqual({
      first_event_id: 'event-1',
      first_source: null,
    });
  });

  it('records the sign-up platform once, and skips a malformed one', async () => {
    const { service, calls, from } = serviceAnswering({
      data: null,
      error: null,
    });

    await service.recordSignupPlatform('user_ana', 'web-android-instagram');
    expect(calls.values).toEqual({ signup_platform: 'web-android-instagram' });
    expect(calls.is).toEqual(['signup_platform', null]);

    from.mockClear();
    await service.recordSignupPlatform('user_ana', 'Android 14');
    await service.recordSignupPlatform('user_ana', undefined);
    expect(from).not.toHaveBeenCalled();
  });

  it('never fails the request it rides on, before or after the migration', async () => {
    const missing = serviceAnswering({
      data: null,
      error: {
        code: 'PGRST204',
        message: "Could not find the 'first_event_id' column",
      },
    });
    await expect(
      missing.service.recordFirstEvent('user_ana', 'event-1', null),
    ).resolves.toBeUndefined();

    const broken = serviceAnswering({
      data: null,
      error: { code: '57014', message: 'canceling statement' },
    });
    await expect(
      broken.service.recordSignupPlatform('user_ana', 'web-ios'),
    ).resolves.toBeUndefined();
  });
});
