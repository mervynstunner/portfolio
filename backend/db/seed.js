import "dotenv/config";
import { pool } from "./pool.js";
import entries from "./seed-entries.js";

// Replaces entries with the same title, so running it again updates them
// instead of adding duplicates. Entries added by other means are untouched.
const client = await pool.connect();
try {
  await client.query("begin");
  for (const entry of entries) {
    await client.query("delete from knowledge_entries where lower(title) = lower($1)", [entry.title]);
    await client.query(
      `insert into knowledge_entries (title, type, summary, content, tags, outcomes, published)
       values ($1, $2, $3, $4, $5, $6, true)`,
      [entry.title, entry.type, entry.summary, entry.content, entry.tags, entry.outcomes ?? []]
    );
  }
  await client.query("commit");
  console.log(`Seeded ${entries.length} knowledge entries.`);
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}
