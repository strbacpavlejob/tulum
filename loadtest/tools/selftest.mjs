#!/usr/bin/env node
// Checks the k6 socket.io client (k6/lib/socketio.js) against a real
// socket.io server, the version the API runs, with Node's WebSocket standing
// in for k6's (both follow the browser API). Needs no k6 and no network:
//
//   node loadtest/tools/selftest.mjs
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire, register } from "node:module";
import { after, before, test } from "node:test";

// k6/websockets resolves to Node's own WebSocket.
const shim = "export const WebSocket = globalThis.WebSocket;";
register(
  `data:text/javascript,${encodeURIComponent(`
    export async function resolve(specifier, context, next) {
      if (specifier === "k6/websockets") {
        return {
          shortCircuit: true,
          url: "data:text/javascript,${encodeURIComponent(shim)}",
        };
      }
      return next(specifier, context);
    }
  `)}`,
);
const { openSocket } = await import("../k6/lib/socketio.js");
const protocol = await import("../k6/lib/socketio-protocol.js");

const apiRequire = createRequire(new URL("../../apps/api/package.json", import.meta.url));
const { Server } = apiRequire("socket.io");

const VALID_TOKEN = "valid-token";
let http;
let io;
let apiBase;

/** Waits until check() holds, or fails after ms. */
async function until(check, ms = 2000) {
  const deadline = Date.now() + ms;
  while (!check()) {
    if (Date.now() > deadline) throw new Error("timed out");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/** A socket from the k6 client, with what it received. */
function connect(token) {
  const events = [];
  let settle;
  const connected = new Promise((resolve, reject) => {
    settle = { resolve, reject };
  });
  const socket = openSocket({
    apiBase,
    token,
    onConnect: () => settle.resolve(),
    onError: (reason) => settle.reject(new Error(String(reason))),
    onEvent: (name, data) => events.push([name, data]),
  });
  return { socket, events, connected };
}

before(async () => {
  http = createServer();
  // Pings every 300 ms, so a client that doesn't answer is dropped fast.
  io = new Server(http, { transports: ["websocket"], pingInterval: 300, pingTimeout: 200 });
  // As ChatsGateway: the Clerk token comes in auth and is checked first.
  io.use((socket, next) => {
    if (socket.handshake.auth?.token !== VALID_TOKEN) {
      next(new Error("Invalid or expired session token"));
      return;
    }
    socket.data.userId = "user_load";
    next();
  });
  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`);
    socket.on("join_chat", async ({ chatId }) => {
      await socket.join(`chat:${chatId}`);
      socket.emit("joined", { chatId });
    });
    socket.on("send_message", ({ chatId, text }) => {
      io.to(`chat:${chatId}`).emit("new_message", {
        chatId,
        senderId: socket.data.userId,
        text,
      });
    });
    socket.on("echo", (payload, ack) => ack({ echoed: payload }));
  });
  await new Promise((resolve) => http.listen(0, "127.0.0.1", resolve));
  apiBase = `http://127.0.0.1:${http.address().port}`;
});

after(() => new Promise((resolve) => io.close(() => resolve())));

test("builds and reads socket.io packets", () => {
  assert.equal(
    protocol.socketIoUrl("https://api.example.com/"),
    "wss://api.example.com/socket.io/?EIO=4&transport=websocket",
  );
  assert.equal(
    protocol.socketIoUrl("http://localhost:3001"),
    "ws://localhost:3001/socket.io/?EIO=4&transport=websocket",
  );
  assert.equal(protocol.connectPacket({ token: "t" }), '40{"token":"t"}');
  assert.equal(protocol.eventPacket("a", { b: 1 }), '42["a",{"b":1}]');
  assert.equal(protocol.eventPacket("a", { b: 1 }, 7), '427["a",{"b":1}]');

  assert.deepEqual(protocol.decode("2"), { type: "ping" });
  assert.equal(protocol.decode('0{"sid":"x"}').data.sid, "x");
  assert.deepEqual(protocol.decode('40{"sid":"y"}'), { type: "connect", data: { sid: "y" } });
  assert.equal(protocol.decode('44{"message":"no"}').data.message, "no");
  assert.deepEqual(protocol.decode('42["n",{"x":1}]'), {
    type: "event",
    name: "n",
    data: { x: 1 },
    ackId: undefined,
  });
  assert.equal(protocol.decode('4212["n",1]').ackId, 12);
  assert.deepEqual(protocol.decode('433[{"ok":true}]'), { type: "ack", id: 3, args: [{ ok: true }] });
  assert.deepEqual(protocol.decode("41"), { type: "disconnect" });
});

test("connects with a valid token and gets events, pushes and acks", async () => {
  const { socket, events, connected } = connect(VALID_TOKEN);
  await connected;
  assert.equal(socket.connected, true);

  socket.emit("join_chat", { chatId: "c1" });
  await until(() => events.some(([name]) => name === "joined"));

  io.to("user:user_load").emit("inbox_changed", { reason: "match" });
  await until(() => events.some(([name]) => name === "inbox_changed"));

  socket.emit("send_message", { chatId: "c1", text: "lt:1" });
  await until(() => events.some(([name]) => name === "new_message"));
  assert.deepEqual(
    events.find(([name]) => name === "new_message")[1],
    { chatId: "c1", senderId: "user_load", text: "lt:1" },
  );

  const reply = await new Promise((resolve) => socket.emit("echo", { n: 1 }, resolve));
  assert.deepEqual(reply, { echoed: { n: 1 } });

  socket.close();
  await until(() => io.of("/").sockets.size === 0);
});

test("answers pings, so the server keeps the socket", async () => {
  const { socket, connected } = connect(VALID_TOKEN);
  await connected;
  // Four ping rounds: a client that didn't answer would be gone by now.
  await new Promise((resolve) => setTimeout(resolve, 1200));
  assert.equal(socket.connected, true);
  assert.equal(io.of("/").sockets.size, 1);
  socket.close();
  await until(() => io.of("/").sockets.size === 0);
});

test("reports a refused token and doesn't connect", async () => {
  const { socket, connected } = connect("expired-token");
  await assert.rejects(connected, /Invalid or expired session token/);
  assert.equal(socket.connected, false);
  assert.equal(socket.emit("echo", {}), false);
});
