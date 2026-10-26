import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import path from "path";
import { createServer as createViteServer } from "vite";
import { apiRouter } from "./src/routes.ts";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(
    cors({
      origin: process.env.FRONTEND_URL || true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));

  // Mount REST API routes under /api
  app.use("/api", apiRouter);

  // Centralized API Error Handler
  app.use("/api", (err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("API Error:", err);
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: err.message || "An unexpected server error occurred.",
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SSMIET HallSync AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
