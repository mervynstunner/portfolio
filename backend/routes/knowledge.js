import { pool } from "../db/pool.js";
import { requireAdmin } from "./admin.js";

const STOPWORDS = new Set(
  "have does about what with your from this that they them their there which would could should into than then when where also just like make made built build done ever know tell please mervyn hello thanks".split(" ")
);

// Words worth fuzzy-matching: four letters or more, not filler.
function keywords(query) {
  return [...new Set(query.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [])].filter((w) => !STOPWORDS.has(w)).slice(0, 8);
}

const TYPES = ["work", "problem", "lesson", "speciality", "process"];

const COLUMNS = `id, title, type, summary, content, tags, outcomes, published,
  created_at as "createdAt", updated_at as "updatedAt"`;

const text = { type: "string", minLength: 1, maxLength: 20000 };
const list = { type: "array", items: { type: "string", minLength: 1, maxLength: 200 }, maxItems: 50, default: [] };

const entryBody = {
  type: "object",
  additionalProperties: false,
  required: ["title", "type", "summary", "content"],
  properties: {
    title: { ...text, maxLength: 200 },
    type: { type: "string", enum: TYPES },
    summary: { ...text, maxLength: 1000 },
    content: text,
    tags: list,
    outcomes: list,
    published: { type: "boolean", default: true },
  },
};

const idParams = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string", format: "uuid" } },
};

function clean(body) {
  return {
    title: body.title.trim(),
    type: body.type,
    summary: body.summary.trim(),
    content: body.content.trim(),
    tags: [...new Set(body.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))],
    outcomes: body.outcomes.map((outcome) => outcome.trim()).filter(Boolean),
    published: body.published,
  };
}


export default async function knowledgeRoutes(fastify) {
  fastify.get(
    "/api/knowledge",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            type: { type: "string", enum: TYPES },
            tag: { type: "string", maxLength: 200 },
            published: { type: "string", enum: ["true", "false"] },
          },
        },
      },
    },
    async (request) => {
      const { type, tag, published } = request.query;
      const where = [];
      const values = [];

      if (type) {
        values.push(type);
        where.push(`type = $${values.length}`);
      }
      if (tag) {
        values.push(tag.toLowerCase());
        where.push(`$${values.length} = any(tags)`);
      }
      if (published !== "false") where.push("published");

      const { rows } = await pool.query(
        `select ${COLUMNS} from knowledge_entries
         ${where.length ? `where ${where.join(" and ")}` : ""}
         order by updated_at desc`,
        values
      );
      return rows;
    }
  );

  fastify.get(
    "/api/knowledge/search",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            q: { type: "string", maxLength: 500, default: "" },
            limit: { type: "integer", minimum: 1, maximum: 10, default: 5 },
          },
        },
      },
    },
    async (request) => {
      const query = request.query.q.trim();
      if (!query) return [];

      // Full-text match first. For typos ("embeded"), each meaningful word is
      // also compared by trigram similarity against titles and tags.
      const words = keywords(query);
      const { rows } = await pool.query(
        `select id, title, type, summary, content, tags, outcomes
         from (
           select *,
                  case when search @@ q then ts_rank(search, q) else 0 end as rank,
                  search @@ q as matched,
                  coalesce((select max(word_similarity(w, title || ' ' || knowledge_tags_text(tags)))
                            from unnest($3::text[]) as w), 0) as fuzzy
           from knowledge_entries, websearch_to_tsquery('english', $1) as q
           where published
         ) scored
         where matched or fuzzy >= 0.55
         order by rank + fuzzy * 0.5 desc, updated_at desc
         limit $2`,
        [query, request.query.limit, words]
      );
      return rows;
    }
  );

  fastify.post(
    "/api/knowledge",
    { preHandler: requireAdmin, schema: { body: entryBody } },
    async (request, reply) => {
      const entry = clean(request.body);
      const { rows } = await pool.query(
        `insert into knowledge_entries (title, type, summary, content, tags, outcomes, published)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning ${COLUMNS}`,
        [entry.title, entry.type, entry.summary, entry.content, entry.tags, entry.outcomes, entry.published]
      );
      return reply.code(201).send(rows[0]);
    }
  );

  fastify.patch(
    "/api/knowledge/:id",
    { preHandler: requireAdmin, schema: { params: idParams, body: entryBody } },
    async (request, reply) => {
      const entry = clean(request.body);
      const { rows } = await pool.query(
        `update knowledge_entries
         set title = $2, type = $3, summary = $4, content = $5, tags = $6, outcomes = $7,
             published = $8, updated_at = now()
         where id = $1
         returning ${COLUMNS}`,
        [request.params.id, entry.title, entry.type, entry.summary, entry.content, entry.tags, entry.outcomes, entry.published]
      );
      if (!rows.length) return reply.code(404).send({ error: "Knowledge entry not found." });
      return rows[0];
    }
  );

  fastify.delete(
    "/api/knowledge/:id",
    { preHandler: requireAdmin, schema: { params: idParams } },
    async (request, reply) => {
      const { rowCount } = await pool.query("delete from knowledge_entries where id = $1", [request.params.id]);
      if (!rowCount) return reply.code(404).send({ error: "Knowledge entry not found." });
      return { deleted: true };
    }
  );
}
