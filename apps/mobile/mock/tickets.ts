import { Ticket } from "@/types/ticket";
import { faker } from "@faker-js/faker";
const truncate = (str: string, max: number) =>
  str.length > max ? str.slice(0, max) + "..." : str;

const makeTicket = (): Ticket => ({
  id: faker.string.uuid(),
  event_id: faker.string.uuid(),
  image: faker.image.urlPicsumPhotos(),
  title: truncate(faker.commerce.productName(), 15),
  description: truncate(faker.company.name(), 20),
  date: faker.date.recent().toISOString(),
  tags: Array.from({ length: 3 }, () => faker.word.noun()),
  venue_name: faker.company.name(),
  location: {
    latitude: faker.location.latitude({ min: 44.76, max: 44.8 }),
    longitude: faker.location.longitude({ min: 20.4, max: 20.5 }),
    address: faker.location.streetAddress(),
  },
});

export const mockedTicket: Ticket = makeTicket();
export const mockedTickets: Ticket[] = Array.from({ length: 30 }, makeTicket);
