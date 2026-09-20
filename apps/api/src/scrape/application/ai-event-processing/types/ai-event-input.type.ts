export type AiEventInput = {
  index: number;

  venue: {
    name: string;
    venueType: string;
    address: string;
  };

  title: string;
  description: string;
};
