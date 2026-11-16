import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { validate } from 'class-validator';
import { OnboardingDto } from './onboarding.dto';

describe('OnboardingDto birthday', () => {
  const birthdayErrors = async (birthday: string) => {
    const errors = await validate(
      Object.assign(new OnboardingDto(), { birthday }),
    );
    return errors.find((error) => error.property === 'birthday')?.constraints;
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('takes guests from their 18th birthday on', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-16T12:00:00Z') });
    expect(await birthdayErrors('2008-11-16')).toBeUndefined();
    expect(await birthdayErrors('1990-02-28')).toBeUndefined();
    expect(await birthdayErrors('2008-11-17')).toHaveProperty('isOldEnough');
    expect(await birthdayErrors('2015-01-01')).toHaveProperty('isOldEnough');
  });

  it('still reports a date that does not exist as such', async () => {
    const constraints = await birthdayErrors('2001-02-30');
    expect(constraints).toHaveProperty('isRealDate');
    expect(constraints).not.toHaveProperty('isOldEnough');
  });
});

describe('OnboardingDto venue types', () => {
  it('accepts the supported categories', async () => {
    const dto = Object.assign(new OnboardingDto(), {
      venue_types: [
        'bar',
        'club',
        'restaurant',
        'tavern',
        'cafe',
        'event_venue',
      ],
    });

    const errors = await validate(dto);

    expect(
      errors.find((error) => error.property === 'venue_types'),
    ).toBeUndefined();
  });

  it('rejects legacy venue categories', async () => {
    const dto = Object.assign(new OnboardingDto(), {
      venue_types: ['pub'],
    });

    const errors = await validate(dto);

    expect(
      errors.find((error) => error.property === 'venue_types'),
    ).toBeDefined();
  });
});
