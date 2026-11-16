import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  haversineMeters,
  isAtVenue,
  isEventOn,
  venuePosition,
} from './check-in-rules';
import { CreateEventSessionDto } from './dto/create-event-session.dto';

describe('check-in rules (N-6)', () => {
  it('measures distances like the app', () => {
    expect(haversineMeters(44.8176, 20.4569, 44.8176, 20.4569)).toBe(0);
    // A degree of latitude is about 111.2 km.
    expect(haversineMeters(44, 20, 45, 20)).toBeCloseTo(111_195, 0);
    expect(haversineMeters(44.8176, 20.4569, 44.8231, 20.4502)).toBeCloseTo(
      haversineMeters(44.8231, 20.4502, 44.8176, 20.4569),
      6,
    );
  });

  it('allows for accuracy up to the radius', () => {
    expect(isAtVenue(300, 0, 300)).toBe(true);
    expect(isAtVenue(301, 0, 300)).toBe(false);
    expect(isAtVenue(450, 150, 300)).toBe(true);
    expect(isAtVenue(601, 10_000, 300)).toBe(false);
    expect(isAtVenue(200, null, 300)).toBe(true);
    expect(isAtVenue(400, -50, 300)).toBe(false);
  });

  it('reads event times as UTC and opens 5 minutes early', () => {
    const start = '2026-12-19T21:00:00';
    const end = '2026-12-20T04:00:00';
    expect(isEventOn(start, end, Date.UTC(2026, 11, 19, 20, 55))).toBe(true);
    expect(isEventOn(start, end, Date.UTC(2026, 11, 19, 20, 54, 59))).toBe(
      false,
    );
    expect(isEventOn(start, end, Date.UTC(2026, 11, 20, 4, 0))).toBe(true);
    expect(isEventOn(start, end, Date.UTC(2026, 11, 20, 4, 0, 1))).toBe(false);
    expect(isEventOn(start, null, Date.UTC(2026, 11, 19, 22, 0))).toBe(false);
  });

  it('has no venue position for missing or 0,0 coordinates', () => {
    expect(venuePosition({ latitude: 44.8176, longitude: 20.4569 })).toEqual({
      latitude: 44.8176,
      longitude: 20.4569,
    });
    expect(venuePosition({ latitude: '44.8', longitude: '20.4' })).toEqual({
      latitude: 44.8,
      longitude: 20.4,
    });
    expect(venuePosition({ latitude: 0, longitude: 0 })).toBeNull();
    expect(venuePosition({ latitude: null, longitude: 20.4 })).toBeNull();
    expect(venuePosition(null)).toBeNull();
  });
});

describe('the check-in body (N-6)', () => {
  const errorsFor = (body: Record<string, unknown>) =>
    validateSync(plainToInstance(CreateEventSessionDto, body)).map(
      (error) => error.property,
    );
  const event_id = 'b6b6b6b6-0000-4000-8000-000000000001';

  it('needs the event and a position', () => {
    expect(
      errorsFor({ event_id, latitude: 44.8, longitude: 20.4, accuracy: 35 }),
    ).toEqual([]);
    expect(errorsFor({ event_id, latitude: 44.8, longitude: 20.4 })).toEqual(
      [],
    );
    expect(errorsFor({ event_id })).toEqual(['latitude', 'longitude']);
  });

  it('refuses positions that cannot be', () => {
    expect(
      errorsFor({ event_id, latitude: 91, longitude: 181, accuracy: -1 }),
    ).toEqual(['latitude', 'longitude', 'accuracy']);
    expect(
      errorsFor({ event_id: 'kst', latitude: '44.8', longitude: 20.4 }),
    ).toEqual(['event_id', 'latitude']);
  });
});
