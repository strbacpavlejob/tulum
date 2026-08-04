export interface VenueContact {
  phoneNumber: string;

  isViber: boolean;
  isPhone: boolean;
  isSms: boolean;
  isWhatsapp: boolean;

  instagramHandle: string | null;
  isInstagram: boolean;

  createdAt: Date;
  updatedAt: Date;
}
