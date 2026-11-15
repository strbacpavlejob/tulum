// socket.io's wire format (Engine.IO 4, socket.io protocol 5) over a plain
// websocket, as socket.io-client speaks it with transports: ["websocket"].
// No k6 imports, so tools/selftest.mjs checks it against a real server.

/** The socket.io endpoint for an API base URL. */
export function socketIoUrl(apiBase) {
  const base = apiBase.replace(/\/+$/, "").replace(/^http/, "ws");
  return `${base}/socket.io/?EIO=4&transport=websocket`;
}

/** Joins the main namespace; the API reads the Clerk token from auth. */
export function connectPacket(auth) {
  return `40${JSON.stringify(auth)}`;
}

/** An event, with an ack id when the sender wants the handler's answer. */
export function eventPacket(name, payload, ackId) {
  return `42${ackId ?? ""}${JSON.stringify([name, payload])}`;
}

/** The reply to the server's ping. */
export const PONG = "3";

/**
 * One frame from the server, as { type, ... }: open, ping, connect,
 * connect_error, event (name, data), ack (id, args), disconnect, or other.
 */
export function decode(frame) {
  const data = String(frame);
  if (data === "2") return { type: "ping" };
  if (data.startsWith("0")) return { type: "open", data: parseJson(data.slice(1)) };
  if (data === "41" || data.startsWith("41")) return { type: "disconnect" };
  if (data.startsWith("40")) {
    return { type: "connect", data: parseJson(data.slice(2)) };
  }
  if (data.startsWith("44")) {
    return { type: "connect_error", data: parseJson(data.slice(2)) };
  }
  if (data.startsWith("42")) {
    const { id, body } = splitAckId(data.slice(2));
    const [name, payload] = parseJson(body) ?? [];
    return { type: "event", name, data: payload, ackId: id };
  }
  if (data.startsWith("43")) {
    const { id, body } = splitAckId(data.slice(2));
    return { type: "ack", id, args: parseJson(body) ?? [] };
  }
  return { type: "other", data };
}

function splitAckId(rest) {
  const match = /^(\d+)(.*)$/s.exec(rest);
  return match ? { id: Number(match[1]), body: match[2] } : { id: undefined, body: rest };
}

function parseJson(text) {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
