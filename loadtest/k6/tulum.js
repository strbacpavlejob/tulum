// The app's traffic at one big event, for the staging API (loadtest/README.md).
//
// Each virtual user (VU) is one real Clerk user from token-users.mjs, with a
// real session token: no auth bypass. It acts like SCALE guests at once
// (EQUIV people over the VUs), so 100 users reproduce 1,000–2,000 guests:
// swiping, deck counts, the inbox, event details, the guest list and chat,
// at the rates in PER_GUEST_PER_MINUTE, plus SOCKETS_PER_VU open sockets.
//
//   k6 run -e API=https://<staging api> -e EVENT_ID=<event> \
//          -e CLERK_SECRET_KEY=sk_test_... -e EQUIV=1000 loadtest/k6/tulum.js
import http from "k6/http";
import { check, fail, sleep } from "k6";
import { SharedArray } from "k6/data";
import exec from "k6/execution";
import { Counter, Rate, Trend } from "k6/metrics";
import { mintToken, tokenKeeper } from "./lib/clerk.js";
import { openSocket } from "./lib/socketio.js";

const API = (__ENV.API || "").replace(/\/+$/, "");
const EVENT_ID = __ENV.EVENT_ID || "b6b6b6b6-0000-4000-8000-000000000001";
const SECRET = __ENV.CLERK_SECRET_KEY || "";
const EQUIV = Number(__ENV.EQUIV || 100);
const HOLD_MINUTES = Number(__ENV.HOLD_MINUTES || 30);
const RAMP_MINUTES = Number(__ENV.RAMP_MINUTES || 2);
/** Share of swipes that are likes; the like limit is 20% of the guests. */
const LIKE_SHARE = Number(__ENV.LIKE_SHARE || 0.1);

