-- Knowledge base behind the site's "Ask Mervyn" assistant.
-- Safe to run more than once.

-- Trigram matching lets search forgive typos ("embeded" finds "embedded").
create extension if not exists pg_trgm;

-- array_to_string isn't marked immutable, so generated columns can't call it directly.
create or replace function knowledge_tags_text(tags text[]) returns text
  language sql immutable parallel safe
  as $$ select array_to_string(tags, ' ') $$;

create table if not exists knowledge_entries (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(trim(title)) > 0),
  type        text not null check (type in ('work', 'problem', 'lesson', 'speciality', 'process')),
  summary     text not null check (length(trim(summary)) > 0),
  content     text not null check (length(trim(content)) > 0),
  tags        text[] not null default '{}',
  outcomes    text[] not null default '{}',
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  search      tsvector generated always as (
    setweight(to_tsvector('english', title), 'A') ||
    setweight(to_tsvector('english', summary), 'B') ||
    setweight(to_tsvector('english', knowledge_tags_text(tags)), 'B') ||
    setweight(to_tsvector('english', content), 'C')
  ) stored
);

create index if not exists knowledge_entries_search_idx on knowledge_entries using gin (search);
create index if not exists knowledge_entries_tags_idx on knowledge_entries using gin (tags);
create index if not exists knowledge_entries_type_idx on knowledge_entries (type) where published;

-- X (Twitter) posts shown on the site. Text and date are cached from X's
-- public oEmbed endpoint when a post is added or refreshed.
create table if not exists social_posts (
  id          uuid primary key default gen_random_uuid(),
  post_id     text not null unique check (post_id ~ '^[0-9]{1,25}$'),
  url         text not null,
  handle      text not null,
  author_name text not null,
  text        text not null,
  posted_on   text,
  position    integer not null default 0,
  published   boolean not null default true,
  fetched_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists social_posts_order_idx on social_posts (position, created_at desc) where published;

-- X OAuth 2.0 tokens. X rotates the refresh token on every use, so the
-- current pair lives here rather than in .env.
create table if not exists x_oauth_tokens (
  id            boolean primary key default true check (id),
  access_token  text not null,
  refresh_token text not null,
  expires_at    timestamptz not null,
  updated_at    timestamptz not null default now()
);

create index if not exists knowledge_entries_fuzzy_idx on knowledge_entries
  using gin ((title || ' ' || knowledge_tags_text(tags)) gin_trgm_ops);
