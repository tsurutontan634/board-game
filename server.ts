/**
 * カスタムサーバー (Next.js + Socket.IO)
 * PORT 環境変数で起動ポートを設定可能 (Railway は自動で PORT を注入する)
 */

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./server/gameLogic";
import type { ClientToServerEvents, ServerToClientEvents } from "./lib/types";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";

console.log(`[server] Starting... PORT=${PORT} NODE_ENV=${process.env.NODE_ENV}`);

const app = next({ dev, hostname, port: PORT });
const handle = app.getRequestHandler();

app.prepare()
  .then(() => {
    const httpServer = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    });

    const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
      path: "/api/socket",
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    registerSocketHandlers(io);

    httpServer.listen(PORT, hostname, () => {
      console.log(`> Ready on http://${hostname}:${PORT} [${dev ? "dev" : "prod"}]`);
    });
  })
  .catch((err) => {
    console.error("[server] Failed to start:", err);
    process.exit(1);
  });
