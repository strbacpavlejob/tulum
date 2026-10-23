import { describe, expect, it } from '@jest/globals';
import { validate } from 'class-validator';
import { OnboardingDto } from './onboarding.dto';

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
