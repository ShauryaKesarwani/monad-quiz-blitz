import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ServerWebSocket } from "bun";
import { handleWSMessage, handleWSClose } from "./routes/ws";
import { matchStore } from "./state/matches";

const app = new Hono();

// Enable CORS for all routes
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  }),
);

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: Date.now() });
});

// Get all active matches
app.get("/api/matches", (c) => {
  const matches = matchStore.getActiveMatches();
  return c.json({ matches });
});

// Get specific match
app.get("/api/matches/:id", (c) => {
  const matchId = c.req.param("id");
  const match = matchStore.getMatch(matchId);

  if (!match) {
    return c.json({ error: "Match not found" }, 404);
  }

  return c.json({ match });
});

// Create new match (returns match ID for WebSocket connection)
app.post("/api/matches", async (c) => {
  const matchId = Math.random().toString(36).substring(2, 15);
  return c.json({ matchId });
});

// Start the server with WebSocket support
const server = Bun.serve({
  port: process.env.PORT || 3001,
  fetch(req, server) {
    const url = new URL(req.url);

    // Upgrade to WebSocket for /ws endpoint
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      if (!upgraded) {
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return undefined;
    }

    // Handle HTTP requests with Hono
    return app.fetch(req, { IP: server.requestIP(req) });
  },
  websocket: {
    open(ws: ServerWebSocket) {
      console.log("WebSocket connection opened");
    },
    message(ws: ServerWebSocket, message: string | Buffer) {
      const messageStr =
        typeof message === "string" ? message : message.toString();
      handleWSMessage(ws, messageStr);
    },
    close(ws: ServerWebSocket, code?: number, reason?: string) {
      if (code && code !== 1000) {
        console.warn(
          `WebSocket closed abnormally: code=${code} reason=${reason ?? ""}`,
        );
      } else {
        console.log("WebSocket connection closed");
      }

      handleWSClose(ws);
    },
  },
});

console.log(`🚀 Stake Study Server running on http://localhost:${server.port}`);
console.log(`📡 WebSocket endpoint: ws://localhost:${server.port}/ws`);
