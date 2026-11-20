// Pulls your latest X posts now: npm run posts:sync
import "dotenv/config";
import { pool } from "./pool.js";
import { syncTimeline } from "../services/x-timeline.js";

try {
  const count = await syncTimeline();
  console.log(`Synced ${count} posts from @${process.env.X_HANDLE}.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
