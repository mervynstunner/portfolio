import { pool } from "../db/pool.js";
import { fetchPost } from "../services/x-posts.js";
import { requireAdmin } from "./admin.js";

const COLUMNS = `id, post_id as "postId", url, handle, author_name as "authorName", text,
  posted_on as "postedOn", position, published, fetched_at as "fetchedAt"`;

export async function savePost(url, position = 0) {
  const post = await fetchPost(url);
  const { rows } = await pool.query(
    `insert into social_posts (post_id, url, handle, author_name, text, posted_on, position)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (post_id) do update
       set url = excluded.url, handle = excluded.handle, author_name = excluded.author_name,
           text = excluded.text, posted_on = excluded.posted_on, fetched_at = now()
     returning ${COLUMNS}`,
    [post.postId, post.url, post.handle, post.authorName, post.text, post.postedOn, position]
  );
  return rows[0];
}

const idParams = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string", format: "uuid" } },
};

export default async function postsRoutes(fastify) {
  fastify.get(
    "/api/posts",
    { schema: { querystring: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 24, default: 6 } } } } },
    async (request, reply) => {
      const { rows } = await pool.query(
        `select ${COLUMNS} from social_posts where published
         order by position, created_at desc limit $1`,
        [request.query.limit]
      );
      reply.header("cache-control", "public, max-age=300");
      return rows;
    }
  );

  fastify.post(
    "/api/posts",
    {
      preHandler: requireAdmin,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["url"],
          properties: {
            url: { type: "string", maxLength: 300 },
            position: { type: "integer", minimum: 0, maximum: 1000, default: 0 },
          },
        },
      },
    },
    async (request, reply) => reply.code(201).send(await savePost(request.body.url, request.body.position))
  );

  fastify.patch(
    "/api/posts/:id",
    {
      preHandler: requireAdmin,
      schema: {
        params: idParams,
        body: {
          type: "object",
          additionalProperties: false,
          minProperties: 1,
          properties: {
            position: { type: "integer", minimum: 0, maximum: 1000 },
            published: { type: "boolean" },
          },
        },
      },
    },
    async (request, reply) => {
      const { position = null, published = null } = request.body;
      const { rows } = await pool.query(
        `update social_posts set position = coalesce($2, position), published = coalesce($3, published)
         where id = $1 returning ${COLUMNS}`,
        [request.params.id, position, published]
      );
      if (!rows.length) return reply.code(404).send({ error: "Post not found." });
      return rows[0];
    }
  );

  fastify.delete(
    "/api/posts/:id",
    { preHandler: requireAdmin, schema: { params: idParams } },
    async (request, reply) => {
      const { rowCount } = await pool.query("delete from social_posts where id = $1", [request.params.id]);
      if (!rowCount) return reply.code(404).send({ error: "Post not found." });
      return { deleted: true };
    }
  );

  // Re-reads every post from X, e.g. after editing one.
  fastify.post("/api/posts/refresh", { preHandler: requireAdmin }, async () => {
    const { rows } = await pool.query("select url, position from social_posts");
    const results = await Promise.allSettled(rows.map((row) => savePost(row.url, row.position)));
    return {
      refreshed: results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").map((r) => r.reason.message),
    };
  });
}
