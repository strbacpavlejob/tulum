import { useEffect } from "react";
import { faker } from "@faker-js/faker";
import { useEventsStore, type Event } from "@/store/events";
import { useVenuesStore, type Venue } from "@/store/venues";

const EVENT_STATUSES: Event["status"][] = [
  "draft",
  "active",
  "cancelled",
];

const VENUE_TYPES = [
  "Restaurant",
  "Bar",
  "Club",
  "Lounge",
  "Beach Club",
  "Rooftop Bar",
  "Concert Hall",
  "Conference Center",
  "Hotel",
  "Gallery",
];

const generateMockVenues = (count: number = 10): Venue[] => {
  const venues: Venue[] = [];

  for (let i = 1; i <= count; i++) {
    venues.push({
      id: i,
      name: faker.company.name(),
      longitude: faker.location.longitude({
        min: 20.3,
        max: 20.6,
      }),
      latitude: faker.location.latitude({
        min: 44.7,
        max: 44.9,
      }),
      type: faker.helpers.arrayElement(VENUE_TYPES),
      capacity: faker.number.int({ min: 50, max: 1000 }),
      address: faker.location.streetAddress(true),
      description: faker.lorem.paragraph(),
      picture: faker.image.urlLoremFlickr({ category: "restaurant,bar,venue" }),
      picture_urls: Array.from(
        { length: faker.number.int({ min: 1, max: 5 }) },
        () => faker.image.urlLoremFlickr({ category: "restaurant,bar,venue" }),
      ),
      created_at: faker.date.past({ years: 2 }).toISOString(),
      updated_at: faker.date.recent({ days: 30 }).toISOString(),
    });
  }

  return venues;
};

const generateMockEvents = (venues: Venue[], count: number = 20): Event[] => {
  const events: Event[] = [];

  for (let i = 1; i <= count; i++) {
    const venue = faker.helpers.arrayElement(venues);
    const startDate = faker.date.future({ years: 1 });
    const endDate = new Date(
      startDate.getTime() +
        faker.number.int({ min: 2, max: 8 }) * 60 * 60 * 1000,
    );
    const capacity = faker.number.int({ min: 20, max: venue.capacity });
    const ticketsSold = faker.number.int({ min: 0, max: capacity });

    events.push({
      id: i,
      venue_id: venue.id,
      venue_name: venue.name,
      title: faker.helpers.arrayElement([
        `${faker.music.genre()} Night`,
        `${faker.word.adjective()} ${faker.word.noun()} Party`,
        `${faker.company.catchPhrase()}`,
        `${faker.word.adjective()} ${faker.word.noun()} Festival`,
        `${faker.person.firstName()}'s ${faker.word.noun()} Celebration`,
      ]),
      description: faker.lorem.paragraphs(2),
      start_date_time: startDate.toISOString(),
      end_date_time: endDate.toISOString(),
      tags: Array.from({ length: faker.number.int({ min: 2, max: 6 }) }, () =>
        faker.helpers.arrayElement([
          "Music",
          "Dance",
          "Food",
          "Drinks",
          "Live Band",
          "DJ",
          "Party",
          "Festival",
          "Networking",
          "Art",
          "Comedy",
          "Sports",
          "Family",
          "Night Life",
          "Culture",
        ]),
      ),
      picture: faker.image.urlLoremFlickr({ category: "party,event,concert" }),
      status: faker.helpers.arrayElement(EVENT_STATUSES),
      tickets_sold: ticketsSold,
      created_at: faker.date.past({ years: 1 }).toISOString(),
      updated_at: faker.date.recent({ days: 15 }).toISOString(),
    });
  }

  return events;
};

interface UseSetupStoreOptions {
  venueCount?: number;
  eventCount?: number;
  skipSetup?: boolean;
}

/**
 * Custom hook to populate Zustand stores with mock data using faker.js
 *
 * @param options - Configuration options
 * @param options.venueCount - Number of mock venues to generate (default: 10)
 * @param options.eventCount - Number of mock events to generate (default: 20)
 * @param options.skipSetup - Skip the setup process (default: false)
 *
 * @example
 * ```tsx
 * function App() {
 *   useSetupStore({ venueCount: 15, eventCount: 30 });
 *   // Your component code
 * }
 * ```
 */
export function useSetupStore(options: UseSetupStoreOptions = {}) {
  const { venueCount = 10, eventCount = 20, skipSetup = false } = options;

  const setVenues = useVenuesStore((state) => state.setVenues);
  const setEvents = useEventsStore((state) => state.setEvents);
  const setVenuesLoading = useVenuesStore((state) => state.setLoading);
  const setEventsLoading = useEventsStore((state) => state.setLoading);

  useEffect(() => {
    if (skipSetup) return;

    const setupStore = async () => {
      try {
        // Set loading state
        setVenuesLoading(true);
        setEventsLoading(true);

        // Generate mock data
        const venues = generateMockVenues(venueCount);
        const events = generateMockEvents(venues, eventCount);

        // Populate stores
        setVenues(venues);
        setEvents(events);

        console.log(
          `✅ Store setup complete: ${venues.length} venues, ${events.length} events`,
        );
      } catch (error) {
        console.error("Failed to setup store:", error);
      } finally {
        setVenuesLoading(false);
        setEventsLoading(false);
      }
    };

    setupStore();
  }, [
    venueCount,
    eventCount,
    skipSetup,
    setVenues,
    setEvents,
    setVenuesLoading,
    setEventsLoading,
  ]);
}
