import { describe, expect, it } from '@jest/globals';
import { MAX_PAGE_SIZE, pageSize, parsePageLimit } from './paging';

describe('pageSize', () => {
  it('uses the fallback when the request asked for no size', () => {
    expect(pageSize(undefined, 25)).toBe(25);
    expect(pageSize(null, 30)).toBe(30);
    expect(pageSize(Number.NaN, 25)).toBe(25);
  });

  it('keeps a size within 0..MAX_PAGE_SIZE, in whole rows', () => {
    expect(pageSize(10, 25)).toBe(10);
    expect(pageSize(0, 25)).toBe(0);
    expect(pageSize(-3, 25)).toBe(0);
    expect(pageSize(500, 25)).toBe(MAX_PAGE_SIZE);
    expect(pageSize(12.9, 25)).toBe(12);
  });
});

describe('parsePageLimit', () => {
  it('reads a number from the query string, or null', () => {
    expect(parsePageLimit('10')).toBe(10);
    expect(parsePageLimit('0')).toBe(0);
    expect(parsePageLimit(undefined)).toBeNull();
    expect(parsePageLimit('')).toBeNull();
    expect(parsePageLimit('ten')).toBeNull();
  });
});
