export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ??
  "http://localhost:3001";

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, "") ??
  "ws://localhost:3001/ws";
