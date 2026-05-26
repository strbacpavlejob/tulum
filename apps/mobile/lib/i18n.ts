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

      // Delete alert
      deleteAlertTitle: "Delete account",
      deleteAlertDescription:
        "This action cannot be undone. All your data will be permanently deleted.",
      cancel: "Cancel",
      confirm: "Confirm",

      // Bug report
      bugReportPlaceholder: "Describe the bug...",
      send: "Send",

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
      noTicketsTitle: "Gosh darn!",
      noTicketsSubtitle: "No tickets available at the moment!",

      // Matches
      noMatchesTitle: "No swipes yet!",
      noMatchesSubtitle: "Check back after attending an event.",

      // Inbox
      newMatches: "New Matches",
      messages: "Messages",
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

      // Delete alert
      deleteAlertTitle: "Obriši nalog",
      deleteAlertDescription:
        "Ova radnja se ne može poništiti. Svi vaši podaci će biti trajno obrisani.",
      cancel: "Otkaži",
      confirm: "Potvrdi",

      // Bug report
      bugReportPlaceholder: "Opiši grešku...",
      send: "Pošalji",

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
      noTicketsTitle: "Jao!",
      noTicketsSubtitle: "Nema dostupnih karata trenutno!",

      // Matches
      noMatchesTitle: "Nema mečeva!",
      noMatchesSubtitle: "Proveri ponovo posle prisustvovanja događaju.",

      // Inbox
      newMatches: "Novi mečevi",
      messages: "Poruke",
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
      tavern: "Taverna",
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

      // Delete alert
      deleteAlertTitle: "Удалить аккаунт",
      deleteAlertDescription:
        "Это действие нельзя отменить. Все ваши данные будут удалены навсегда.",
      cancel: "Отмена",
      confirm: "Подтвердить",

      // Bug report
      bugReportPlaceholder: "Опишите ошибку...",
      send: "Отправить",

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
      noTicketsTitle: "Ой-ой!",
      noTicketsSubtitle: "Билеты пока недоступны!",

      // Matches
      noMatchesTitle: "Нет свайпов!",
      noMatchesSubtitle: "Вернитесь после посещения мероприятия.",

      // Inbox
      newMatches: "Новые совпадения",
      messages: "Сообщения",
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
