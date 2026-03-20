import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import "./db"; // inicializa la base de datos
import roomsRouter from "./routes/rooms";
import jiraRouter from "./routes/jira";
import retrosRouter from "./routes/retros";
import { registerSocketHandlers } from "./socket";

const PORT = process.env.PORT ?? 3000;

const app = express();
const httpServer = createServer(app);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

app.use(express.json());

// API REST
app.use("/api/rooms", roomsRouter);
app.use("/api/jira", jiraRouter);
app.use("/api/retros", retrosRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Archivos estáticos del cliente — en prod se copian a dist/public/
const clientDist = path.join(__dirname, "public");
app.use(express.static(clientDist));

// Fallback SPA
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
