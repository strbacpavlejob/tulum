import { User } from "./user";

export interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isFromUser: boolean;
}

export interface Match {
  id: string;
  chatId?: number;
  name: string;
  age: number;
  photo: string;
  venue: string;
  lastMessage: string;
  lastMessageTime: Date;
  expiresAt: Date;
  messages: Message[];
  profile?: Partial<User>;
}

export interface NewMatch {
  id: string;
  name: string;
  age: number;
  photo: string;
  venue: string;
  expiresAt: Date;
}
