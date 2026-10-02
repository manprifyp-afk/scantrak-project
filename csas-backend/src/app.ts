// IMPORTANT: this import patches Express so errors thrown inside async route
// handlers are forwarded to the error handler instead of hanging the request.
// It must run before the routes are defined.
import "express-async-errors";

import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import { authRouter } from "./routes/auth.routes";
import { courseRouter } from "./routes/courses.routes";
import { sessionRouter } from "./routes/session.routes";
import { attendanceRouter } from "./routes/attendance.routes";
import { reportRouter } from "./routes/reports.routes";
import { adminRouter } from "./routes/admin.routes";
import { notFound, errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN === "*" ? true : config.CORS_ORIGIN.split(",") }));
  app.use(express.json());
  if (config.NODE_ENV !== "test") app.use(morgan("dev"));

  app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

  app.use("/auth", authRouter);
  app.use("/courses", courseRouter);
  app.use("/sessions", sessionRouter);
  app.use("/attendance", attendanceRouter);
  app.use("/reports", reportRouter);
  app.use("/admin", adminRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
