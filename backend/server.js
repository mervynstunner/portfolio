import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { pool } from "./db/pool.js";
import knowledgeRoutes from "./routes/knowledge.js";
import postsRoutes from "./routes/posts.js";
import { startTimelineSync } from "./services/x-timeline.js";

const app = Fastify({ logger: true });
const port = Number(process.env.PORT || 3000);
// Production binds to 127.0.0.1 so only nginx on the same machine can reach it.
const host = process.env.HOST || "0.0.0.0";

await app.register(cors, {
  origin: process.env.ALLOWED_ORIGIN || true,
  methods: ["GET", "POST", "PATCH", "DELETE"],
});

app.get("/health", async () => {
  let database = "connected";
  try {
    await pool.query("select 1");
  } catch {
    database = "disconnected";
  }
  return { status: "ok", database, timestamp: new Date().toISOString() };
});

app.setErrorHandler((error, _request, reply) => {
  if (error.validation) {
    return reply.code(400).send({ error: error.message });
  }
  if (error.statusCode && error.statusCode < 500) {
    return reply.code(error.statusCode).send({ error: error.message });
  }
  if (error.statusCode === 502) {
    return reply.code(502).send({ error: error.message });
  }
  app.log.error(error);
  return reply.code(error.statusCode || 500).send({ error: "Internal server error." });
});

await app.register(knowledgeRoutes);
await app.register(postsRoutes);

// Fail fast if the database is unreachable or the schema hasn't been applied.
await pool.query("select 1 from knowledge_entries, social_posts limit 1");
await app.listen({ port, host });
startTimelineSync(app.log);

const close = async () => {
  await app.close();
  await pool.end();
  process.exit(0);
};
process.once("SIGINT", close);
process.once("SIGTERM", close);
