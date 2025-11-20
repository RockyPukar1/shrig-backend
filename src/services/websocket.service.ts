import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { logger } from "@/utils/logger";
import { DataPoint } from "@/types/data.types";
import { dataService } from "./data.service";

export class WebSocketService {
  private io: SocketIOServer;
  private connectedClients = new Map<string, Socket>();
  private roomSubscriptions = new Map<string, Set<string>>();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.WS_CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);
      this.connectedClients.set(socket.id, socket);

      socket.on("authenticate", (data: { token?: string; userId?: string }) => {
        if (data.token || data.userId) {
          socket.data.authenticated = true;
          socket.data.userId = data.userId;
          socket.emit("authenticated", { success: true });
          logger.info(`Client authenticated: ${socket.id}`);
        } else {
          socket.emit("authentication", {
            success: false,
            message: "Unauthorized",
          });
        }
      });

      socket.on("subscribe", (data: { room: string }) => {
        if (!socket.data.authenticated) {
          socket.emit("error", { message: "Authentication required" });
          return;
        }

        const { room } = data;
        socket.join(room);

        if (!this.roomSubscriptions.has(room)) {
          this.roomSubscriptions.set(room, new Set());
        }
        this.roomSubscriptions.get(room)!.add(socket.id);

        socket.emit(`subscribed`, { room });
        logger.info(`Client ${socket.id} subscribed to room: ${room}`);
      });

      socket.on("unsubscribe", (data: { room: string }) => {
        const { room } = data;
        socket.leave(room);

        const roomSubs = this.roomSubscriptions.get(room);
        if (roomSubs) {
          roomSubs.delete(socket.id);
          if (roomSubs.size === 0) {
            this.roomSubscriptions.delete(room);
          }
        }

        socket.emit("unsubscribed", { room });
        logger.info(`Client ${socket.id} unsubscribed from room: ${room}`);
      });

      socket.on("submit_data", async (data: DataPoint[]) => {
        if (!socket.data.authenticated) {
          socket.emit("error", { message: "Authentication required" });
          return;
        }
        try {
          await dataService.ingestData(data);
          socket.emit("data_received", {
            count: data.length,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          logger.error("Error processing real-time data:", error);
          socket.emit("error", { message: "Failed to process data" });
        }
      });

      socket.on("disconnect", (reason) => {
        logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
        this.connectedClients.delete(socket.id);

        this.roomSubscriptions.forEach((sockets, room) => {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.roomSubscriptions.delete(room);
          }
        });
      });

      socket.on("error", (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  broadcastData(data: any): void {
    this.io.emit("data_update", {
      data,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastToRoom(room: string, event: string, data: any): void {
    this.io.to(room).emit(event, {
      data,
      timestamp: new Date().toISOString(),
    });
  }

  sendToClient(socketId: string, event: string, data: any): void {
    const socket = this.connectedClients.get(socketId);
    if (socket) {
      socket.emit(event, {
        data,
        timestamp: new Date().toISOString(),
      });
    }
  }

  getStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    roomSubscriptions: Record<string, number>;
  } {
    const authenticatedCount = Array.from(
      this.connectedClients.values()
    ).filter((socket) => socket.data.authenticated).length;

    const roomStats: Record<string, number> = {};
    this.roomSubscriptions.forEach((sockets, room) => {
      roomStats[room] = sockets.size;
    });

    return {
      totalConnections: this.connectedClients.size,
      authenticatedConnections: authenticatedCount,
      roomSubscriptions: roomStats,
    };
  }

  handleReconnection(socket: Socket): void {
    socket.on("reconnect", () => {
      logger.info(`Client reconnected: ${socket.id}`);
      socket.emit("reconnected", { message: "Please re-authenticate" });
    });
  }
}

export let webSocketService: WebSocketService;

export const initializeWebSocket = (
  httpServer: HTTPServer
): WebSocketService => {
  webSocketService = new WebSocketService(httpServer);
  return webSocketService;
};
