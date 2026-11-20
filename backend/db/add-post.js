// Adds or refreshes X posts from the command line:
//   npm run posts:add -- https://x.com/MervynStunner/status/123 https://x.com/...
import "dotenv/config";
import { pool } from "./pool.js";
import { savePost } from "../routes/posts.js";

const urls = process.argv.slice(2);
if (!urls.length) {
  console.error("Pass one or more X post links: npm run posts:add -- <url> [url...]");
  process.exit(1);
}

let failed = 0;
for (const [index, url] of urls.entries()) {
  try {
    const post = await savePost(url, index);
    console.log(`Saved ${post.url}\n  "${post.text.slice(0, 90)}${post.text.length > 90 ? "…" : ""}"`);
  } catch (error) {
    failed++;
    console.error(`Skipped ${url}: ${error.message}`);
  }
}
await pool.end();
process.exit(failed ? 1 : 0);
