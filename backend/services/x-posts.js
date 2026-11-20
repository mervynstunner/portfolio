// Reads a public X post through X's oEmbed endpoint (no API key needed) and
// turns the returned blockquote into plain text we can style ourselves.

const STATUS_URL = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d{1,25})/;

export function parsePostUrl(input) {
  const match = STATUS_URL.exec(String(input).trim());
  if (!match) return null;
  const [, handle, postId] = match;
  return { handle, postId, url: `https://x.com/${handle}/status/${postId}` };
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–", hellip: "…" };

function decode(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

function toText(html) {
  return decode(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function parseOembed(data) {
  const html = String(data?.html ?? "");
  const paragraph = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(html);
  // The last link in the blockquote is the post's date, e.g. "March 21, 2006".
  const links = [...html.matchAll(/<a [^>]*>([^<]*)<\/a>/gi)];
  const postedOn = links.length ? decode(links[links.length - 1][1]).trim() : null;

  return {
    authorName: String(data?.author_name ?? "").trim(),
    text: paragraph ? toText(paragraph[1]) : "",
    postedOn: postedOn || null,
  };
}

export async function fetchPost(url) {
  const parsed = parsePostUrl(url);
  if (!parsed) throw Object.assign(new Error("That isn't an X post link."), { statusCode: 400 });

  const endpoint = new URL("https://publish.twitter.com/oembed");
  endpoint.searchParams.set("url", parsed.url.replace("https://x.com/", "https://twitter.com/"));
  endpoint.searchParams.set("omit_script", "true");
  endpoint.searchParams.set("dnt", "true");

  const response = await fetch(endpoint, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 404) {
    throw Object.assign(new Error("X couldn't find that post. It may be deleted or from a private account."), { statusCode: 404 });
  }
  if (!response.ok) {
    throw Object.assign(new Error(`X returned ${response.status} for that post.`), { statusCode: 502 });
  }

  const post = parseOembed(await response.json());
  if (!post.text) throw Object.assign(new Error("X returned a post with no text."), { statusCode: 502 });
  return { ...parsed, ...post };
}
