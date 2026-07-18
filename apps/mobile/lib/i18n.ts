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
      authSocialAutoSignInFailed:
        "We could not complete social sign in automatically. Continue with email or try sign up.",
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
      onboardingStepLookingForSubtitle: "Select everything that applies",
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
      onboardingBioPlaceholder: "Tell others a little about yourself...",
      onboardingContinue: "Continue",
      onboardingCompleteProfile: "Complete Profile",

      // Delete alert
      deleteAlertTitle: "Delete account",
      deleteAlertDescription:
        "This action cannot be undone. All your data will be permanently deleted.",
      cancel: "Cancel",
      confirm: "Confirm",

      // Bug report
      bugReportPlaceholder: "Describe the bug...",
      send: "Send",
      suggestVenue: "Suggest a venue",
      venueNamePlaceholder: "Venue name",
      instagramHandlePlaceholder: "Instagram handle (without @)",
      additionalInfoPlaceholder: "Additional info (optional)",
      nameRequired: "Name required",
      pleaseProvideVenueName: "Please provide a venue name",
      sendFailed: "Failed to send",

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
      matchesAlmostThere: "Almost there! 📍",
      matchesArriveAtVenue:
        "Arrive at the event venue to unlock matching. Once you're within range, swiping will be enabled automatically.",
      matchesCheckLocation: "Check my location",
      matchesYourLocation: "Your location",
      matchesEventVenue: "Event venue",

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

      // Map / Search
      searchEvents: "Search events...",
      openInMaps: "Open in Maps",

      // Profile info sections
      photos: "Photos",
      interests: "Interests",
      addInterests: "Add interests…",
      workAndEducation: "Work & Education",
      select: "Select…",
      tellOthersAboutYourself: "Tell others about yourself…",
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
      pub: "Pub",
      nightclub: "Nightclub",
      restaurant: "Restaurant",
      cafe: "Cafe",
      cocktailBar: "Cocktail Bar",
      wineBar: "Wine Bar",
      brewery: "Brewery",
      tavern: "Tavern",
      raft: "Raft",

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
      authSocialAutoSignInFailed:
        "Nismo mogli automatski da završimo prijavu preko društvene mreže. Nastavi e-poštom ili pokušaj registraciju.",
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
      onboardingStepLookingForSubtitle: "Izaberi sve što se odnosi na tebe",
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
      onboardingBioPlaceholder: "Reci drugima nešto o sebi...",
      onboardingContinue: "Nastavi",
      onboardingCompleteProfile: "Završi profil",

      // Delete alert
      deleteAlertTitle: "Obriši nalog",
      deleteAlertDescription:
        "Ova radnja se ne može poništiti. Svi vaši podaci će biti trajno obrisani.",
      cancel: "Otkaži",
      confirm: "Potvrdi",

      // Bug report
      bugReportPlaceholder: "Opiši grešku...",
      send: "Pošalji",
      suggestVenue: "Predloži lokal",
      venueNamePlaceholder: "Naziv lokala",
      instagramHandlePlaceholder: "Instagram nalog (bez @)",
      additionalInfoPlaceholder: "Dodatne informacije (opciono)",
      nameRequired: "Ime je obavezno",
      pleaseProvideVenueName: "Molimo unesite naziv lokala",
      sendFailed: "Slanje nije uspelo",

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
      matchesAlmostThere: "Skoro si tu! 📍",
      matchesArriveAtVenue:
        "Stigi do mesta događaja da otključaš mečeve. Čim budeš u blizini, prevlačenje će biti automatski omogućeno.",
      matchesCheckLocation: "Proveri moju lokaciju",
      matchesYourLocation: "Tvoja lokacija",
      matchesEventVenue: "Mesto događaja",

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

      // Map / Search
      searchEvents: "Traži događaje...",
      openInMaps: "Otvori u mapama",

      // Profile info sections
      photos: "Fotografije",
      interests: "Interesovanja",
      addInterests: "Dodaj interesovanja…",
      workAndEducation: "Posao i obrazovanje",
      select: "Izaberi…",
      tellOthersAboutYourself: "Reci drugima o sebi…",
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
      pub: "Kafana",
      nightclub: "Noćni klub",
      restaurant: "Restoran",
      cafe: "Kafić",
      cocktailBar: "Koktel bar",
      wineBar: "Vinski bar",
      brewery: "Pivara",
      tavern: "Kafana",
      raft: "Splav",

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
      authSocialAutoSignInFailed:
        "Не удалось автоматически завершить вход через соцсеть. Продолжите через email или попробуйте регистрацию.",
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
      onboardingStepLookingForSubtitle: "Выберите все подходящие варианты",
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
      onboardingBioPlaceholder: "Расскажите немного о себе...",
      onboardingContinue: "Продолжить",
      onboardingCompleteProfile: "Завершить профиль",

      // Delete alert
      deleteAlertTitle: "Удалить аккаунт",
      deleteAlertDescription:
        "Это действие нельзя отменить. Все ваши данные будут удалены навсегда.",
      cancel: "Отмена",
      confirm: "Подтвердить",

      // Bug report
      bugReportPlaceholder: "Опишите ошибку...",
      send: "Отправить",
      suggestVenue: "Предложить заведение",
      venueNamePlaceholder: "Название заведения",
      instagramHandlePlaceholder: "Аккаунт в Instagram (без @)",
      additionalInfoPlaceholder: "Дополнительная информация (необязательно)",
      nameRequired: "Требуется имя",
      pleaseProvideVenueName: "Пожалуйста, укажите название заведения",
      sendFailed: "Не удалось отправить",

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
      matchesAlmostThere: "Почти на месте! 📍",
      matchesArriveAtVenue:
        "Приходите на место проведения мероприятия, чтобы разблокировать знакомства. Как только вы окажетесь в радиусе, свайпы включатся автоматически.",
      matchesCheckLocation: "Проверить мою геолокацию",
      matchesYourLocation: "Ваше местоположение",
      matchesEventVenue: "Место проведения",

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

      // Map / Search
      searchEvents: "Поиск мероприятий...",
      openInMaps: "Открыть в картах",

      // Profile info sections
      photos: "Фотографии",
      interests: "Интересы",
      addInterests: "Добавить интересы…",
      workAndEducation: "Работа и образование",
      select: "Выберите…",
      tellOthersAboutYourself: "Расскажите о себе…",
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
      pub: "Паб",
      nightclub: "Ночной клуб",
      restaurant: "Ресторан",
      cafe: "Кафе",
      cocktailBar: "Коктейль-бар",
      wineBar: "Винный бар",
      brewery: "Пивоварня",
      tavern: "Таверна",
      raft: "Плот",

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
