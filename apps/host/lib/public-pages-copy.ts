export type PublicPageId = "terms" | "privacy" | "support";
export type PublicPageSection = { title: string; body: string };
export type PublicPageCopy = {
  title: string;
  intro: string;
  updated?: string;
  sections: PublicPageSection[];
  contactTitle: string;
  contactBody: string;
};

type Locale = "en" | "sr" | "ru";

const publicPages: Record<Locale, Record<PublicPageId, PublicPageCopy>> = {
  en: {
    terms: {
      title: "Terms of Service",
      intro:
        "These Terms apply to the Tulum mobile app, website, and related tools. By creating an account or using Tulum, you agree to these Terms. If you do not agree, do not use the service.",
      updated: "Last updated: October 21, 2026",
      sections: [
        {
          title: "Eligibility and accounts",
          body:
            "Tulum is for adults aged 18 or older. You must provide accurate profile information and keep access to your account secure. Sign-in may be provided through third-party identity services.",
        },
        {
          title: "What Tulum provides",
          body:
            "Tulum helps guests discover events, manage attendance, and connect with other guests through profile, matching, and chat features. Venues and event teams may use Tulum tools to manage venue and event information.",
        },
        {
          title: "Events and in-person interactions",
          body:
            "Event details may be supplied by venues, organizers, users, or other sources and can change. Check important details with the organizer before attending. Unless an event page says otherwise, Tulum is not the event organizer and does not control events or the conduct of attendees. Use your own judgment when meeting people or attending events.",
        },
        {
          title: "Community standards",
          body:
            "Do not use Tulum to harass, threaten, deceive, impersonate, spam, or harm others, or to break the law. Only upload content you have the right to share. We may remove content or limit access when reasonably necessary to protect people, comply with law, or maintain the service.",
        },
        {
          title: "Your content",
          body:
            "You keep ownership of content you submit. You give Tulum permission to store, display, format, and otherwise use that content only as needed to provide, maintain, and protect the service. This permission ends when you remove the content, except for copies retained in backups or where retention is needed for legal, safety, or security reasons.",
        },
        {
          title: "Location and third-party services",
          body:
            "Some features may ask for foreground location permission to check proximity to an event. You can decline or revoke that permission, though location-based features may then be unavailable. Tulum may also rely on third-party sign-in, mapping, hosting, and storage services, which are subject to their own terms.",
        },
        {
          title: "Availability and account restrictions",
          body:
            "We may change or discontinue features and may suspend or restrict accounts that violate these Terms or create a risk to users or the service. You can stop using Tulum at any time. To ask for help with your account, contact us using the details below.",
        },
        {
          title: "Disclaimers",
          body:
            "Tulum is provided as available. Event listings, availability, and user-provided information may be incomplete or inaccurate. To the extent permitted by law, we make no guarantee that the service will always be uninterrupted or error-free. Nothing in these Terms limits rights or liability that cannot lawfully be excluded.",
        },
      ],
      contactTitle: "Questions about these Terms?",
      contactBody:
        "Contact the Tulum team by email. Please do not include passwords or sign-in codes.",
    },
    privacy: {
      title: "Privacy Policy",
      intro:
        "This Policy explains how Tulum handles information when you use our mobile app, website, and venue tools. It covers information you provide, activity needed to run the service, and choices available to you.",
      updated: "Last updated: October 21, 2026",
      sections: [
        {
          title: "Information you provide",
          body:
            "This may include sign-in details made available by your identity provider, profile information such as your name, date of birth, gender, interests, preferences, bio and photos, and venue or event details entered by venue teams.",
        },
        {
          title: "Activity in Tulum",
          body:
            "To provide the service, we process activity such as event views, attendance or RSVP records, saved events, likes, matches, messages, profile settings, and support requests. Our systems may also create technical records needed to operate and secure the service.",
        },
        {
          title: "Location and device permissions",
          body:
            "If you grant foreground location permission and use a location-based feature, the app may access your device location to check whether you are near an event venue. You can manage or revoke this permission in your device settings; related features may not work without it.",
        },
        {
          title: "How information is used",
          body:
            "We use information to create and secure accounts, show events and profiles, support attendance and matching features, deliver chats, operate venue tools, respond to requests, troubleshoot problems, prevent abuse, and meet legal obligations.",
        },
        {
          title: "What other people can see",
          body:
            "Depending on the feature, other guests may see profile details such as your first name, age, photos, interests, or bio. Messages are available to participants in that conversation. Event and venue details may be shown to people using discovery features.",
        },
        {
          title: "Service providers and sharing",
          body:
            "We use service providers for authentication, cloud infrastructure and databases, image storage, and map or place features. Apple or Google may process information when you choose their sign-in option. We may also disclose information when required by law or when reasonably needed to protect users, rights, or the service.",
        },
        {
          title: "Retention and requests",
          body:
            "We keep information for as long as it is needed to operate Tulum and for legitimate safety, security, and legal purposes. You may request access, correction, or deletion by emailing us. We may need to verify your identity and retain limited records where required by law or necessary to address disputes or abuse.",
        },
        {
          title: "Security and age",
          body:
            "We use measures intended to protect information, but no online service can guarantee absolute security. Tulum is intended for adults aged 18 or older and is not designed for children.",
        },
      ],
      contactTitle: "Privacy questions or requests",
      contactBody:
        "Contact the Tulum team to ask about your information or request a correction or deletion. Do not send passwords or verification codes.",
    },
    support: {
      title: "Support",
      intro:
        "The Tulum team can help with account access, profile questions, event information, technical problems, and privacy requests.",
      sections: [
        {
          title: "Contact support",
          body:
            "Use the email address below. Include a short description of the issue and the device and app version you are using. We do not publish a guaranteed response time, but will review your message.",
        },
        {
          title: "Account and privacy requests",
          body:
            "For account access or a request to access, correct, or delete information, write from the email associated with your account when possible. We may ask for additional information to verify that you control the account.",
        },
        {
          title: "Keep your account safe",
          body:
            "Never send your password, one-time sign-in code, session token, or payment credentials by email. If you attach a screenshot, remove private information that is not needed to explain the issue.",
        },
      ],
      contactTitle: "Email Tulum Support",
      contactBody:
        "For a faster review, use a clear subject such as “Account access”, “Privacy request”, or “Technical issue”.",
    },
  },
  sr: {
    terms: {
      title: "Uslovi korišćenja",
      intro:
        "Ovi uslovi važe za Tulum mobilnu aplikaciju, veb-sajt i povezane alate. Kreiranjem naloga ili korišćenjem Tulum usluge prihvataš ove uslove. Ako se ne slažeš, nemoj koristiti uslugu.",
      updated: "Poslednje ažuriranje: 21. oktobar 2026.",
      sections: [
        {
          title: "Uslovi za korišćenje i nalozi",
          body:
            "Tulum je namenjen osobama koje imaju najmanje 18 godina. Unesi tačne podatke profila i čuvaj pristup svom nalogu. Prijava može da se obavlja preko nezavisnih servisa za identitet.",
        },
        {
          title: "Šta Tulum pruža",
          body:
            "Tulum pomaže gostima da otkriju događaje, upravljaju svojim prisustvom i upoznaju druge goste preko profila, mečeva i ćaskanja. Lokali i organizatori mogu koristiti Tulum alate za upravljanje podacima o lokalima i događajima.",
        },
        {
          title: "Događaji i susreti uživo",
          body:
            "Podatke o događajima mogu dostaviti lokali, organizatori, korisnici ili drugi izvori, a oni se mogu promeniti. Pre dolaska proveri važne informacije kod organizatora. Ako nije izričito navedeno drugačije, Tulum nije organizator događaja i ne kontroliše događaj niti ponašanje učesnika. Koristi sopstvenu procenu pri upoznavanju ljudi i odlasku na događaje.",
        },
        {
          title: "Pravila zajednice",
          body:
            "Nemoj koristiti Tulum za uznemiravanje, pretnje, obmanu, lažno predstavljanje, neželjene poruke, nanošenje štete ili kršenje zakona. Objavljuj samo sadržaj koji imaš pravo da deliš. Možemo ukloniti sadržaj ili ograničiti pristup kada je to razumno potrebno radi zaštite ljudi, poštovanja zakona ili održavanja usluge.",
        },
        {
          title: "Tvoj sadržaj",
          body:
            "Zadržavaš vlasništvo nad sadržajem koji pošalješ. Daješ Tulum-u dozvolu da čuva, prikazuje, formatira i na drugi način koristi taj sadržaj samo koliko je potrebno za pružanje, održavanje i zaštitu usluge. Dozvola prestaje kada ukloniš sadržaj, osim kopija u rezervnim kopijama ili sadržaja koji se čuva iz pravnih, bezbednosnih ili sigurnosnih razloga.",
        },
        {
          title: "Lokacija i usluge drugih pružalaca",
          body:
            "Neke funkcije mogu zatražiti dozvolu za lokaciju u prvom planu kako bi proverile blizinu mesta događaja. Možeš odbiti ili opozvati dozvolu u podešavanjima uređaja, ali funkcije koje zavise od lokacije tada možda neće raditi. Tulum može koristiti i nezavisne servise za prijavu, mape, hosting i čuvanje podataka, na koje važe njihovi uslovi.",
        },
        {
          title: "Dostupnost i ograničenje naloga",
          body:
            "Možemo promeniti ili ukinuti funkcije i suspendovati ili ograničiti naloge koji krše ove uslove ili predstavljaju rizik za korisnike ili uslugu. U svakom trenutku možeš prestati da koristiš Tulum. Za pomoć oko naloga obrati nam se na adresu ispod.",
        },
        {
          title: "Odricanje od garancija",
          body:
            "Tulum se pruža u stanju u kom je dostupan. Podaci o događajima, dostupnosti i informacije koje unose korisnici mogu biti nepotpuni ili netačni. U meri dozvoljenoj zakonom ne garantujemo da će usluga uvek biti dostupna ili bez grešaka. Ovi uslovi ne ograničavaju prava ili odgovornost koji se po zakonu ne mogu isključiti.",
        },
      ],
      contactTitle: "Pitanja o uslovima?",
      contactBody:
        "Piši Tulum timu. Nemoj slati lozinke ili kodove za prijavu.",
    },
    privacy: {
      title: "Politika privatnosti",
      intro:
        "Ova politika objašnjava kako Tulum obrađuje podatke kada koristiš mobilnu aplikaciju, veb-sajt i alate za lokale. Obuhvata podatke koje nam dostavljaš, aktivnost potrebnu za rad usluge i izbore koji su ti dostupni.",
      updated: "Poslednje ažuriranje: 21. oktobar 2026.",
      sections: [
        {
          title: "Podaci koje dostavljaš",
          body:
            "To mogu biti podaci za prijavu koje nam prosledi izabrani pružalac identiteta, podaci profila kao što su ime, datum rođenja, pol, interesovanja, preferencije, biografija i fotografije, kao i podaci o lokalu ili događaju koje unesu lokali.",
        },
        {
          title: "Aktivnost u Tulum-u",
          body:
            "Radi pružanja usluge obrađujemo aktivnost kao što su pregledi događaja, prijave ili evidencija prisustva, sačuvani događaji, lajkovi, mečevi, poruke, podešavanja profila i zahtevi podršci. Naši sistemi mogu stvarati i tehničke zapise potrebne za rad i zaštitu usluge.",
        },
        {
          title: "Lokacija i dozvole uređaja",
          body:
            "Ako odobriš dozvolu za lokaciju u prvom planu i koristiš funkciju koja zavisi od lokacije, aplikacija može pristupiti lokaciji uređaja kako bi proverila da li si blizu mesta događaja. Dozvolu možeš promeniti ili opozvati u podešavanjima uređaja; povezane funkcije tada možda neće biti dostupne.",
        },
        {
          title: "Kako koristimo podatke",
          body:
            "Podatke koristimo za kreiranje i zaštitu naloga, prikaz događaja i profila, funkcije prisustva i mečeva, ćaskanje, rad alata za lokale, odgovore na zahteve, rešavanje problema, sprečavanje zloupotreba i ispunjavanje zakonskih obaveza.",
        },
        {
          title: "Šta drugi mogu da vide",
          body:
            "U zavisnosti od funkcije, drugi gosti mogu videti podatke profila kao što su ime, godine, fotografije, interesovanja ili biografija. Poruke su dostupne učesnicima razgovora. Podaci o događajima i lokalima prikazuju se korisnicima funkcija za otkrivanje događaja.",
        },
        {
          title: "Pružaoci usluga i deljenje",
          body:
            "Koristimo pružaoce usluga za autentikaciju, cloud infrastrukturu i baze podataka, čuvanje fotografija i funkcije mapa ili mesta. Apple ili Google mogu obrađivati podatke kada izabereš njihovu prijavu. Podatke možemo otkriti i kada to nalaže zakon ili je razumno potrebno radi zaštite korisnika, prava ili usluge.",
        },
        {
          title: "Čuvanje podataka i zahtevi",
          body:
            "Podatke čuvamo koliko je potrebno za rad Tulum-a i legitimne bezbednosne, sigurnosne i pravne svrhe. Možeš zatražiti pristup, ispravku ili brisanje tako što ćeš nam pisati. Možemo proveriti tvoj identitet i zadržati ograničene zapise kada to nalaže zakon ili je potrebno radi rešavanja sporova ili zloupotreba.",
        },
        {
          title: "Bezbednost i uzrast",
          body:
            "Koristimo mere namenjene zaštiti podataka, ali nijedna internet usluga ne može garantovati potpunu sigurnost. Tulum je namenjen osobama od 18 ili više godina i nije osmišljen za decu.",
        },
      ],
      contactTitle: "Pitanja ili zahtevi u vezi sa privatnošću",
      contactBody:
        "Piši Tulum timu u vezi sa svojim podacima ili zahtevom za ispravku ili brisanje. Nemoj slati lozinke ili kodove za potvrdu.",
    },
    support: {
      title: "Podrška",
      intro:
        "Tulum tim može pomoći oko pristupa nalogu, profila, informacija o događaju, tehničkih problema i zahteva u vezi sa privatnošću.",
      sections: [
        {
          title: "Kontaktiraj podršku",
          body:
            "Piši na adresu ispod. Ukratko opiši problem i navedi uređaj i verziju aplikacije koju koristiš. Ne obećavamo određeno vreme odgovora, ali ćemo razmotriti tvoju poruku.",
        },
        {
          title: "Nalog i privatnost",
          body:
            "Za pristup nalogu ili zahtev za pristup, ispravku ili brisanje podataka, kad god možeš piši sa adrese povezane sa nalogom. Možemo zatražiti dodatne podatke da proverimo da li kontrolišeš nalog.",
        },
        {
          title: "Zaštiti svoj nalog",
          body:
            "Nikada ne šalji lozinku, jednokratni kod za prijavu, token sesije ili podatke za plaćanje putem e-pošte. Ako prilažeš snimak ekrana, ukloni privatne podatke koji nisu potrebni za objašnjenje problema.",
        },
      ],
      contactTitle: "Piši Tulum podršci",
      contactBody:
        "Za lakšu obradu koristi jasan naslov, na primer „Pristup nalogu“, „Zahtev za privatnost“ ili „Tehnički problem“.",
    },
  },
  ru: {
    terms: {
      title: "Условия использования",
      intro:
        "Эти условия распространяются на мобильное приложение Tulum, сайт и связанные инструменты. Создавая аккаунт или пользуясь Tulum, вы соглашаетесь с условиями. Если вы не согласны, не используйте сервис.",
      updated: "Последнее обновление: 21 октября 2026 г.",
      sections: [
        {
          title: "Возраст и аккаунты",
          body:
            "Tulum предназначен для взрослых от 18 лет. Указывайте достоверные данные профиля и защищайте доступ к аккаунту. Для входа могут использоваться сторонние сервисы идентификации.",
        },
        {
          title: "Возможности Tulum",
          body:
            "Tulum помогает находить события, отмечать участие и знакомиться с другими гостями с помощью профилей, совпадений и чатов. Заведения и организаторы могут использовать инструменты Tulum для управления информацией о заведениях и событиях.",
        },
        {
          title: "События и встречи",
          body:
            "Информацию о событиях могут предоставлять заведения, организаторы, пользователи и другие источники; она может изменяться. Перед посещением уточняйте важные детали у организатора. Если прямо не указано иное, Tulum не является организатором события и не контролирует события или поведение участников. При встречах и посещении мероприятий руководствуйтесь собственной оценкой ситуации.",
        },
        {
          title: "Правила сообщества",
          body:
            "Не используйте Tulum для преследования, угроз, обмана, выдачи себя за другого человека, спама, причинения вреда или нарушения закона. Публикуйте только материалы, которыми имеете право делиться. Мы можем удалить материалы или ограничить доступ, если это разумно необходимо для защиты людей, соблюдения закона или работы сервиса.",
        },
        {
          title: "Ваши материалы",
          body:
            "Вы сохраняете права на отправленные материалы. Вы разрешаете Tulum хранить, отображать, форматировать и иным образом использовать их только в объеме, необходимом для предоставления, поддержки и защиты сервиса. Разрешение прекращается после удаления материала, кроме копий в резервных хранилищах или случаев, когда хранение требуется по закону либо для безопасности.",
        },
        {
          title: "Геолокация и сторонние сервисы",
          body:
            "Некоторые функции могут запросить разрешение на геолокацию в foreground-режиме, чтобы проверить близость к месту события. Вы можете отказать или отозвать разрешение в настройках устройства, но соответствующие функции могут быть недоступны. Tulum также может использовать сторонние сервисы входа, карт, хостинга и хранения данных, на которые распространяются их собственные условия.",
        },
        {
          title: "Доступность и ограничения аккаунта",
          body:
            "Мы можем изменять или отключать функции, а также приостанавливать или ограничивать аккаунты, нарушающие условия или создающие риск для пользователей либо сервиса. Вы можете прекратить пользоваться Tulum в любое время. По вопросам аккаунта обращайтесь по адресу ниже.",
        },
        {
          title: "Отказ от гарантий",
          body:
            "Tulum предоставляется по мере доступности. Информация о событиях, их наличии и данные пользователей могут быть неполными или неточными. В пределах, разрешенных законом, мы не гарантируем бесперебойную работу сервиса или отсутствие ошибок. Эти условия не ограничивают права и ответственность, которые нельзя исключить по закону.",
        },
      ],
      contactTitle: "Вопросы об условиях?",
      contactBody:
        "Напишите команде Tulum. Не отправляйте пароли и коды входа.",
    },
    privacy: {
      title: "Политика конфиденциальности",
      intro:
        "В этой политике описано, как Tulum обрабатывает информацию при использовании мобильного приложения, сайта и инструментов для заведений. Она охватывает сведения, которые вы предоставляете, данные о работе сервиса и доступные вам настройки.",
      updated: "Последнее обновление: 21 октября 2026 г.",
      sections: [
        {
          title: "Предоставляемая вами информация",
          body:
            "Это могут быть данные входа, переданные выбранным сервисом идентификации, сведения профиля — например имя, дата рождения, пол, интересы, предпочтения, биография и фотографии, — а также данные заведений и событий, внесенные их командами.",
        },
        {
          title: "Активность в Tulum",
          body:
            "Для работы сервиса мы обрабатываем такие данные, как просмотры событий, отметки участия или записи RSVP, сохраненные события, лайки, совпадения, сообщения, настройки профиля и обращения в поддержку. Системы также могут создавать технические записи, необходимые для работы и защиты сервиса.",
        },
        {
          title: "Геолокация и разрешения устройства",
          body:
            "Если вы разрешите доступ к геолокации в foreground-режиме и воспользуетесь функцией, зависящей от местоположения, приложение может получить координаты устройства, чтобы проверить близость к месту события. Разрешение можно изменить или отозвать в настройках устройства; связанные функции могут перестать работать.",
        },
        {
          title: "Использование информации",
          body:
            "Мы используем информацию для создания и защиты аккаунтов, показа событий и профилей, поддержки участия и совпадений, чатов, инструментов для заведений, ответа на обращения, устранения неполадок, предотвращения злоупотреблений и выполнения требований закона.",
        },
        {
          title: "Что могут видеть другие",
          body:
            "В зависимости от функции другие гости могут видеть данные профиля, например имя, возраст, фотографии, интересы или биографию. Сообщения доступны участникам соответствующего чата. Сведения о событиях и заведениях могут отображаться пользователям функций поиска событий.",
        },
        {
          title: "Поставщики услуг и передача данных",
          body:
            "Мы используем поставщиков услуг для аутентификации, облачной инфраструктуры и баз данных, хранения изображений, карт и поиска мест. Apple или Google могут обрабатывать данные, если вы выберете вход через их сервис. Мы также можем раскрыть данные, когда этого требует закон или когда это разумно необходимо для защиты пользователей, прав или сервиса.",
        },
        {
          title: "Хранение данных и запросы",
          body:
            "Мы храним данные столько, сколько необходимо для работы Tulum и законных целей безопасности и соблюдения закона. Вы можете запросить доступ, исправление или удаление, написав нам. Мы можем проверить вашу личность и сохранить ограниченные записи, если этого требует закон или если это необходимо для разрешения споров либо предотвращения злоупотреблений.",
        },
        {
          title: "Безопасность и возраст",
          body:
            "Мы применяем меры, направленные на защиту данных, но ни один онлайн-сервис не может гарантировать абсолютную безопасность. Tulum предназначен для взрослых от 18 лет и не рассчитан на детей.",
        },
      ],
      contactTitle: "Вопросы о конфиденциальности",
      contactBody:
        "Напишите команде Tulum по вопросам ваших данных или запросам на исправление либо удаление. Не отправляйте пароли и коды подтверждения.",
    },
    support: {
      title: "Поддержка",
      intro:
        "Команда Tulum поможет с доступом к аккаунту, профилем, информацией о событиях, техническими проблемами и вопросами конфиденциальности.",
      sections: [
        {
          title: "Связаться с поддержкой",
          body:
            "Напишите на адрес ниже. Кратко опишите проблему, укажите устройство и версию приложения. Мы не обещаем определенное время ответа, но рассмотрим обращение.",
        },
        {
          title: "Аккаунт и персональные данные",
          body:
            "Для доступа к аккаунту или запроса на доступ, исправление либо удаление данных по возможности пишите с адреса, связанного с аккаунтом. Мы можем запросить дополнительные сведения, чтобы проверить, что аккаунт принадлежит вам.",
        },
        {
          title: "Защитите аккаунт",
          body:
            "Не отправляйте по электронной почте пароль, одноразовый код входа, токен сессии или платежные данные. Перед отправкой снимка экрана скройте личные сведения, не нужные для объяснения проблемы.",
        },
      ],
      contactTitle: "Написать в поддержку Tulum",
      contactBody:
        "Для удобства укажите тему, например «Доступ к аккаунту», «Запрос о данных» или «Техническая проблема».",
    },
  },
};

export const SUPPORT_EMAIL = "tulum.app.official@gmail.com";

export function getPublicPageCopy(
  language: string,
  page: PublicPageId,
): PublicPageCopy {
  const languageCode = language.toLowerCase().split(/[-_]/)[0];
  const locale: Locale =
    languageCode === "sr" || languageCode === "ru" ? languageCode : "en";
  return publicPages[locale][page];
}
