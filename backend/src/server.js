import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { connectDb } from "./config/db.js";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { uploadRouter } from "./routes/upload.js";
import { artemisPublicRouter } from "./routes/artemisPublic.js";
import { artemisInternalRouter } from "./routes/artemisInternal.js";
import { agentTriggerConfigRouter } from "./routes/agentTriggerConfig.js";
import { daveRouter } from "./routes/dave.js";

const app = express();
const port = process.env.PORT || 4000;

app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);

app.use(express.json({ limit: "100mb" }));

const publicDir = path.join(process.cwd(), "public");
app.use("/uploads", express.static(path.join(publicDir, "uploads")));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/artemis", artemisPublicRouter);
app.use("/api/internal/artemis", artemisInternalRouter);
app.use("/api/agent-trigger-config", agentTriggerConfigRouter);
app.use("/api/v2", daveRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

await connectDb();
app.listen(port, () => {
  console.log(`Artemis API listening on http://localhost:${port}`);
});
