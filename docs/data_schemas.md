# Data Schemas

Database is **PostgreSQL 16**, accessed through SQLAlchemy 2.0 declarative
models in `backend/models/`. All UUID-style ids are stored as
`String(36)` for portability; the legacy `users.id` uses a short
`u-xxxxxxxx` prefix from the original design.

## Tables

### `users`

Authenticated accounts. Used as the FK target for chats, tickets and
attachments.

| Column          | Type                          | Notes                                |
| --------------- | ----------------------------- | ------------------------------------ |
| `id`            | `varchar(64)` PK              | `u-<8 hex>` (e.g. `u-1a2b3c4d`).     |
| `full_name`     | `varchar(255)` not null       |                                      |
| `email`         | `varchar(255)` unique, indexed| Lower-cased on insert.               |
| `password_hash` | `varchar(255)` not null       | bcrypt via passlib.                  |
| `role`          | `varchar(32)` not null        | `client` (default) or `admin`.       |
| `created_at`    | `timestamptz` not null        | Server default `now()`.              |

### `chats`

A conversation owned by one user. Drives the ticketing lifecycle.

| Column        | Type                          | Notes                                                                           |
| ------------- | ----------------------------- | ------------------------------------------------------------------------------- |
| `id`          | `varchar(36)` PK              | UUID v4 string.                                                                 |
| `user_id`     | `varchar(64)` not null, FK→`users.id` (cascade), indexed |                                                      |
| `status`      | `varchar(32)` not null        | One of `active`, `waiting_confirmation`, `draft`, `closed`. Default `active`.   |
| `created_at`  | `timestamptz` not null        | Server default `now()`.                                                         |
| `updated_at`  | `timestamptz` not null        | Server default `now()`, `onupdate=now()`. Touched whenever a message is saved.  |

Indexes: composite `(user_id, status)` for fast `GET /api/drafts`.

#### Status transitions

```
                    user sends message
   (start) ─────────────────────────────► active
   active ── AI replies with summary ───► waiting_confirmation
   waiting_confirmation ── confirm yes ─► closed   (creates a ticket)
   waiting_confirmation ── confirm no  ─► active
   active|waiting_confirmation ── leave ► draft
   draft ── /chats/:id/resume          ─► active
   closed ─────── (terminal) ──────────► closed
```

### `messages`

One utterance in a chat. User and AI messages share this table; the
`sender` column distinguishes them.

| Column            | Type                          | Notes                                                                                  |
| ----------------- | ----------------------------- | -------------------------------------------------------------------------------------- |
| `id`              | `varchar(36)` PK              | UUID v4 string.                                                                        |
| `chat_id`         | `varchar(36)` not null, FK→`chats.id` (cascade), indexed |                                                              |
| `sender`          | `varchar(16)` not null        | `user` or `ai`.                                                                        |
| `content`         | `text` not null               | Plain text. AI streamed chunks are concatenated server-side before persistence.        |
| `ai_answer_type`  | `varchar(16)` not null        | `normal` (default) or `summary`. Only meaningful for AI messages.                      |
| `created_at`      | `timestamptz` not null        | Server default `now()`. Used as the chronological sort key.                            |

A message with `sender='ai'` and `ai_answer_type='summary'` is what
flips the parent chat to `waiting_confirmation`.

### `attachments`

Files (images, PDFs, text) uploaded by a user and attached to a
message. Files live on local disk under `UPLOAD_DIR`; this row tracks
metadata and the relative path.

| Column         | Type                          | Notes                                                                                   |
| -------------- | ----------------------------- | --------------------------------------------------------------------------------------- |
| `id`           | `varchar(36)` PK              | UUID v4 string.                                                                         |
| `chat_id`      | `varchar(36)` not null, FK→`chats.id` (cascade), indexed |                                                              |
| `message_id`   | `varchar(36)` nullable, FK→`messages.id` (cascade), indexed | Null until the user sends the message that references it. |
| `user_id`      | `varchar(64)` not null, FK→`users.id` (cascade), indexed | Owner; used for download authorisation.                       |
| `filename`     | `varchar(255)` not null       | Original filename submitted by the client.                                              |
| `mime_type`    | `varchar(127)` not null       | Must start with `image/`, `application/pdf` or `text/`.                                 |
| `size_bytes`   | `bigint` not null             | Capped at `MAX_UPLOAD_BYTES`.                                                           |
| `storage_path` | `varchar(512)` not null       | Path **relative to `UPLOAD_DIR`** (`<userId>/<chatId>/<attachmentId>_<safe_filename>`). |
| `created_at`   | `timestamptz` not null        | Server default `now()`.                                                                 |

### `tickets`

Materialised when the user accepts the AI's summary. The chat is
closed in the same transaction.

| Column        | Type                          | Notes                                                                |
| ------------- | ----------------------------- | -------------------------------------------------------------------- |
| `id`          | `varchar(36)` PK              | UUID v4 string.                                                      |
| `chat_id`     | `varchar(36)` not null, FK→`chats.id` (cascade), indexed | Source chat. Always `closed` once the ticket exists.        |
| `user_id`     | `varchar(64)` not null, FK→`users.id` (cascade), indexed |                                                              |
| `summary`     | `text` not null               | Copy of the latest summary message at confirmation time.            |
| `status`      | `varchar(16)` not null        | `open` (default) or `closed`.                                       |
| `created_at`  | `timestamptz` not null        | Server default `now()`.                                              |

## Entity diagram

```
users (1) ────< chats (1) ────< messages (1) ────< attachments
   │              │
   │              └────< tickets
   │
   └────< tickets        (denormalised user_id for fast per-user listing)
   └────< attachments    (denormalised user_id for ownership checks)
```

`tickets.user_id` and `attachments.user_id` are denormalised copies of
`chats.user_id` to avoid a join on every authorisation check.

## API DTO mapping

JSON returned to the frontend uses **camelCase** while the database
uses **snake_case**. The mapping for messages is:

| DB column         | JSON field        |
| ----------------- | ----------------- |
| `id`              | `id`              |
| `chat_id`         | `chatId`          |
| `sender`          | `sender`          |
| `content`         | `content`         |
| `ai_answer_type`  | `aiAnswerType`    |
| `created_at`      | `createdAt` (ISO 8601 string) |
| —                 | `attachments` (array of attachment DTOs, see below) |

Attachment DTO:

```json
{
  "id": "…",
  "filename": "screenshot.png",
  "mimeType": "image/png",
  "sizeBytes": 12345,
  "url": "/api/uploads/<id>"
}
```

Chat DTO:

```json
{
  "id": "…",
  "userId": "u-…",
  "status": "active | waiting_confirmation | draft | closed",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

Ticket DTO (from `GET /api/tickets`):

```json
{
  "id": "…",
  "chatId": "…",
  "userId": "u-…",
  "summary": "…",
  "status": "open | closed",
  "createdAt": "ISO-8601",
  "messages": [ /* full chat history including attachments */ ],
  "messageCount": 7
}
```

## Constants

Defined in `backend/models/chat.py`:

- `CHAT_STATUSES = { active, waiting_confirmation, draft, closed }`
- `SENDERS = { user, ai }`
- `AI_ANSWER_TYPES = { normal, summary }`
- `TICKET_STATUSES = { open, closed }`

## Initial schema creation

`python backend/init_db.py` runs `Base.metadata.create_all(engine)` and
is safe to re-run; it only creates missing tables. Migrations are not
yet wired (Alembic etc.) — for schema changes during development,
drop/recreate tables in your Supabase database, then run `init_db.py` again.
