import { Ticket } from "@/types/ticket";
import { faker } from "@faker-js/faker";
const truncate = (str: string, max: number) =>
  str.length > max ? str.slice(0, max) + "..." : str;

export const mockedTicket: Ticket = {
  id: faker.string.uuid(),
  image: faker.image.url(),
  title: faker.word.adjective(),
  description: faker.lorem.paragraph(),
  date: faker.date.recent().toISOString(),
  tags: Array.from({ length: 3 }, () => faker.word.noun()),
  location: {
    latitude: faker.location.latitude({ min: 44.76, max: 44.8 }),
    longitude: faker.location.longitude({ min: 20.4, max: 20.5 }),
    address: faker.location.streetAddress(),
  },
  isFavorite: faker.datatype.boolean(),
  guests: Array.from({ length: 20 }, () => ({
    name: `${faker.person.firstName()} ${faker.person.lastName()}`,
    uri: faker.image.avatar(),
  })),
  comment: Array.from({ length: 3 }, () => ({
    user: {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      avatar: faker.image.avatar(),
    },
    host: {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      avatar: faker.image.avatar(),
    },
    text: faker.lorem.sentence(),
    date: new Date(faker.date.recent()),
    rating: faker.number.int({ min: 1, max: 5 }),
  })),
  price: faker.number.int({ min: 0, max: 150 }),
};

export const mockedTickets: Ticket[] = Array.from({ length: 30 }, () => ({
  id: faker.string.uuid(),
  image: faker.image.urlPicsumPhotos(),
  title: truncate(faker.commerce.productName(), 15),
  description: truncate(faker.company.name(), 20),
  date: faker.date.recent().toISOString(),
  tags: Array.from({ length: 3 }, () => faker.word.noun()),
  location: {
    latitude: faker.location.latitude({ min: 44.76, max: 44.8 }),
    longitude: faker.location.longitude({ min: 20.4, max: 20.5 }),
    address: faker.location.streetAddress(),
  },
  isFavorite: faker.datatype.boolean(),
  guests: Array.from({ length: 20 }, () => ({
    name: `${faker.person.firstName()} ${faker.person.lastName()}`,
    uri: faker.image.avatar(),
  })),
  comment: Array.from({ length: 3 }, () => ({
    user: {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      avatar: faker.image.avatar(),
    },
    host: {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      avatar: faker.image.avatar(),
    },
    text: faker.lorem.sentence(),
    date: new Date(faker.date.recent()),
    rating: faker.number.int({ min: 1, max: 5 }),
  })),
  price: faker.number.int({ min: 0, max: 150 }),
}));
