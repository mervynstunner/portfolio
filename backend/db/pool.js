import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required. Copy .env.example to .env and point it at PostgreSQL.");
}

export const pool = new pg.Pool({ connectionString, max: Number(process.env.DB_POOL_MAX || 10) });
