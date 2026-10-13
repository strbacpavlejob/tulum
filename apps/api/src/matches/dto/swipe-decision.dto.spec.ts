import { describe, expect, it } from '@jest/globals';
import { validate } from 'class-validator';
import { SwipeDecisionDto } from './swipe-decision.dto';

describe('SwipeDecisionDto', () => {
  it('accepts the other gender filter', async () => {
    const swipe = Object.assign(new SwipeDecisionDto(), {
      other_user_id: 'target-user',
      event_id: 'f5f8b2e0-bfcf-4a77-90b7-e7631f38a101',
      liked: true,
      gender_filter: 'other',
      age_min: 18,
      age_max: 60,
      selected_interests: [],
    });

    expect(await validate(swipe)).toHaveLength(0);
  });

  it('rejects unknown gender filters', async () => {
    const swipe = Object.assign(new SwipeDecisionDto(), {
      other_user_id: 'target-user',
      event_id: 'f5f8b2e0-bfcf-4a77-90b7-e7631f38a101',
      liked: true,
      gender_filter: 'unknown',
    });

    const errors = await validate(swipe);

    expect(errors.some((error) => error.property === 'gender_filter')).toBe(
      true,
    );
  });
});
