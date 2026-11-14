import { describe, expect, it } from '@jest/globals';
import { extractEventData } from './instagram-event-extractor';

// Local dates, as the extractor builds them.
const localDay = (iso: string | null) => {
  if (!iso) return null;
  const date = new Date(iso);
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
};

describe('extractEventData dates (BUG-041)', () => {
  it('reads a day and month in the year the post went up', () => {
    const posted = new Date(2026, 4, 1, 12);
    const { startDateTime } = extractEventData(
      'Summer opening\n30 May from 22h',
      posted,
    );
    expect(localDay(startDateTime)).toEqual([2026, 5, 30]);
  });

  it('leaves out a date shortly before the post instead of rolling it a year on', () => {
    // A post from 30 April about 25.4: before, this became 2027-04-25.
    const posted = new Date(2026, 3, 30, 12);
    const { startDateTime } = extractEventData(
      'What a night 25.4 thank you all',
      posted,
    );
    expect(startDateTime).toBeNull();
  });

  it("reads a January date in a December post as next year's", () => {
    const posted = new Date(2026, 11, 20, 12);
    const { startDateTime } = extractEventData('New year party 5.1', posted);
    expect(localDay(startDateTime)).toEqual([2027, 1, 5]);
  });

  it('leaves out a date more than 60 days after the post', () => {
    const posted = new Date(2026, 3, 30, 12);
    const { startDateTime } = extractEventData(
      'Save the date: 20 August',
      posted,
    );
    expect(startDateTime).toBeNull();
  });

  it('reads weekdays relative to the post, not to when it is scraped', () => {
    // Thursday 2026-11-12: "petak" is the next day.
    const posted = new Date(2026, 10, 12, 12);
    const { startDateTime } = extractEventData('Žurka u petak', posted);
    expect(localDay(startDateTime)).toEqual([2026, 11, 13]);
  });
});
