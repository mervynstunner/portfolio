import "dotenv/config";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { pool } from "./pool.js";

const DATABASE_MISSING = "3D000";

// Creates the database named in DATABASE_URL by connecting to the server's
// default "postgres" database first.
async function createDatabase() {
  const url = new URL(process.env.DATABASE_URL);
  const name = decodeURIComponent(url.pathname.slice(1));
  url.pathname = "/postgres";

  const admin = new pg.Client({ connectionString: url.toString() });
  await admin.connect();
  try {
    await admin.query(`create database "${name.replaceAll('"', '""')}"`);
    console.log(`Created database "${name}".`);
  } finally {
    await admin.end();
  }
}

const schema = await readFile(new URL("./schema.sql", import.meta.url), "utf8");

try {
  try {
    await pool.query("select 1");
  } catch (error) {
    if (error.code !== DATABASE_MISSING) throw error;
    await createDatabase();
  }
  await pool.query(schema);
  console.log("Database schema is up to date.");
} finally {
  await pool.end();
}
