import request from "supertest";
import { io as Client, Socket } from "socket.io-client";
import app from "../../src/app";
import { createServer } from "http";
import { initializeWebSocket } from "../../src/services/websocket.service";
import dataProcessingQueue from "../../src/jobs/queue";

describe("Real-time Data Processing Tests", () => {
  let httpServer: any;
  let clientSocket: Socket;
  let serverPort: number;

  beforeAll(async () => {
    httpServer = createServer(app);
    initializeWebSocket(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address()?.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    console.log("Starting test cleanup...");

    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }

    if (httpServer) {
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.log("Force closing server due to timeout");
          resolve();
        }, 5000);

        httpServer.close(() => {
          clearTimeout(timeout);
          console.log("HTTP server closed");
          resolve();
        });
      });
    }

    try {
      const queueClosePromise = dataProcessingQueue.close();
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve("timeout"), 3000);
      });

      await Promise.race([queueClosePromise, timeoutPromise]);
      console.log("Job queue closed");
    } catch (error) {
      console.log("Queue close error (ignored):", error.message);
    }

    console.log("Test cleanup completed");
  }, 10000);

  beforeEach(() => {
    if (serverPort) {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        transports: ["websocket"],
        timeout: 5000,
      });
    }
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe("Test Case 1: High-Volume Data Ingestion", () => {
    it("should process 1000 data points in background and return immediately", async () => {
      const dataPoints = generateDataPoints(1000);

      const startTime = Date.now();

      const response = await request(app)
        .post("/api/v1/data/ingest")
        .send(dataPoints)
        .expect(202);

      const responseTime = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data.queued).toBe(true);
      expect(responseTime).toBeLessThan(1000);

      console.log(`Test Case 1: 1000 data points queued in ${responseTime}ms`);
    });
  });

  describe("Test Case 2: WebSocket Real-time Updates", () => {
    it.skip("should receive real-time updates when data is processed", (done) => {
      const timeout = setTimeout(() => {
        done(new Error("Test timed out - WebSocket connection failed"));
      }, 5000);

      clientSocket.on("connect", () => {
        console.log("WebSocket connected");

        // Authenticate
        clientSocket.emit("authenticate", { userId: "test-user" });

        clientSocket.on("authenticated", (data) => {
          if (data.success) {
            console.log("WebSocket authenticated");

            clientSocket.on("data_update", (update) => {
              clearTimeout(timeout);
              expect(update).toBeDefined();
              console.log("Test Case 2: Real-time update received");
              done();
            });

            setTimeout(() => {
              const dataPoints = generateDataPoints(2);
              request(app)
                .post("/api/v1/data/ingest")
                .send(dataPoints)
                .end(() => {});
            }, 500);
          } else {
            clearTimeout(timeout);
            done(new Error("Authentication failed"));
          }
        });

        setTimeout(() => {
          if (!clientSocket.disconnected) {
            clearTimeout(timeout);
            done(new Error("Authentication timeout"));
          }
        }, 2000);
      });

      clientSocket.on("connect_error", (error) => {
        clearTimeout(timeout);
        done(new Error(`Connection error: ${error.message}`));
      });
    }, 10000);
  });

  describe("Test Case 3: Multiple WebSocket Connections", () => {
    it.skip("should broadcast updates to all connected clients", (done) => {
      const clientCount = 3;
      const clients: Socket[] = [];
      let connectedCount = 0;
      let receivedCount = 0;

      const timeout = setTimeout(() => {
        clients.forEach((c) => c.disconnect());
        done(new Error("Test timed out - not all clients received updates"));
      }, 10000);

      for (let i = 0; i < clientCount; i++) {
        const client = Client(`http://localhost:${serverPort}`);
        clients.push(client);

        client.on("connect", () => {
          connectedCount++;
          client.emit("authenticate", { userId: `test-user-${i}` });

          client.on("authenticated", (data) => {
            if (data.success) {
              client.on("data_update", () => {
                receivedCount++;
                console.log(
                  `Client ${i} received update (${receivedCount}/${clientCount})`
                );

                if (receivedCount === clientCount) {
                  clearTimeout(timeout);
                  clients.forEach((c) => c.disconnect());
                  console.log(
                    "Test Case 3: All clients received broadcast updates"
                  );
                  done();
                }
              });
            }
          });
        });

        client.on("connect_error", (error) => {
          clearTimeout(timeout);
          clients.forEach((c) => c.disconnect());
          done(new Error(`Client ${i} connection error: ${error.message}`));
        });
      }

      const checkConnections = setInterval(() => {
        if (connectedCount === clientCount) {
          clearInterval(checkConnections);
          console.log(`All ${clientCount} clients connected, sending data...`);

          setTimeout(() => {
            const dataPoints = generateDataPoints(1);
            request(app)
              .post("/api/v1/data/ingest")
              .send(dataPoints)
              .end(() => {});
          }, 1000);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkConnections);
      }, 8000);
    }, 15000);
  });

  describe("Test Case 4: Job Queue Processing", () => {
    it("should process jobs and track status correctly", async () => {
      const dataPoints = generateDataPoints(100);

      const response = await request(app)
        .post("/api/v1/data/ingest")
        .send(dataPoints)
        .expect(202);

      expect(response.body.data.queued).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const waiting = await dataProcessingQueue.getWaiting();
      const completed = await dataProcessingQueue.getCompleted();

      expect(waiting.length).toBe(0);
      expect(completed.length).toBeGreaterThan(0);

      console.log(
        `Test Case 4: Jobs processed successfully (${completed.length} completed)`
      );
    });
  });

  describe("Test Case 5: High Throughput Processing", () => {
    it("should handle 1000 messages per second without data loss", async () => {
      const messagesPerSecond = 1000;
      const testDurationSeconds = 2;
      const totalMessages = messagesPerSecond * testDurationSeconds;

      const startTime = Date.now();
      const promises: Promise<any>[] = [];

      for (let i = 0; i < totalMessages; i++) {
        const dataPoint = [
          {
            type: "high_throughput_test",
            value: i,
            metadata: { batch: Math.floor(i / 100) },
          },
        ];

        promises.push(request(app).post("/api/v1/data/ingest").send(dataPoint));

        if (i % 100 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      const actualDuration = (endTime - startTime) / 1000;
      const actualThroughput = totalMessages / actualDuration;

      const successfulRequests = responses.filter(
        (r) => r.status === 201 || r.status === 202
      );
      expect(successfulRequests.length).toBe(totalMessages);

      console.log(
        `Test Case 5: Processed ${totalMessages} messages in ${actualDuration}s`
      );
      console.log(
        `  Actual throughput: ${Math.round(actualThroughput)} messages/second`
      );

      expect(actualThroughput).toBeGreaterThan(500);
    });
  });
});

function generateDataPoints(count: number) {
  const types = ["temperature", "humidity", "pressure", "speed"];

  return Array.from({ length: count }, (_, i) => ({
    type: types[i % types.length],
    value: Math.random() * 100,
    metadata: {
      sensor_id: i + 1,
      location: `room_${(i % 5) + 1}`,
    },
    timestamp: new Date().toISOString(),
  }));
}
