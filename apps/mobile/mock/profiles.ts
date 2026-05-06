import { Profile } from "@/types/profile";
import { faker } from "@faker-js/faker";
import { mockedEvents } from "./event";

const SIZE = 30;

const personGender = () =>
  Array.from({ length: SIZE }, () => faker.person.sexType());

export const mockedProfiles: Profile[] = personGender().map((gender) => ({
  id: faker.string.uuid(),
  gender,
  name: faker.person.firstName(gender),
  age: faker.number.int({ min: 18, max: 35 }),
  bio: faker.lorem.sentence(),
  distance: faker.number.int({ min: 1, max: 100 }),
  images: Array.from({ length: 3 }, () =>
    faker.image.personPortrait({ sex: gender })
  ),
  distanceAway: faker.number.int({ min: 1, max: 10 }),
  hobbies: faker.helpers.arrayElements(
    [
      "Hiking",
      "Traveling",
      "Cooking",
      "Reading",
      "Gaming",
      "Fitness",
      "Music",
      "Dancing",
    ],
    3
  ),
  event: faker.helpers.arrayElement(mockedEvents),
}));