// Never against production: the test writes swipes, matches and messages.
const PRODUCTION_HOSTS = [
  "tulum-api-production.up.railway.app",
  "api.tulum-app.com",
];
const apiHost = API.replace(/^https?:\/\//, "").split("/")[0];
if (!API) fail("Set API to the staging API's URL");
if (PRODUCTION_HOSTS.includes(apiHost)) {
  fail(`${apiHost} is production; the load test runs on staging only`);
}
if (!SECRET.startsWith("sk_test_")) {
  fail("Set CLERK_SECRET_KEY to the staging Clerk app's sk_test_ key");
}

const users = new SharedArray("token users", () =>
  JSON.parse(open(__ENV.USERS_FILE || "../.token-users.json")),
);
const VUS = Math.min(Number(__ENV.VUS || users.length), users.length);
/** How many guests each VU stands for. */
const SCALE = EQUIV / VUS;
/** A socket per guest, up to 10 a VU: 1,000 sockets from 1,000 guests on. */
const SOCKETS_PER_VU = Number(__ENV.SOCKETS_PER_VU || Math.min(10, Math.ceil(SCALE)));

/**
 * What one guest at the party does in a minute, from the app's own timers
 * and an estimate of how guests use it: a card every 10 s on Matches, the
 * deck's counts every 30 s, check-in on each Matches load, and so on.
 * Deck pages follow from the swipes (25 cards a page, the next one 5 cards
 * before the end).
 */
const PER_GUEST_PER_MINUTE = {
  swipe: 6,
  deckCounts: 2,
  matches: 0.5,
  checkIn: 0.2,
  eventDetails: 0.2,
  guestList: 0.2,
  tickets: 0.2,
  feed: 0.1,
  attend: 0.05,
  chat: 0.3,
};

const TOKEN_LIFETIME_SECONDS = (HOLD_MINUTES + RAMP_MINUTES + 15) * 60;

export const options = {
  setupTimeout: "20m",
  scenarios: {
    party: {
      executor: "per-vu-iterations",
      vus: VUS,
      iterations: 1,
      maxDuration: `${HOLD_MINUTES + RAMP_MINUTES + 5}m`,
    },
  },
  thresholds: {
    "http_req_failed{scope:app}": ["rate<0.005"],
    "http_req_duration{name:deck}": ["p(95)<800"],
    "http_req_duration{name:swipe}": ["p(95)<800"],
    "http_req_duration{name:attend}": ["p(95)<800"],
    "http_req_duration{name:matches}": ["p(95)<800"],
    chat_delivery: ["p(95)<2000"],
    socket_connect_failed: ["rate<0.01"],
  },
};

const chatDelivery = new Trend("chat_delivery", true);
const socketConnectFailed = new Rate("socket_connect_failed");
const inboxPushes = new Counter("inbox_pushes");
const likeLimitReached = new Counter("like_limit_reached");

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Prepares the users as the app would: sign-in (the API makes the users
 * row), onboarding, joining the event and checking in. Then pairs them
 * (0 and 1, 2 and 3, …): each likes the other, which makes a match and a
 * chat, so chat delivery can be measured between real sockets.
 */
export function setup() {
  const prepared = [];
  for (let i = 0; i < VUS; i++) {
    const user = users[i];
    const token = mintToken(SECRET, user.sessionId, 3600);
    const h = headers(token);
    const tags = { scope: "setup" };

    const me = http.get(`${API}/guests/me`, { headers: h, tags });
    check(me, { "setup: guests/me 200": (r) => r.status === 200 });
    if (me.status === 200 && !me.json("isOnboardingComplete")) {
      const onboarding = http.post(
        `${API}/guests/onboarding`,
        JSON.stringify({
          first_name: `Load ${user.n}`,
          gender: user.n % 2 ? "female" : "male",
          interested_in: ["male", "female", "other"],
          picture_urls: [],
          birthday: "1996-06-15",
        }),
        { headers: h, tags },
      );
      check(onboarding, { "setup: onboarding 201": (r) => r.status === 201 });
    }
    const attend = http.post(
      `${API}/tickets/attend`,
      JSON.stringify({ event_id: EVENT_ID, src: "load" }),
      { headers: h, tags },
    );
    check(attend, { "setup: attend 2xx": (r) => r.status < 300 });
    const checkIn = http.post(
      `${API}/events/sessions`,
      JSON.stringify({ event_id: EVENT_ID }),
      { headers: h, tags },
    );
    check(checkIn, { "setup: check-in 2xx": (r) => r.status < 300 });
    prepared.push({ ...user, token });
    // Clerk's development Backend API allows 100 calls per 10 s, and a new
    // user costs two: this token, and the API's look-up for their users row.
    sleep(0.25);
  }

  for (let i = 0; i + 1 < prepared.length; i += 2) {
    const [a, b] = [prepared[i], prepared[i + 1]];
    const like = (from, to) =>
      http.post(
        `${API}/matches/swipe`,
        JSON.stringify({
          other_user_id: to.userId,
          event_id: EVENT_ID,
          liked: true,
          gender_filter: "everyone",
          age_min: 18,
          age_max: 99,
          selected_interests: [],
        }),
        { headers: headers(from.token), tags: { scope: "setup" } },
      );
    like(a, b);
    const matched = like(b, a);
    const matchId = matched.status < 300 ? matched.json("match_id") : null;
    const chat = matchId
      ? http.get(`${API}/chats/by-match/${matchId}`, {
          headers: headers(a.token),
          tags: { scope: "setup" },
        })
      : null;
    if (chat && chat.status === 200) {
      a.chatId = b.chatId = chat.json("chat.id");
    }
    check(a, { "setup: pair has a chat": (user) => Boolean(user.chatId) });
  }

  return {
    users: prepared.map(({ token: _token, ...user }) => user),
    startedAt: Date.now(),
  };
}

export default function (data) {
  const me = data.users[exec.vu.idInTest - 1];
  // Arrivals spread over the ramp, as guests come through the door.
  sleep((RAMP_MINUTES * 60 * (exec.vu.idInTest - 1)) / VUS);

  const auth = tokenKeeper(SECRET, me.sessionId, TOKEN_LIFETIME_SECONDS);
  // Requests don't wait for one another, as the phones a VU stands for
  // don't: the rate holds when the API slows down, and socket events are
  // handled while requests are out, so chat delivery is timed truly.
  const app = (method, path, body, name, extra = {}) =>
    http.asyncRequest(method, `${API}${path}`, body ? JSON.stringify(body) : null, {
      headers: headers(auth.get()),
      tags: { name, scope: "app" },
      ...extra,
    });
  /** A timer callback that logs a failure instead of ending the VU. */
  const guarded = (label, task) => async () => {
    try {
      await task();
    } catch (error) {
      console.error(`${label}: ${error}`);
    }
  };

  // Sockets: one carries the guest's inbox and chat; the rest stand for the
  // other phones this VU represents, connected and idle.
  const sockets = [];
  let pushTimer = null;
  const active = openSocket({
    apiBase: API,
    token: auth.get(),
    onConnect: () => {
      socketConnectFailed.add(false);
      if (me.chatId) active.emit("join_chat", { chatId: me.chatId });
    },
    onError: () => socketConnectFailed.add(true),
    onEvent: (name, payload) => {
      if (name === "inbox_changed") {
        inboxPushes.add(1);
        // As the tab bar does: one read 1.5 s after a burst of pushes.
        if (!pushTimer) {
          pushTimer = setTimeout(
            guarded("inbox", () => {
              pushTimer = null;
              return actions.matches();
            }),
            1500,
          );
        }
      } else if (
        name === "new_message" &&
        payload &&
        payload.senderId !== me.userId &&
        typeof payload.text === "string" &&
        payload.text.startsWith("lt:")
      ) {
        // Sent by the partner's VU on this machine: same clock.
        chatDelivery.add(Date.now() - Number(payload.text.slice(3)));
      }
    },
  });
  sockets.push(active);
  for (let i = 1; i < SOCKETS_PER_VU; i++) {
    sockets.push(
      openSocket({
        apiBase: API,
        token: auth.get(),
        onConnect: () => socketConnectFailed.add(false),
        onError: () => socketConnectFailed.add(true),
      }),
    );
  }

  // The deck: pages of 25 by cursor, the next one 5 cards before the end,
  // from the top again once a pass reaches the end. Guests already liked
  // come back marked liked_by_me and are skipped: the API refuses turning a
  // like into a pass, and a guest wouldn't like them twice.
  let deck = [];
  let cursor = null;
  let deckLoading = null;
  const fetchDeckPage = async () => {
    const query = `event_id=${EVENT_ID}&limit=25${cursor ? `&cursor=${cursor}` : ""}`;
    const res = await app("GET", `/guests/swipeable?${query}`, null, "deck");
    if (res.status !== 200) return;
    const profiles = res.json("profiles") || [];
    deck = deck.concat(
      profiles.filter((profile) => !profile.liked_by_me).map((profile) => profile.user_id),
    );
    cursor = res.json("next_cursor") || null;
  };

  const actions = {
    swipe: async () => {
      // One page at a time, however many swipes wait for it.
      if (deck.length < 5 && !deckLoading) {
        deckLoading = fetchDeckPage().then(
          () => {
            deckLoading = null;
          },
          (error) => {
            deckLoading = null;
            throw error;
          },
        );
      }
      if (!deck.length) await deckLoading;
      const target = deck.shift();
      if (!target) return;
      const liked = Math.random() < LIKE_SHARE;
      const res = await app(
        "POST",
        "/matches/swipe",
        {
          other_user_id: target,
          event_id: EVENT_ID,
          liked,
          gender_filter: "everyone",
          age_min: 18,
          age_max: 99,
          selected_interests: [],
        },
        "swipe",
        // The like limit answers 400; the app shows it, it isn't a failure.
        { responseCallback: http.expectedStatuses({ min: 200, max: 299 }, 400) },
      );
      if (res.status === 400) likeLimitReached.add(1);
    },
    deckCounts: () =>
      app("GET", `/guests/swipeable?event_id=${EVENT_ID}&limit=0`, null, "deck_counts"),
    matches: () => app("GET", "/matches/mine", null, "matches"),
    checkIn: () => app("POST", "/events/sessions", { event_id: EVENT_ID }, "check_in"),
    eventDetails: () => app("GET", `/events/active/${EVENT_ID}`, null, "event_details"),
    guestList: () =>
      app("GET", `/tickets/attendees?event_id=${EVENT_ID}&limit=30`, null, "guest_list"),
    tickets: () => app("GET", "/tickets", null, "tickets"),
    feed: () => app("GET", "/events/active", null, "feed"),
    attend: () =>
      app("POST", "/tickets/attend", { event_id: EVENT_ID, src: "load" }, "attend"),
    chat: () => {
      if (me.chatId) {
        active.emit("send_message", { chatId: me.chatId, text: `lt:${Date.now()}` });
      }
    },
  };

  // Each action on its own timer, at its rate times SCALE, starting at a
  // random point of its first interval so VUs don't move in step.
  const starts = [];
  const intervals = [];
  for (const [action, perMinute] of Object.entries(PER_GUEST_PER_MINUTE)) {
    const intervalMs = 60000 / (perMinute * SCALE);
    const task = guarded(action, actions[action]);
    starts.push(
      setTimeout(() => {
        task();
        intervals.push(setInterval(task, intervalMs));
      }, Math.random() * intervalMs),
    );
  }

  // The VU's iteration ends once no timer, socket or request is left.
  setTimeout(() => {
    for (const start of starts) clearTimeout(start);
    for (const interval of intervals) clearInterval(interval);
    if (pushTimer) clearTimeout(pushTimer);
    for (const socket of sockets) socket.close();
  }, HOLD_MINUTES * 60 * 1000);
}
