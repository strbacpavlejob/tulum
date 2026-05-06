export type Comment = {
  user: User;
  host: User;
  text: string;
  date: Date;
  rating: number;
};

export type Party = {
  partyId: string;
  latitude: number;
  longitude: number;
  title: string;
  host: User;
  ticketPrice: number;
  isFavorite: boolean;
  description: string;
  startDateTime: Date;
  endDateTime: Date;
  guests: number;
  tags: string[];
  benefits: string[];
  comments: Comment[];
  pictures: string[];
  status: string;
};
// Utility type to extract values from the typeof PartyTicketStatus
type ValueOf<T> = T[keyof T];

// Create a type based on the values of PartyTicketStatus

export const partyTicketStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type PartyTicketStatusType = ValueOf<typeof partyTicketStatus>;

export type PartyTicket = Party & {
  isPublished: boolean;
  status: PartyTicketStatusType;
};

export const hostedPartyStatus = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;
// Create a type based on the values of PartyTicketStatus
export type HostedPartyStatusType = ValueOf<typeof hostedPartyStatus>;

export type HostedParty = Party & {
  isPublished: boolean;
  status: HostedPartyStatusType;
};

export type UserStatistics = {
  parties: number;
  guests: number;
  rating: number;
};

export type User = {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  description: string;
  statistics: UserStatistics;
};

export type HostUser = User & { parties: Party[]; comments: Comment[] };
