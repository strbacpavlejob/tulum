// A socket.io client for k6, enough for the app's two sockets: the inbox
// push (inbox_changed) and chat (join_chat, send_message, new_message).
import { WebSocket } from "k6/websockets";
import {
  PONG,
  connectPacket,
  decode,
  eventPacket,
  socketIoUrl,
} from "./socketio-protocol.js";

/**
 * Opens a socket with the guest's Clerk token. onConnect runs once the API
 * accepted the token, onEvent(name, data) for each event, onError(reason)
 * for a refused handshake or a broken connection.
 */
export function openSocket({ apiBase, token, onConnect, onEvent, onError }) {
  const ws = new WebSocket(socketIoUrl(apiBase));
  let connected = false;
  let nextAckId = 0;
  const acks = new Map();

  ws.onmessage = (message) => {
    const packet = decode(message.data);
    switch (packet.type) {
      case "open":
        ws.send(connectPacket({ token }));
        break;
      case "ping":
        ws.send(PONG);
        break;
      case "connect":
        connected = true;
        if (onConnect) onConnect();
        break;
      case "connect_error":
        if (onError) onError(packet.data?.message ?? "connect_error");
        ws.close();
        break;
      case "event":
        if (onEvent) onEvent(packet.name, packet.data);
        break;
      case "ack": {
        const callback = acks.get(packet.id);
        acks.delete(packet.id);
        if (callback) callback(...packet.args);
        break;
      }
      case "disconnect":
        connected = false;
        break;
    }
  };
  ws.onerror = (error) => {
    if (onError) onError(error?.error ?? "socket error");
  };
  ws.onclose = () => {
    connected = false;
  };

  return {
    get connected() {
      return connected;
    },
    /** Sends an event; false while the socket isn't connected. */
    emit(name, payload, ack) {
      if (!connected) return false;
      let id;
      if (ack) {
        id = nextAckId++;
        acks.set(id, ack);
      }
      ws.send(eventPacket(name, payload, id));
      return true;
    },
    close() {
      ws.close();
    },
  };
}
