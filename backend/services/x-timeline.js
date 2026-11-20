// Pulls the latest original posts (no replies or reposts) for one account
// through the official X API v2.
//
// Auth, in order of preference:
//   1. X_BEARER_TOKEN (app-only token from the developer portal), or
//   2. OAuth 2.0 user tokens: X_ACCESS_TOKEN + X_REFRESH_TOKEN, renewed with
//      X_CLIENT_ID + X_CLIENT_SECRET. X rotates the refresh token on each
//      renewal, so the latest pair is kept in the x_oauth_tokens table.
import { pool } from "../db/pool.js";

const API = "https://api.x.com/2";

export function hasXCredentials() {
  return Boolean(process.env.X_BEARER_TOKEN || process.env.X_REFRESH_TOKEN);
}

async function storedTokens() {
  const { rows } = await pool.query("select access_token, refresh_token, expires_at from x_oauth_tokens");
  if (rows.length) return rows[0];
  if (!process.env.X_REFRESH_TOKEN) return null;
  // First run: seed from .env. Treat the access token as possibly stale.
  return {
    access_token: process.env.X_ACCESS_TOKEN || "",
    refresh_token: process.env.X_REFRESH_TOKEN,
    expires_at: new Date(0),
  };
}

async function refreshTokens(refreshToken) {
  const { X_CLIENT_ID: clientId, X_CLIENT_SECRET: clientSecret } = process.env;
  if (!clientId) throw new Error("X_CLIENT_ID is needed to renew the X access token.");

  const headers = { "content-type": "application/x-www-form-urlencoded" };
  if (clientSecret) headers.authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;

  const response = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers,
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId }),
    signal: AbortSignal.timeout(10000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    throw new Error(`X token renewal failed (${response.status}): ${body.error_description || body.error || "no access token returned"}. Generate new tokens in the portal and update X_ACCESS_TOKEN / X_REFRESH_TOKEN.`);
  }

  const tokens = {
    access_token: body.access_token,
    refresh_token: body.refresh_token || refreshToken,
    expires_at: new Date(Date.now() + (Number(body.expires_in) || 7200) * 1000),
  };
  await pool.query(
    `insert into x_oauth_tokens (id, access_token, refresh_token, expires_at) values (true, $1, $2, $3)
     on conflict (id) do update set access_token = excluded.access_token, refresh_token = excluded.refresh_token,
       expires_at = excluded.expires_at, updated_at = now()`,
    [tokens.access_token, tokens.refresh_token, tokens.expires_at]
  );
  return tokens;
}

async function accessToken({ forceRefresh = false } = {}) {
  if (process.env.X_BEARER_TOKEN) return process.env.X_BEARER_TOKEN;
  const tokens = await storedTokens();
  if (!tokens) throw new Error("Set X_BEARER_TOKEN, or X_REFRESH_TOKEN with X_CLIENT_ID and X_CLIENT_SECRET, in backend/.env.");
  const fresh = tokens.access_token && new Date(tokens.expires_at).getTime() - Date.now() > 60_000;
  if (fresh && !forceRefresh) return tokens.access_token;
  return (await refreshTokens(tokens.refresh_token)).access_token;
}

function decode(text) {
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

async function x(path) {
  const call = async (token) =>
    fetch(`${API}${path}`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) });

  let response = await call(await accessToken());
  // A user access token can be revoked or expire early; renew once and retry.
  if (response.status === 401 && !process.env.X_BEARER_TOKEN) {
    response = await call(await accessToken({ forceRefresh: true }));
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`X API ${response.status}: ${detail.slice(0, 200)}`);
  }
  return response.json();
}

export async function syncTimeline({ handle = process.env.X_HANDLE, limit = 10 } = {}) {
  if (!handle) throw new Error("X_HANDLE is not set in backend/.env.");

  const { data: user } = await x(`/users/by/username/${encodeURIComponent(handle)}?user.fields=name`);
  if (!user) throw new Error(`X has no account called @${handle}.`);

  const params = new URLSearchParams({
    max_results: String(Math.min(Math.max(limit, 5), 100)),
    exclude: "replies,retweets",
    "tweet.fields": "created_at",
  });
  const { data: posts = [] } = await x(`/users/${user.id}/tweets?${params}`);

  for (const post of posts) {
    const postedAt = new Date(post.created_at);
    await pool.query(
      `insert into social_posts (post_id, url, handle, author_name, text, posted_on, created_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (post_id) do update
         set text = excluded.text, author_name = excluded.author_name, handle = excluded.handle, fetched_at = now()`,
      [
        post.id,
        `https://x.com/${user.username}/status/${post.id}`,
        user.username,
        user.name,
        decode(post.text),
        postedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }),
        postedAt,
      ]
    );
  }
  return posts.length;
}

// Keeps the cards fresh while the server runs. Off when no token is set.
export function startTimelineSync(log) {
  if (!hasXCredentials()) return;
  const hours = Math.max(Number(process.env.X_SYNC_HOURS) || 6, 1);
  const run = () =>
    syncTimeline()
      .then((count) => log.info(`Synced ${count} posts from X.`))
      .catch((error) => log.warn(`X sync failed: ${error.message}`));
  run();
  setInterval(run, hours * 60 * 60 * 1000).unref();
}
