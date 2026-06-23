import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { getCorsOrigins } from "../config/env";

@WebSocketGateway({
  cors: { origin: getCorsOrigins(), credentials: true },
  namespace: "/notifications",
})
export class NotificationsGateway {
  @WebSocketServer()
  server!: Server;

  emitPlatformEvent(payload: { revision: number; kind: string; summary?: string }) {
    this.server?.emit("platform:update", payload);
  }
}
