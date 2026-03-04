import app from "./server.js";
import { connectDB } from "./database.js";
import http from "http";
import { Server } from "socket.io";
import { startRecommendationsCron } from "./jobs/recommendations.cron.js";

const start = async () => {
  await connectDB();
  startRecommendationsCron();

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: "*" },
  });

  app.set("io", io);

  io.on("connection", (socket) => {
    console.log("✅ Socket conectado:", socket.id);

    socket.on("join-user-room", (userId) => {
      socket.join(`user:${userId}`);
      console.log("👥 joined:", `user:${userId}`);
    });

    // --- NUEVOS EVENTOS DE COLABORACIÓN ---

    // 2. Sincronizar APERTURA de ventanas
    socket.on("window-open", (payload) => {
      const { userId, windowData } = payload;
      // socket.to(...) envía a todos MENOS al que lo envió (para no duplicar ventana al que hizo clic)
      socket.to(`user:${userId}`).emit("window-open", windowData);
    });

    // 3. Sincronizar MOVIMIENTO de ventanas
    socket.on("window-move", (payload) => {
      const { userId, windowId, position } = payload; // position: {x, y}
      socket.to(`user:${userId}`).emit("window-move", { windowId, position });
    });

    // 4. Sincronizar CIERRE de ventanas
    socket.on("window-close", (payload) => {
      const { userId, windowId } = payload;
      socket.to(`user:${userId}`).emit("window-close", { windowId });
    });

    // 5. Sincronizar ESCRITURA (Contenido de archivos)
    socket.on("file-change", (payload) => {
      const { userId, fileId, content } = payload;
      socket.to(`user:${userId}`).emit("file-change", { fileId, content });
    });

    // 6. Sincronizar CÓDIGO (VS Code Sim)
    socket.on("code-change", (payload) => {
      const { userId, content, language } = payload;
      socket.to(`user:${userId}`).emit("code-change", { content, language });
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket desconectado:", socket.id);
    });
  });

  server.listen(app.get("port"), () => {
    console.log(`server ok on http://localhost:${app.get("port")}`);
  });
};

start();
