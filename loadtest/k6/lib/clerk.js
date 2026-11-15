// Session tokens for the load-test users, minted with the Backend API from
// the sessions token-users.mjs made. Real tokens: the API verifies them as
// it does the app's.
import http from "k6/http";

// CLERK_API_URL points it at a stand-in for a dry run of the script.
const BACKEND_API = __ENV.CLERK_API_URL || "https://api.clerk.com/v1";

/** A session token (JWT) that lives lifetimeSeconds. */
export function mintToken(secretKey, sessionId, lifetimeSeconds) {
  const res = http.post(
    `${BACKEND_API}/sessions/${sessionId}/tokens`,
    JSON.stringify({ expires_in_seconds: lifetimeSeconds }),
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      tags: { name: "clerk_token", scope: "clerk" },
    },
  );
  if (res.status !== 200) {
    throw new Error(`Clerk token for ${sessionId}: ${res.status} ${res.body}`);
  }
  return res.json("jwt");
}

/**
 * The guest's current token, minted again when less than a fifth of its
 * life is left. The API also checks expiry, so a stale one would fail.
 */
export function tokenKeeper(secretKey, sessionId, lifetimeSeconds) {
  let token = null;
  let renewAt = 0;
  return {
    get() {
      if (!token || Date.now() >= renewAt) {
        token = mintToken(secretKey, sessionId, lifetimeSeconds);
        renewAt = Date.now() + lifetimeSeconds * 800;
      }
      return token;
    },
  };
}
