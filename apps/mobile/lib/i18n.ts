import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  EN: {
    translation: {
      // Tabs
      profile: "Profile",
      settings: "Settings",

      // Settings rows
      theme: "Theme",
      notifications: "Notifications",
      language: "Language",
      location: "Location",
      defaultVenueType: "Default Venue Type",
      reportBug: "Report a bug",
      notSet: "Not set",
      on: "On",
      off: "Off",

      // Theme options
      light: "Light",
      dark: "Dark",
      system: "System",

      // Language names
      english: "English",
      serbian: "Serbian",
      russian: "Russian",

      // Auth actions
      logOut: "Log out",
      deleteAccount: "Delete account",

      // Auth screens
      authMeetPeopleTagline: "Meet people at events near you",
      authSignInTitle: "Sign in to continue",
      authSignInSubtitle: "Choose how you'd like to join",
      authContinueWithApple: "Continue with Apple",
      authContinueWithGoogle: "Continue with Google",
      authTermsPrefix: "By continuing, you agree to our",
      authTermsOfService: "Terms of Service",
      authTermsAnd: "and",
      authPrivacyPolicy: "Privacy Policy",
      authSsoSignInFailed: "SSO sign in failed.",
      authEnterEmailOrUsername: "Enter your email or username.",
      authSignInLoading: "Sign in is still loading. Please try again.",
      authContinueVerification:
        "Continue with your next verification step to finish sign in.",
      authContinueSignInFailed: "Failed to continue sign in.",
      authEnterOtp: "Enter the one-time password sent to your email.",
      authSecondFactorRequired: "A second verification step is required.",
      authInvalidCode: "Invalid code. Please try again.",
      authVerifyCodeFailed: "Failed to verify code.",

      // Onboarding
      onboardingStepNameTitle: "What's your name?",
      onboardingStepNameSubtitle: "This is how you'll appear to others",
      onboardingStepBirthdayTitle: "When were you born?",
      onboardingStepBirthdaySubtitle:
        "Your age will be visible on your profile",
      onboardingStepGenderTitle: "How do you identify?",
      onboardingStepGenderSubtitle: "This helps us show you relevant people",
      onboardingStepInterestedTitle: "Who are you interested in?",
      onboardingStepInterestedSubtitle: "We'll tailor your matches accordingly",
      onboardingStepLookingForTitle: "Why are you here?",
      onboardingStepLookingForSubtitle:
        "Choose the one option that best describes why you're here.",
      onboardingStepTagsTitle: "What are your interests?",
      onboardingStepTagsSubtitle: "Pick things you enjoy to find your crowd",
      onboardingStepVenuesTitle: "What venues do you love?",
      onboardingStepVenuesSubtitle:
        "We'll surface events you'll actually enjoy",
      onboardingStepPhotoTitle: "Add a profile photo",
      onboardingStepPhotoSubtitle: "A photo helps others recognize you",
      onboardingStepBioTitle: "Tell us about yourself",
      onboardingStepBioSubtitle: "A short bio goes a long way",
      onboardingGenderMan: "Man",
      onboardingGenderWoman: "Woman",
      onboardingGenderOther: "Other",
      onboardingInterestedMen: "Men",
      onboardingInterestedWomen: "Women",
      onboardingInterestedEveryone: "Everyone",
      onboardingSeekingCasual: "Casual",
      onboardingSeekingRelationship: "Relationship",
      onboardingSeekingFriendship: "Friendship",
      onboardingSeekingParty: "Party",
      onboardingFirstNamePlaceholder: "First name",
      onboardingBirthdayPlaceholder: "DD / MM / YYYY",
      onboardingBirthdayFormat: "Format: DD / MM / YYYY",
      onboardingPermissionRequired: "Permission required",
      onboardingPhotoPermissionMessage:
        "Please allow access to your photo library.",
      onboardingUploadFailed: "Upload failed",
      onboardingRemoveFailed: "Remove failed",
      onboardingAddPhoto: "Add photo",
      onboardingAddUpToPhotos: "Add up to 3 photos",
      onboardingPhotosAdded: "{{count}}/3 photos added",
      onboardingMissingRequiredFields: "Missing required fields",
      onboardingAuthError: "Authentication error. Please sign in again.",
      onboardingSaveFailed: "Save failed",
      onboardingSubmitError:
        "We couldn't save your profile. Please try again.",
      onboardingBioPlaceholder: "Tell others a little about yourself...",
      onboardingContinue: "Continue",
      onboardingCompleteProfile: "Complete Profile",

      // Delete alert
      deleteAlertTitle: "Delete account",
      deleteAlertDescription:
        "This action cannot be undone. All your data will be permanently deleted.",
      cancel: "Cancel",
      confirm: "Confirm",
      deletingAccount: "Deleting...",
      accountDeleted: "Your account was deleted.",
      deleteAccountFailed: "Account not deleted",
      deleteAccountTryAgain: "Your account is still active. Please try again.",
      deleteAccountHostsVenues:
        "This account hosts venues. Move them to another host before deleting it.",

      // Bug report
      bugReportPlaceholder: "Describe the bug...",
      bugReportSent: "Thanks! Your bug report was sent.",
      bugReportNotSent: "Your report wasn't sent. Please try again.",
      send: "Send",
      suggestVenue: "Suggest a venue",
      venueNamePlaceholder: "Venue name",
      instagramHandlePlaceholder: "Instagram handle (without @)",
      additionalInfoPlaceholder: "Additional info (optional)",
      nameRequired: "Name required",
      pleaseProvideVenueName: "Please provide a venue name",
      venueSuggestionSent: "Thanks! Your venue suggestion was sent.",
      venueSuggestionNotSent: "Your suggestion wasn't sent. Please try again.",
      sendFailed: "Failed to send",
      saveFailed: "Save failed",
      profileChangeNotSaved: "Your change wasn't saved. Please try again.",

      // Profile photos
      permissionRequired: "Permission required",
      photoLibraryPermissionDescription:
        "Please allow access to your photo library.",
      uploadFailed: "Upload failed",
      removeFailed: "Remove failed",

      // Profile edit labels
      tags: "Tags",
      work: "Work",
      education: "Education",
      whyYoureHere: "Why you're here",
      bio: "Bio",
      heightCm: "Height (cm)",
      children: "Children",
      drinking: "Drinking",
      languages: "Languages",
      relationshipStatus: "Relationship status",
      sexuality: "Sexuality",
      smoking: "Smoking",
      starSign: "Star sign",
      pets: "Pets",
      religion: "Religion",

      // Tickets
      noTicketsTitle: "No upcoming tickets yet",
      noTicketsSubtitle:
        "You have no upcoming tickets, so go to the map to find available events near you.",
      goToMap: "Go to Map",

      // Matches
      noMatchesTitle: "No swipes yet!",
      noMatchesSubtitle: "Check back after attending an event.",
      matchesLocked: "Matches are locked",
      matchesLockedSubtitle:
        "Matching unlocks during a live event with a valid ticket, so check your upcoming tickets below.",
      matchesUnlockButton: "View tickets",
      matchesAlmostThere: "Almost there!",
      matchesArriveAtVenue:
        "Swiping is only available at the event venue. Once you arrive, tap the location button below to verify your position and start matching.",
      matchesCheckLocation: "Check my location",
      callYandexTaxi: "Call Yandex Taxi",
      matchesYourLocation: "Your location",
      matchesEventVenue: "Event venue",
      matchesRetrySoon: "Please try again in a moment.",

      // Inbox
      newMatches: "New Matches",
      messages: "Messages",
      noMessagesYet: "No messages yet",
      noMessagesYetSubtitle:
        "You have no messages yet, so go to Matches and swipe to meet people at your event.",
      noMessagesYetButton: "Go to Matches",
      chatExpiredTitle: "Chat Expired",
      chatExpiredDescription:
        "This conversation has expired and can no longer be accessed.",
      sayHello: "Say hello!",

      // Chat location gate
      chatLocationRequired: "You need to be at the venue",
      chatLocationRequiredSubtitle:
        "While the event is live, chats only open at the event venue. Once you're there, allow location access and tap the location button below.",
      back: "Back",

      // Event details
      guestList: "Guest List",
      buyTicket: "Buy Ticket",
      attending: "Attending",

      // Filters / Calendar
      apply: "Apply",
      reset: "Reset",
      dateRange: "Date Range",
      filters: "Filters",
      filterVenueType: "Venue Type",
      selectVenueType: "Select venue type",
      capacity: "Capacity",
      min: "Min",
      max: "Max",
      onlyFavorites: "Only favorites",

      // Chat / Messaging
      atVenue: "at {{venue}}",
      typeAMessage: "Type a message...",

      // Find modal
      findYourMatch: "Find your match",
      pairCode: "Pair Code",
      pairCodeDescription:
        "Show this emoji to someone nearby to match instantly. Your pair code helps verify the connection.",

      // Guest list modal
      freeSpaces: "Free Spaces",
      spotsLeft: "{{count}} spots left",
      eventIsFull: "Event is full",
      avgAge: "Avg age",
      attend: "Attend",
      you: "You",

      // Swipe card
      like: "LIKE",
      pass: "PASS",

      // Discover card
      going: "going",
      beTheFirst: "Be the first",

      // Not found / Error screens
      screenNotFound: "This screen does not exist.",
      goToHome: "Go to home screen!",
      serverUnreachable:
        "Could not reach the server. Make sure the API is running and EXPO_PUBLIC_API_URL is set correctly.",
      retry: "Retry",

      // Match modal
      itsAMatch: "It's a Match!",
      youAndLikedEachOther: "You and {{name}} have liked each other",
      saySomethingNice: "Say something nice...",
      matchMessageFailed: "Couldn't send your message. Please try again.",

      // Map / Search
      searchEvents: "Search events...",
      noEventsMatchSearch: "No events match your search.",
      openInMaps: "Open in Maps",

      // Profile info sections
      photos: "Photos",
      interests: "Interests",
      addInterests: "Add interests…",
      workAndEducation: "Work & Education",
      select: "Select…",
      tellOthersAboutYourself: "Tell others about yourself…",
      profileVisibilityNote:
        "Guests you match with see your whole profile. Before that, guests at the same event see your photos, name, age, interests and bio, and guests going to it see your name, age and photo on its guest list. Choose below who can see you. To block or report someone, tap ⋯ on their profile or in your chat.",
      height: "Height",
      relationship: "Relationship",

      // Profile option values — looking for
      toDate: "to date",
      toParty: "to party",
      openToChat: "open to chat",
      readyForRelationship: "ready for a relationship",

      // Lifestyle options
      never: "never",
      socially: "socially",
      regularly: "regularly",
      preferNotToSay: "prefer not to say",

      // Yes / No
      no: "no",
      yes: "yes",

      // Relationship status options
      single: "single",
      divorced: "divorced",
      separated: "separated",

      // Sexuality options
      straight: "straight",
      gay: "gay",
      bisexual: "bisexual",

      // Star signs
      aries: "Aries",
      taurus: "Taurus",
      gemini: "Gemini",
      cancer: "Cancer",
      leo: "Leo",
      virgo: "Virgo",
      libra: "Libra",
      scorpio: "Scorpio",
      sagittarius: "Sagittarius",
      capricorn: "Capricorn",
      aquarius: "Aquarius",
      pisces: "Pisces",

      // Religion options
      atheist: "atheist",
      agnostic: "agnostic",
      christian: "christian",
      muslim: "muslim",
      jewish: "jewish",
      buddhist: "buddhist",
      hindu: "hindu",
      other: "other",

      // Pet options
      cat: "cat",
      dog: "dog",
      fish: "fish",
      bird: "bird",
      none: "none",

      // Additional spoken languages
      spanish: "Spanish",
      french: "French",
      german: "German",

      // Interest tags
      photography: "Photography",
      travel: "Travel",
      yoga: "Yoga",
      music: "Music",
      coffee: "Coffee",
      art: "Art",
      dancing: "Dancing",
      hiking: "Hiking",
      food: "Food",
      tech: "Tech",
      fitness: "Fitness",
      reading: "Reading",
      movies: "Movies",
      gaming: "Gaming",
      fashion: "Fashion",

      // Venue type options
      bar: "Bar",
      club: "Club",
      restaurant: "Restaurant",
      tavern: "Tavern",
      cafe: "Cafe",
      eventVenue: "Event Venue",

      // Filter / map
      all: "All",

      // Tickets sections
      liveNow: "Live now",
      startingSoon: "Starting soon",
      upcoming: "Upcoming",

      // Attend / event actions
      cancelAttendance: "Cancel attendance",
      noEventSelected: "No event selected",
      goingLabel: "Going",
      full: "Full",

      // Reservation modal
      reservationRequired: "Reservation required",
      reservationDescription:
        "This venue requires a reservation via {{methods}}. Contact them first, then confirm below.",
      madeReservationAttend: "I made the reservation — Attend",
      contactVenueFirst: "Contact the venue first",
      call: "Call",
      sms: "SMS",
      viber: "Viber",
      whatsapp: "WhatsApp",
      instagramDm: "Instagram DM",
      // Sharing
      share: "Share",
      linkCopied: "Link copied",
      linkShared: "Link shared",
      // Guest safety: block, report and who can see me (TASK-001)
      whoCanSeeMe: "Who can see me",
      visibilityEveryone: "Everyone going",
      visibilityEveryoneDescription:
        "Guests going to the same event see you on its guest list and in Matches.",
      visibilityLiked: "Only people I like",
      visibilityLikedDescription:
        "Guests see you only after you like them at that event. You can still browse and like.",
      visibilityHidden: "Hidden",
      visibilityHiddenDescription:
        "Nobody sees you on guest lists or in Matches, and Matches is paused for you. Your matches and chats stay open.",
      visibilitySaved: "Saved: {{option}}",
      reportOrBlock: "Report or block",
      reportAction: "Report",
      reportActionHint: "Tell us what happened. They're blocked too.",
      blockActionHint: "You won't see each other anymore.",
      safetySheetNote: "{{name}} won't be told.",
      block: "Block",
      blockConfirmTitle: "Block {{name}}?",
      blockConfirmDescription:
        "You won't see each other in Matches, on guest lists or in Messages, and your chat closes. {{name}} won't be told. You can't undo this.",
      guestBlocked: "{{name}} is blocked.",
      blockFailed: "Couldn't block. Please try again.",
      reportTitle: "Report {{name}}",
      reportDescription:
        "The Tulum team reviews every report. {{name}} is blocked when you send it and won't know who reported them.",
      reportReasonHarassment: "Harassment or threats",
      reportReasonInappropriate: "Inappropriate photos or messages",
      reportReasonFakeProfile: "Fake profile or scam",
      reportReasonSpam: "Spam or selling something",
      reportReasonUnderage: "Might be under 18",
      reportReasonUnsafeMeeting: "Made me feel unsafe in person",
      reportReasonOther: "Something else",
      reportDetailsPlaceholder: "Add details (optional)",
      reportDetailsRequired: "What happened?",
      reportSend: "Report and block",
      reportSent: "Thanks for telling us. {{name}} is blocked.",
      reportNotSent: "Your report wasn't sent. Please try again.",
      guestUnavailable: "This guest is no longer available.",
      chatUnavailable: "This chat is no longer available.",
      matchesHiddenTitle: "You're hidden",
      matchesHiddenSubtitle:
        "Guests at this event can't see you, and Matches is paused for you. You can change who sees you on your Profile.",
      matchesHiddenButton: "Go to Profile",
      guestListAttendToSee:
        "Only guests going to this event see who's going. Attend to see the guest list.",
      guestListNotShown: "Also going, not shown: {{count}}",
    },
  },

  RS: {
    translation: {
      // Tabs
      profile: "Profil",
      settings: "Podešavanja",

      // Settings rows
      theme: "Tema",
      notifications: "Obaveštenja",
      language: "Jezik",
      location: "Lokacija",
      defaultVenueType: "Podrazumevani tip lokala",
      reportBug: "Prijavi grešku",
      notSet: "Nije postavljeno",
      on: "Uključeno",
      off: "Isključeno",

      // Theme options
      light: "Svetla",
      dark: "Tamna",
      system: "Sistem",

      // Language names
      english: "Engleski",
      serbian: "Srpski",
      russian: "Ruski",

      // Auth actions
      logOut: "Odjavi se",
      deleteAccount: "Obriši nalog",

      // Auth screens
      authMeetPeopleTagline: "Upoznaj ljude na događajima u blizini",
      authSignInTitle: "Prijavi se za nastavak",
      authSignInSubtitle: "Izaberi kako želiš da se pridružiš",
      authContinueWithApple: "Nastavi preko Apple-a",
      authContinueWithGoogle: "Nastavi preko Google-a",
      authTermsPrefix: "Nastavkom se slažeš sa našim",
      authTermsOfService: "Uslovima korišćenja",
      authTermsAnd: "i",
      authPrivacyPolicy: "Politikom privatnosti",
      authSsoSignInFailed: "SSO prijava nije uspela.",
      authEnterEmailOrUsername: "Unesi svoj email ili korisničko ime.",
      authSignInLoading: "Prijava se još učitava. Pokušaj ponovo.",
      authContinueVerification:
        "Nastavi sa sledećim korakom verifikacije da završiš prijavu.",
      authContinueSignInFailed: "Nastavak prijave nije uspeo.",
      authEnterOtp: "Unesi jednokratni kod poslat na email.",
      authSecondFactorRequired: "Potreban je drugi korak verifikacije.",
      authInvalidCode: "Neispravan kod. Pokušaj ponovo.",
      authVerifyCodeFailed: "Provera koda nije uspela.",

      // Onboarding
      onboardingStepNameTitle: "Kako se zoveš?",
      onboardingStepNameSubtitle: "Ovako ćeš se prikazivati drugima",
      onboardingStepBirthdayTitle: "Kada si rođen/a?",
      onboardingStepBirthdaySubtitle:
        "Tvoje godine će biti vidljive na profilu",
      onboardingStepGenderTitle: "Kako se identifikuješ?",
      onboardingStepGenderSubtitle:
        "Ovo nam pomaže da prikažemo relevantne osobe",
      onboardingStepInterestedTitle: "Ko te zanima?",
      onboardingStepInterestedSubtitle: "Prilagodićemo tvoje mečeve tome",
      onboardingStepLookingForTitle: "Šta tražiš ovde?",
      onboardingStepLookingForSubtitle:
        "Izaberi jednu opciju koja najbolje opisuje zašto si ovde.",
      onboardingStepTagsTitle: "Koja su tvoja interesovanja?",
      onboardingStepTagsSubtitle:
        "Izaberi stvari koje voliš kako bi našao/la svoju ekipu",
      onboardingStepVenuesTitle: "Koje lokale voliš?",
      onboardingStepVenuesSubtitle:
        "Prikazaćemo događaje koje ćeš stvarno voleti",
      onboardingStepPhotoTitle: "Dodaj profilnu fotografiju",
      onboardingStepPhotoSubtitle:
        "Fotografija pomaže drugima da te prepoznaju",
      onboardingStepBioTitle: "Reci nešto o sebi",
      onboardingStepBioSubtitle: "Kratak opis mnogo znači",
      onboardingGenderMan: "Muškarac",
      onboardingGenderWoman: "Žena",
      onboardingGenderOther: "Drugo",
      onboardingInterestedMen: "Muškarci",
      onboardingInterestedWomen: "Žene",
      onboardingInterestedEveryone: "Svi",
      onboardingSeekingCasual: "Neobavezno",
      onboardingSeekingRelationship: "Veza",
      onboardingSeekingFriendship: "Prijateljstvo",
      onboardingSeekingParty: "Žurka",
      onboardingFirstNamePlaceholder: "Ime",
      onboardingBirthdayPlaceholder: "DD / MM / GGGG",
      onboardingBirthdayFormat: "Format: DD / MM / GGGG",
      onboardingPermissionRequired: "Potrebna dozvola",
      onboardingPhotoPermissionMessage:
        "Dozvoli pristup svojoj galeriji fotografija.",
      onboardingUploadFailed: "Otpremanje nije uspelo",
      onboardingRemoveFailed: "Uklanjanje nije uspelo",
      onboardingAddPhoto: "Dodaj fotografiju",
      onboardingAddUpToPhotos: "Dodaj do 3 fotografije",
      onboardingPhotosAdded: "Dodato fotografija: {{count}}/3",
      onboardingMissingRequiredFields: "Nedostaju obavezna polja",
      onboardingAuthError: "Greška pri autentikaciji. Prijavi se ponovo.",
      onboardingSaveFailed: "Čuvanje nije uspelo",
      onboardingSubmitError:
        "Nije moguće sačuvati tvoj profil. Pokušaj ponovo.",
      onboardingBioPlaceholder: "Reci drugima nešto o sebi...",
      onboardingContinue: "Nastavi",
      onboardingCompleteProfile: "Završi profil",

      // Delete alert
      deleteAlertTitle: "Obriši nalog",
      deleteAlertDescription:
        "Ova radnja se ne može poništiti. Svi vaši podaci će biti trajno obrisani.",
      cancel: "Otkaži",
      confirm: "Potvrdi",
      deletingAccount: "Brisanje...",
      accountDeleted: "Tvoj nalog je obrisan.",
      deleteAccountFailed: "Nalog nije obrisan",
      deleteAccountTryAgain: "Tvoj nalog je i dalje aktivan. Pokušaj ponovo.",
      deleteAccountHostsVenues:
        "Ovaj nalog upravlja lokalima. Prebaci ih na drugog organizatora pre brisanja naloga.",

      // Bug report
      bugReportPlaceholder: "Opiši grešku...",
      bugReportSent: "Hvala! Prijava greške je poslata.",
      bugReportNotSent: "Prijava nije poslata. Pokušaj ponovo.",
      send: "Pošalji",
      suggestVenue: "Predloži lokal",
      venueNamePlaceholder: "Naziv lokala",
      instagramHandlePlaceholder: "Instagram nalog (bez @)",
      additionalInfoPlaceholder: "Dodatne informacije (opciono)",
      nameRequired: "Ime je obavezno",
      pleaseProvideVenueName: "Molimo unesite naziv lokala",
      venueSuggestionSent: "Hvala! Predlog lokala je poslat.",
      venueSuggestionNotSent: "Predlog nije poslat. Pokušaj ponovo.",
      sendFailed: "Slanje nije uspelo",
      saveFailed: "Čuvanje nije uspelo",
      profileChangeNotSaved: "Izmena nije sačuvana. Pokušaj ponovo.",

      // Profile photos
      permissionRequired: "Potrebna dozvola",
      photoLibraryPermissionDescription:
        "Dozvoli pristup svojoj galeriji fotografija.",
      uploadFailed: "Otpremanje nije uspelo",
      removeFailed: "Uklanjanje nije uspelo",

      // Profile edit labels
      tags: "Oznake",
      work: "Posao",
      education: "Obrazovanje",
      whyYoureHere: "Zašto ste ovde",
      bio: "Biografija",
      heightCm: "Visina (cm)",
      children: "Deca",
      drinking: "Alkohol",
      languages: "Jezici",
      relationshipStatus: "Status veze",
      sexuality: "Seksualnost",
      smoking: "Pušenje",
      starSign: "Horoskopski znak",
      pets: "Kućni ljubimci",
      religion: "Vera",

      // Tickets
      noTicketsTitle: "Još nema karata za predstojeće događaje",
      noTicketsSubtitle:
        "Nemaš karte za predstojeće događaje, pa idi na mapu da pronađeš dostupne događaje u blizini.",
      goToMap: "Idi na mapu",

      // Matches
      noMatchesTitle: "Nema mečeva!",
      noMatchesSubtitle: "Proveri ponovo posle prisustvovanja događaju.",
      matchesLocked: "Mečevi su zaključani",
      matchesLockedSubtitle:
        "Mečevi se otključavaju tokom aktivnog događaja uz važeću kartu, zato proveri svoje predstojeće karte ispod.",
      matchesUnlockButton: "Pogledaj karte",
      matchesAlmostThere: "Skoro si tu!",
      matchesArriveAtVenue:
        "Prevlačenje je dostupno samo na lokaciji događaja. Kada stigneš, dodirni dugme za lokaciju ispod da potvrdiš svoju poziciju i počneš sa mečevima.",
      matchesCheckLocation: "Proveri moju lokaciju",
      callYandexTaxi: "Pozovi Yandex Taxi",
      matchesYourLocation: "Tvoja lokacija",
      matchesEventVenue: "Mesto događaja",
      matchesRetrySoon: "Pokušaj ponovo za trenutak.",

      // Inbox
      newMatches: "Novi mečevi",
      messages: "Poruke",
      noMessagesYet: "Još nema poruka",
      noMessagesYetSubtitle:
        "Još nemaš poruke, zato idi na Mečeve i prevlači da upoznaš ljude na događaju.",
      noMessagesYetButton: "Idi na mečeve",
      chatExpiredTitle: "Razgovor istekao",
      chatExpiredDescription:
        "Ovaj razgovor je istekao i više mu nije moguće pristupiti.",
      sayHello: "Pozdravite se!",

      // Chat location gate
      chatLocationRequired: "Moraš biti na lokaciji događaja",
      chatLocationRequiredSubtitle:
        "Dok događaj traje, razgovori se otvaraju samo na lokaciji događaja. Kada stigneš, dozvoli pristup lokaciji i dodirni dugme za lokaciju ispod.",
      back: "Nazad",

      // Event details
      guestList: "Lista gostiju",
      buyTicket: "Kupi kartu",
      attending: "Prisustvuje",

      // Filters / Calendar
      apply: "Primeni",
      reset: "Resetuj",
      dateRange: "Opseg datuma",
      filters: "Filteri",
      filterVenueType: "Tip lokala",
      selectVenueType: "Izaberi tip lokala",
      capacity: "Kapacitet",
      min: "Min",
      max: "Maks",
      onlyFavorites: "Samo omiljeni",

      // Chat / Messaging
      atVenue: "u {{venue}}",
      typeAMessage: "Napiši poruku...",

      // Find modal
      findYourMatch: "Pronađi svog meča",
      pairCode: "Kod para",
      pairCodeDescription:
        "Pokaži ovaj emoji nekome u blizini da se odmah uparite. Vaš kod para pomaže potvrđivanju veze.",

      // Guest list modal
      freeSpaces: "Slobodna mesta",
      spotsLeft: "{{count}} mesta preostalo",
      eventIsFull: "Događaj je popunjen",
      avgAge: "Prosečne godine",
      attend: "Prisustvuj",
      you: "Ti",

      // Swipe card
      like: "SVIĐA MI SE",
      pass: "PRESKOČITI",

      // Discover card
      going: "ide",
      beTheFirst: "Budi prvi",

      // Not found / Error screens
      screenNotFound: "Ovaj ekran ne postoji.",
      goToHome: "Idi na početni ekran!",
      serverUnreachable:
        "Nije moguće dosegnuti server. Proveri da API radi i da je EXPO_PUBLIC_API_URL ispravno podešen.",
      retry: "Pokušaj ponovo",

      // Match modal
      itsAMatch: "Meč!",
      youAndLikedEachOther: "Ti i {{name}} ste se svideli jedno drugom",
      saySomethingNice: "Reci nešto lepo...",
      matchMessageFailed: "Poruka nije poslata. Pokušaj ponovo.",

      // Map / Search
      searchEvents: "Traži događaje...",
      noEventsMatchSearch: "Nijedan događaj ne odgovara tvojoj pretrazi.",
      openInMaps: "Otvori u mapama",

      // Profile info sections
      photos: "Fotografije",
      interests: "Interesovanja",
      addInterests: "Dodaj interesovanja…",
      workAndEducation: "Posao i obrazovanje",
      select: "Izaberi…",
      tellOthersAboutYourself: "Reci drugima o sebi…",
      profileVisibilityNote:
        "Gosti sa kojima imaš meč vide ceo tvoj profil. Pre toga gosti na istom događaju vide tvoje fotografije, ime, godine, interesovanja i biografiju, a gosti koji idu na njega vide tvoje ime, godine i fotografiju na listi gostiju. Ispod biraš ko može da te vidi. Da nekoga blokiraš ili prijaviš, dodirni ⋯ na njegovom profilu ili u razgovoru.",
      height: "Visina",
      relationship: "Veza",

      // Profile option values — looking for
      toDate: "za zabavu",
      toParty: "da se zabavljam",
      openToChat: "otvoren za razgovor",
      readyForRelationship: "spreman za vezu",

      // Lifestyle options
      never: "nikad",
      socially: "u društvu",
      regularly: "redovno",
      preferNotToSay: "ne želim da kažem",

      // Yes / No
      no: "ne",
      yes: "da",

      // Relationship status options
      single: "slobodan/na",
      divorced: "razveden/a",
      separated: "u razdvajanju",

      // Sexuality options
      straight: "heteroseksualac",
      gay: "gej",
      bisexual: "biseksualac",

      // Star signs
      aries: "Ovan",
      taurus: "Bik",
      gemini: "Blizanci",
      cancer: "Rak",
      leo: "Lav",
      virgo: "Devica",
      libra: "Vaga",
      scorpio: "Škorpija",
      sagittarius: "Strelac",
      capricorn: "Jarac",
      aquarius: "Vodolija",
      pisces: "Ribe",

      // Religion options
      atheist: "ateista",
      agnostic: "agnostik",
      christian: "hrišćanin",
      muslim: "musliman",
      jewish: "jevrejin",
      buddhist: "budista",
      hindu: "hinduista",
      other: "drugo",

      // Pet options
      cat: "mačka",
      dog: "pas",
      fish: "riba",
      bird: "ptica",
      none: "nema",

      // Additional spoken languages
      spanish: "Španski",
      french: "Francuski",
      german: "Nemački",

      // Interest tags
      photography: "Fotografija",
      travel: "Putovanja",
      yoga: "Joga",
      music: "Muzika",
      coffee: "Kafa",
      art: "Umetnost",
      dancing: "Ples",
      hiking: "Planinarenje",
      food: "Hrana",
      tech: "Tehnologija",
      fitness: "Fitnes",
      reading: "Čitanje",
      movies: "Filmovi",
      gaming: "Gaming",
      fashion: "Moda",

      // Venue type options
      bar: "Bar",
      club: "Klub",
      restaurant: "Restoran",
      tavern: "Kafana",
      cafe: "Kafić",
      eventVenue: "Prostor za događaje",

      // Filter / map
      all: "Sve",

      // Tickets sections
      liveNow: "Uživo",
      startingSoon: "Uskoro počinje",
      upcoming: "Predstojeće",

      // Attend / event actions
      cancelAttendance: "Otkaži prisustvo",
      noEventSelected: "Nije izabran događaj",
      goingLabel: "Ide",
      full: "Popunjeno",

      // Reservation modal
      reservationRequired: "Rezervacija je potrebna",
      reservationDescription:
        "Ovaj lokal zahteva rezervaciju putem {{methods}}. Kontaktirajte ih prvo, a zatim potvrdite ispod.",
      madeReservationAttend: "Napravio/la sam rezervaciju — Prisustvuj",
      contactVenueFirst: "Najpre kontaktirajte lokal",
      call: "Pozovi",
      sms: "SMS",
      viber: "Viber",
      whatsapp: "WhatsApp",
      instagramDm: "Instagram poruka",
      // Sharing
      share: "Podeli",
      linkCopied: "Link kopiran",
      linkShared: "Link podeljen",
      // Guest safety: block, report and who can see me (TASK-001)
      whoCanSeeMe: "Ko može da me vidi",
      visibilityEveryone: "Svi koji idu",
      visibilityEveryoneDescription:
        "Gosti koji idu na isti događaj vide te na listi gostiju i u Mečevima.",
      visibilityLiked: "Samo oni koji mi se sviđaju",
      visibilityLikedDescription:
        "Gosti te vide tek kada ih lajkuješ na tom događaju. I dalje možeš da pregledaš profile i lajkuješ.",
      visibilityHidden: "Skriveno",
      visibilityHiddenDescription:
        "Niko te ne vidi na listama gostiju ni u Mečevima, a Mečevi su ti pauzirani. Tvoji mečevi i razgovori ostaju otvoreni.",
      visibilitySaved: "Sačuvano: {{option}}",
      reportOrBlock: "Prijavi ili blokiraj",
      reportAction: "Prijavi",
      reportActionHint: "Reci nam šta se desilo. Osoba će biti i blokirana.",
      blockActionHint: "Više se nećete videti.",
      safetySheetNote: "{{name}} neće dobiti obaveštenje.",
      block: "Blokiraj",
      blockConfirmTitle: "Blokiranje: {{name}}",
      blockConfirmDescription:
        "Nećete se videti u Mečevima, na listama gostiju ni u Porukama, a vaš razgovor se zatvara. {{name}} neće dobiti obaveštenje. Ovo ne može da se poništi.",
      guestBlocked: "Blokirano: {{name}}.",
      blockFailed: "Blokiranje nije uspelo. Pokušaj ponovo.",
      reportTitle: "Prijava: {{name}}",
      reportDescription:
        "Tim Tuluma pregleda svaku prijavu. Kada je pošalješ, ta osoba je blokirana i neće znati ko ju je prijavio.",
      reportReasonHarassment: "Uznemiravanje ili pretnje",
      reportReasonInappropriate: "Neprikladne fotografije ili poruke",
      reportReasonFakeProfile: "Lažan profil ili prevara",
      reportReasonSpam: "Spam ili prodaja",
      reportReasonUnderage: "Možda nema 18 godina",
      reportReasonUnsafeMeeting: "Nebezbedno ponašanje uživo",
      reportReasonOther: "Nešto drugo",
      reportDetailsPlaceholder: "Dodaj detalje (nije obavezno)",
      reportDetailsRequired: "Šta se desilo?",
      reportSend: "Prijavi i blokiraj",
      reportSent: "Hvala na prijavi. Blokirano: {{name}}.",
      reportNotSent: "Prijava nije poslata. Pokušaj ponovo.",
      guestUnavailable: "Ovaj gost više nije dostupan.",
      chatUnavailable: "Ovaj razgovor više nije dostupan.",
      matchesHiddenTitle: "Tvoj profil je skriven",
      matchesHiddenSubtitle:
        "Gosti na ovom događaju te ne vide, a Mečevi su ti pauzirani. Ko može da te vidi menjaš na svom Profilu.",
      matchesHiddenButton: "Idi na Profil",
      guestListAttendToSee:
        "Samo gosti koji idu na ovaj događaj vide ko još ide. Prisustvuj da vidiš listu gostiju.",
      guestListNotShown: "Takođe idu, nisu prikazani: {{count}}",
    },
  },

  RU: {
    translation: {
      // Tabs
      profile: "Профиль",
      settings: "Настройки",

      // Settings rows
      theme: "Тема",
      notifications: "Уведомления",
      language: "Язык",
      location: "Местоположение",
      defaultVenueType: "Тип заведения по умолчанию",
      reportBug: "Сообщить об ошибке",
      notSet: "Не задано",
      on: "Вкл",
      off: "Выкл",

      // Theme options
      light: "Светлая",
      dark: "Тёмная",
      system: "Системная",

      // Language names
      english: "Английский",
      serbian: "Сербский",
      russian: "Русский",

      // Auth actions
      logOut: "Выйти",
      deleteAccount: "Удалить аккаунт",

      // Auth screens
      authMeetPeopleTagline: "Знакомьтесь с людьми на событиях рядом с вами",
      authSignInTitle: "Войдите, чтобы продолжить",
      authSignInSubtitle: "Выберите, как хотите присоединиться",
      authContinueWithApple: "Продолжить через Apple",
      authContinueWithGoogle: "Продолжить через Google",
      authTermsPrefix: "Продолжая, вы соглашаетесь с нашими",
      authTermsOfService: "Условиями использования",
      authTermsAnd: "и",
      authPrivacyPolicy: "Политикой конфиденциальности",
      authSsoSignInFailed: "SSO вход не удался.",
      authEnterEmailOrUsername: "Введите email или имя пользователя.",
      authSignInLoading: "Вход все еще загружается. Попробуйте снова.",
      authContinueVerification:
        "Продолжите следующий шаг проверки, чтобы завершить вход.",
      authContinueSignInFailed: "Не удалось продолжить вход.",
      authEnterOtp: "Введите одноразовый код, отправленный на email.",
      authSecondFactorRequired: "Требуется второй шаг проверки.",
      authInvalidCode: "Неверный код. Попробуйте снова.",
      authVerifyCodeFailed: "Не удалось подтвердить код.",

      // Onboarding
      onboardingStepNameTitle: "Как вас зовут?",
      onboardingStepNameSubtitle: "Так вас будут видеть другие",
      onboardingStepBirthdayTitle: "Когда вы родились?",
      onboardingStepBirthdaySubtitle: "Ваш возраст будет виден в профиле",
      onboardingStepGenderTitle: "Как вы себя идентифицируете?",
      onboardingStepGenderSubtitle:
        "Это поможет показывать вам подходящих людей",
      onboardingStepInterestedTitle: "Кто вам интересен?",
      onboardingStepInterestedSubtitle:
        "Мы подберем совпадения под ваши предпочтения",
      onboardingStepLookingForTitle: "Зачем вы здесь?",
      onboardingStepLookingForSubtitle:
        "Выберите один вариант, который лучше всего описывает, зачем вы здесь.",
      onboardingStepTagsTitle: "Какие у вас интересы?",
      onboardingStepTagsSubtitle:
        "Выберите то, что вам нравится, чтобы найти свою компанию",
      onboardingStepVenuesTitle: "Какие места вам нравятся?",
      onboardingStepVenuesSubtitle:
        "Мы покажем события, которые вам действительно понравятся",
      onboardingStepPhotoTitle: "Добавьте фото профиля",
      onboardingStepPhotoSubtitle: "Фото помогает другим вас узнать",
      onboardingStepBioTitle: "Расскажите о себе",
      onboardingStepBioSubtitle: "Короткое описание многое скажет",
      onboardingGenderMan: "Мужчина",
      onboardingGenderWoman: "Женщина",
      onboardingGenderOther: "Другое",
      onboardingInterestedMen: "Мужчины",
      onboardingInterestedWomen: "Женщины",
      onboardingInterestedEveryone: "Все",
      onboardingSeekingCasual: "Неформально",
      onboardingSeekingRelationship: "Отношения",
      onboardingSeekingFriendship: "Дружба",
      onboardingSeekingParty: "Вечеринка",
      onboardingFirstNamePlaceholder: "Имя",
      onboardingBirthdayPlaceholder: "ДД / ММ / ГГГГ",
      onboardingBirthdayFormat: "Формат: ДД / ММ / ГГГГ",
      onboardingPermissionRequired: "Требуется разрешение",
      onboardingPhotoPermissionMessage: "Разрешите доступ к вашей фотогалерее.",
      onboardingUploadFailed: "Не удалось загрузить",
      onboardingRemoveFailed: "Не удалось удалить",
      onboardingAddPhoto: "Добавить фото",
      onboardingAddUpToPhotos: "Добавьте до 3 фото",
      onboardingPhotosAdded: "Добавлено фото: {{count}}/3",
      onboardingMissingRequiredFields: "Не заполнены обязательные поля",
      onboardingAuthError: "Ошибка аутентификации. Войдите снова.",
      onboardingSaveFailed: "Не удалось сохранить",
      onboardingSubmitError:
        "Не удалось сохранить ваш профиль. Попробуйте ещё раз.",
      onboardingBioPlaceholder: "Расскажите немного о себе...",
      onboardingContinue: "Продолжить",
      onboardingCompleteProfile: "Завершить профиль",

      // Delete alert
      deleteAlertTitle: "Удалить аккаунт",
      deleteAlertDescription:
        "Это действие нельзя отменить. Все ваши данные будут удалены навсегда.",
      cancel: "Отмена",
      confirm: "Подтвердить",
      deletingAccount: "Удаление...",
      accountDeleted: "Ваш аккаунт удалён.",
      deleteAccountFailed: "Аккаунт не удалён",
      deleteAccountTryAgain: "Ваш аккаунт всё ещё активен. Попробуйте ещё раз.",
      deleteAccountHostsVenues:
        "Этот аккаунт управляет заведениями. Передайте их другому организатору, прежде чем удалять аккаунт.",

      // Bug report
      bugReportPlaceholder: "Опишите ошибку...",
      bugReportSent: "Спасибо! Сообщение об ошибке отправлено.",
      bugReportNotSent: "Сообщение не отправлено. Попробуйте ещё раз.",
      send: "Отправить",
      suggestVenue: "Предложить заведение",
      venueNamePlaceholder: "Название заведения",
      instagramHandlePlaceholder: "Аккаунт в Instagram (без @)",
      additionalInfoPlaceholder: "Дополнительная информация (необязательно)",
      nameRequired: "Требуется имя",
      pleaseProvideVenueName: "Пожалуйста, укажите название заведения",
      venueSuggestionSent: "Спасибо! Предложение заведения отправлено.",
      venueSuggestionNotSent: "Предложение не отправлено. Попробуйте ещё раз.",
      sendFailed: "Не удалось отправить",
      saveFailed: "Не удалось сохранить",
      profileChangeNotSaved: "Изменение не сохранено. Попробуйте ещё раз.",

      // Profile photos
      permissionRequired: "Требуется разрешение",
      photoLibraryPermissionDescription:
        "Разрешите доступ к вашей фотогалерее.",
      uploadFailed: "Не удалось загрузить",
      removeFailed: "Не удалось удалить",

      // Profile edit labels
      tags: "Теги",
      work: "Работа",
      education: "Образование",
      whyYoureHere: "Зачем вы здесь",
      bio: "О себе",
      heightCm: "Рост (см)",
      children: "Дети",
      drinking: "Алкоголь",
      languages: "Языки",
      relationshipStatus: "Семейное положение",
      sexuality: "Сексуальность",
      smoking: "Курение",
      starSign: "Знак зодиака",
      pets: "Питомцы",
      religion: "Религия",

      // Tickets
      noTicketsTitle: "Пока нет билетов на предстоящие события",
      noTicketsSubtitle:
        "У вас нет билетов на ближайшие события, поэтому перейдите на карту и найдите доступные мероприятия рядом.",
      goToMap: "Перейти к карте",

      // Matches
      noMatchesTitle: "Нет свайпов!",
      noMatchesSubtitle: "Вернитесь после посещения мероприятия.",
      matchesLocked: "Матчи заблокированы",
      matchesLockedSubtitle:
        "Матчи открываются только во время активного события с действительным билетом, поэтому проверьте билеты ниже.",
      matchesUnlockButton: "Перейти к билетам",
      matchesAlmostThere: "Почти на месте!",
      matchesArriveAtVenue:
        "Свайпы доступны только на площадке мероприятия. Когда вы прибудете, нажмите кнопку геолокации ниже, чтобы подтвердить своё местоположение и начать знакомиться.",
      matchesCheckLocation: "Проверить мою геолокацию",
      callYandexTaxi: "Вызвать Яндекс.Такси",
      matchesYourLocation: "Ваше местоположение",
      matchesEventVenue: "Место проведения",
      matchesRetrySoon: "Попробуйте ещё раз чуть позже.",

      // Inbox
      newMatches: "Новые совпадения",
      messages: "Сообщения",
      noMessagesYet: "Сообщений пока нет",
      noMessagesYetSubtitle:
        "Сообщений пока нет, поэтому перейдите в Matches и свайпайте людей на вашем мероприятии.",
      noMessagesYetButton: "Перейти к матчам",
      chatExpiredTitle: "Чат истёк",
      chatExpiredDescription: "Этот разговор истёк и больше недоступен.",
      sayHello: "Поздоровайтесь!",

      // Chat location gate
      chatLocationRequired: "Нужно быть на площадке мероприятия",
      chatLocationRequiredSubtitle:
        "Пока идёт мероприятие, чат доступен только на площадке. Когда будете на месте, разрешите доступ к местоположению и нажмите кнопку геолокации ниже.",
      back: "Назад",

      // Event details
      guestList: "Список гостей",
      buyTicket: "Купить билет",
      attending: "Посещает",

      // Filters / Calendar
      apply: "Применить",
      reset: "Сбросить",
      dateRange: "Диапазон дат",
      filters: "Фильтры",
      filterVenueType: "Тип заведения",
      selectVenueType: "Выберите тип заведения",
      capacity: "Вместимость",
      min: "Мин",
      max: "Макс",
      onlyFavorites: "Только избранные",

      // Chat / Messaging
      atVenue: "в {{venue}}",
      typeAMessage: "Введите сообщение...",

      // Find modal
      findYourMatch: "Найти свой матч",
      pairCode: "Код пары",
      pairCodeDescription:
        "Покажите этот эмодзи кому-то рядом для мгновенного совпадения. Код пары подтверждает связь.",

      // Guest list modal
      freeSpaces: "Свободные места",
      spotsLeft: "{{count}} мест осталось",
      eventIsFull: "Мероприятие заполнено",
      avgAge: "Средний возраст",
      attend: "Посетить",
      you: "Вы",

      // Swipe card
      like: "НРАВИТСЯ",
      pass: "ПРОПУСТИТЬ",

      // Discover card
      going: "идут",
      beTheFirst: "Будь первым",

      // Not found / Error screens
      screenNotFound: "Этот экран не существует.",
      goToHome: "Перейти на главный экран!",
      serverUnreachable:
        "Не удалось достичь сервера. Убедитесь, что API запущен и EXPO_PUBLIC_API_URL настроен правильно.",
      retry: "Повторить",

      // Match modal
      itsAMatch: "Это матч!",
      youAndLikedEachOther: "Вы и {{name}} понравились друг другу",
      saySomethingNice: "Скажите что-нибудь приятное...",
      matchMessageFailed: "Не удалось отправить сообщение. Попробуйте ещё раз.",

      // Map / Search
      searchEvents: "Поиск мероприятий...",
      noEventsMatchSearch: "Ни одно событие не соответствует вашему запросу.",
      openInMaps: "Открыть в картах",

      // Profile info sections
      photos: "Фотографии",
      interests: "Интересы",
      addInterests: "Добавить интересы…",
      workAndEducation: "Работа и образование",
      select: "Выберите…",
      tellOthersAboutYourself: "Расскажите о себе…",
      profileVisibilityNote:
        "Гости, с которыми у вас матч, видят весь ваш профиль. До этого гости того же события видят ваши фото, имя, возраст, интересы и раздел «О себе», а те, кто туда идёт, — ваше имя, возраст и фото в списке гостей. Ниже выберите, кто может вас видеть. Чтобы заблокировать кого-то или пожаловаться, нажмите ⋯ в его профиле или в чате.",
      height: "Рост",
      relationship: "Отношения",

      // Profile option values — looking for
      toDate: "для свиданий",
      toParty: "для вечеринок",
      openToChat: "открыт к общению",
      readyForRelationship: "готов к отношениям",

      // Lifestyle options
      never: "никогда",
      socially: "в компании",
      regularly: "регулярно",
      preferNotToSay: "предпочитаю не говорить",

      // Yes / No
      no: "нет",
      yes: "да",

      // Relationship status options
      single: "одинок(а)",
      divorced: "разведён(а)",
      separated: "в разлуке",

      // Sexuality options
      straight: "гетеросексуал",
      gay: "гей",
      bisexual: "бисексуал",

      // Star signs
      aries: "Овен",
      taurus: "Телец",
      gemini: "Близнецы",
      cancer: "Рак",
      leo: "Лев",
      virgo: "Дева",
      libra: "Весы",
      scorpio: "Скорпион",
      sagittarius: "Стрелец",
      capricorn: "Козерог",
      aquarius: "Водолей",
      pisces: "Рыбы",

      // Religion options
      atheist: "атеист",
      agnostic: "агностик",
      christian: "христианин",
      muslim: "мусульманин",
      jewish: "иудей",
      buddhist: "буддист",
      hindu: "индуист",
      other: "другое",

      // Pet options
      cat: "кошка",
      dog: "собака",
      fish: "рыбка",
      bird: "птица",
      none: "нет",

      // Additional spoken languages
      spanish: "Испанский",
      french: "Французский",
      german: "Немецкий",

      // Interest tags
      photography: "Фотография",
      travel: "Путешествия",
      yoga: "Йога",
      music: "Музыка",
      coffee: "Кофе",
      art: "Искусство",
      dancing: "Танцы",
      hiking: "Туризм",
      food: "Еда",
      tech: "Технологии",
      fitness: "Фитнес",
      reading: "Чтение",
      movies: "Фильмы",
      gaming: "Игры",
      fashion: "Мода",

      // Venue type options
      bar: "Бар",
      club: "Клуб",
      restaurant: "Ресторан",
      tavern: "Таверна",
      cafe: "Кафе",
      eventVenue: "Площадка для мероприятий",

      // Filter / map
      all: "Все",

      // Tickets sections
      liveNow: "Сейчас идёт",
      startingSoon: "Скоро начнётся",
      upcoming: "Предстоящие",

      // Attend / event actions
      cancelAttendance: "Отменить посещение",
      noEventSelected: "Мероприятие не выбрано",
      goingLabel: "Идут",
      full: "Заполнено",

      // Reservation modal
      reservationRequired: "Требуется бронирование",
      reservationDescription:
        "Это заведение требует бронирования через {{methods}}. Сначала свяжитесь с ними, затем подтвердите ниже.",
      madeReservationAttend: "Я сделал(а) бронирование — Посетить",
      contactVenueFirst: "Сначала свяжитесь с заведением",
      call: "Позвонить",
      sms: "СМС",
      viber: "Viber",
      whatsapp: "WhatsApp",
      instagramDm: "Instagram DM",
      // Sharing
      share: "Поделиться",
      linkCopied: "Ссылка скопирована",
      linkShared: "Ссылка отправлена",
      // Guest safety: block, report and who can see me (TASK-001)
      whoCanSeeMe: "Кто может меня видеть",
      visibilityEveryone: "Все, кто идёт",
      visibilityEveryoneDescription:
        "Гости того же события видят вас в списке гостей и в Матчах.",
      visibilityLiked: "Только те, кто мне нравится",
      visibilityLikedDescription:
        "Гости увидят вас, только когда вы поставите им лайк на этом событии. Смотреть профили и ставить лайки можно как раньше.",
      visibilityHidden: "Скрыто",
      visibilityHiddenDescription:
        "Никто не видит вас в списках гостей и в Матчах, а Матчи для вас на паузе. Ваши матчи и чаты остаются открытыми.",
      visibilitySaved: "Сохранено: {{option}}",
      reportOrBlock: "Пожаловаться или заблокировать",
      reportAction: "Пожаловаться",
      reportActionHint:
        "Расскажите, что случилось. Человек тоже будет заблокирован.",
      blockActionHint: "Вы больше не увидите друг друга.",
      safetySheetNote: "{{name}} не получит уведомления.",
      block: "Заблокировать",
      blockConfirmTitle: "Блокировка: {{name}}",
      blockConfirmDescription:
        "Вы больше не увидите друг друга в Матчах, списках гостей и Сообщениях, а ваш чат закроется. {{name}} не получит уведомления. Это действие нельзя отменить.",
      guestBlocked: "Заблокировано: {{name}}.",
      blockFailed: "Не удалось заблокировать. Попробуйте ещё раз.",
      reportTitle: "Жалоба: {{name}}",
      reportDescription:
        "Команда Tulum рассматривает каждую жалобу. После отправки этот человек будет заблокирован и не узнает, кто на него пожаловался.",
      reportReasonHarassment: "Домогательства или угрозы",
      reportReasonInappropriate: "Неприемлемые фото или сообщения",
      reportReasonFakeProfile: "Фейковый профиль или мошенничество",
      reportReasonSpam: "Спам или реклама",
      reportReasonUnderage: "Возможно, младше 18 лет",
      reportReasonUnsafeMeeting: "Небезопасное поведение при встрече",
      reportReasonOther: "Другое",
      reportDetailsPlaceholder: "Добавьте подробности (необязательно)",
      reportDetailsRequired: "Что произошло?",
      reportSend: "Пожаловаться и заблокировать",
      reportSent: "Спасибо за жалобу. Заблокировано: {{name}}.",
      reportNotSent: "Жалоба не отправлена. Попробуйте ещё раз.",
      guestUnavailable: "Этот гость больше недоступен.",
      chatUnavailable: "Этот чат больше недоступен.",
      matchesHiddenTitle: "Ваш профиль скрыт",
      matchesHiddenSubtitle:
        "Гости этого события вас не видят, а Матчи для вас на паузе. Изменить, кто вас видит, можно в Профиле.",
      matchesHiddenButton: "Открыть профиль",
      guestListAttendToSee:
        "Только гости, которые идут на это событие, видят, кто ещё идёт. Нажмите «Посетить», чтобы увидеть список гостей.",
      guestListNotShown: "Тоже идут, но не показаны: {{count}}",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "EN",
  fallbackLng: "EN",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
