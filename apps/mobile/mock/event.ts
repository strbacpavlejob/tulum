import { Event } from "@/types/event";
import { faker } from "@faker-js/faker";

const makeEvent = (): Event => ({
  id: faker.string.uuid(),
  image: faker.image.urlPicsumPhotos(),
  title: faker.word.adjective() + " " + faker.word.noun(),
  venueName: faker.company.name(),
  address: faker.location.streetAddress(),
  date: faker.date.recent().toISOString(),
  tags: Array.from({ length: 3 }, () => faker.word.noun()),
  location: {
    latitude: faker.location.latitude({ min: 44.76, max: 44.8 }),
    longitude: faker.location.longitude({ min: 20.4, max: 20.5 }),
    address: faker.location.streetAddress(),
  },
  isFavorite: faker.datatype.boolean(),
  guestCount: faker.number.int({ min: 0, max: 200 }),
  venue_picture: faker.image.url(),
  description: faker.lorem.paragraph(),
  isSeen: false,
  isAttending: false,
  price: faker.number.int({ min: 0, max: 150 }),
  venueContact: null,
  requiresReservation: false,
});

export const mockedEvent: Event = makeEvent();
export const mockedEvents: Event[] = Array.from({ length: 30 }, makeEvent);
