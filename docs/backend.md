# Backend Documentation

FastAPI service for the Smart Feedback Management System. It powers
authentication, the AI chat / ticketing flow, file uploads and the
admin / client read APIs.

- **Stack:** Python 3.11+, FastAPI, SQLAlchemy 2.0, PostgreSQL 16
  (Supabase), JWT (HS256), IBM watsonx.ai (mockable).
- **Entry point:** `backend/main.py` (`uvicorn main:app --reload --port 8000`).
- **Database init:** `python backend/init_db.py` (idempotent).

## Project layout

```
backend/
├── main.py            # FastAPI app + router wiring
├── config.py          # Env-driven settings (DB, JWT, watsonx, uploads)
├── db.py              # SQLAlchemy engine, session factory, Base
├── init_db.py         # Create all tables
├── watsonx_client.py  # IBM watsonx.ai wrapper with MOCK_MODE
├── models/            # ORM models (one per table)
│   ├── user.py
│   └── chat.py        # Chat, Message, Attachment, Ticket
├── services/          # Business logic — no HTTP code in here
│   ├── security.py            # password hashing + JWT helpers
│   ├── user_store.py          # user CRUD
│   ├── chat_service.py        # chat lifecycle + access rules
│   ├── ai_service.py          # watsonx integration + streaming
│   ├── attachment_service.py  # file storage + linking
│   └── ticket_service.py      # read helpers for tickets
└── routes/            # HTTP controllers — only parse + delegate
    ├── auth.py
    ├── chats.py       # /api/chats, /api/messages, /api/confirm, …
    ├── uploads.py     # /api/uploads (multipart), /api/uploads/{id}
    ├── tickets.py     # /api/tickets, /api/tickets/{id}
    └── feedback.py    # legacy demo endpoint
```

### Layering rules

- `routes/*` parse requests, call `services/*`, serialise responses. No
  ORM queries here other than calling helpers.
- `services/*` own all rules (status transitions, ownership, ticket
  creation). They raise typed errors (e.g. `ChatError`,
  `AttachmentError`) carrying an HTTP status hint.
- `models/*` are pure SQLAlchemy declarations.

## Configuration (`backend/.env`)

| Variable                | Default                                                 | Purpose                                              |
| ----------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| `DATABASE_URL`          | `postgresql+psycopg://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres` | SQLAlchemy connection string.                        |
| `JWT_SECRET`            | `dev-secret-change-me`                                  | HMAC key for access tokens.                          |
| `JWT_ALGORITHM`         | `HS256`                                                 | JWT signing algorithm.                               |
| `JWT_EXPIRES_MINUTES`   | `60`                                                    | Default access-token lifetime.                       |
| `WATSONX_API_KEY`       | empty                                                   | IBM watsonx.ai key (only used when not mocking).     |
| `WATSONX_PROJECT_ID`    | empty                                                   | watsonx project id.                                  |
| `WATSONX_URL`           | `https://us-south.ml.cloud.ibm.com`                     | watsonx region endpoint.                             |
| `WATSONX_MODEL_ID`      | `ibm/granite-3-8b-instruct`                             | Model used when not mocking.                         |
| `MOCK_MODE`             | `true`                                                  | When true, AI replies are deterministic mocks.       |
| `UPLOAD_DIR`            | `backend/data/uploads`                                  | Local filesystem root for chat attachments.          |
| `MAX_UPLOAD_BYTES`      | `10485760` (10 MB)                                      | Hard size cap per uploaded file.                     |

## Authentication

- `POST /api/auth/signup` and `POST /api/auth/login` issue an HS256 JWT
  in the `accessToken` field.
- Every other endpoint (except `/health`, `/feedback*`,
  `/api/auth/forgot-password`) requires `Authorization: Bearer <token>`.
- Stale / expired tokens return **401**. The frontend's
  `lib/chatApi.js` clears the local session and redirects to `/login`
  on any 401.
- The `User.role` claim controls admin-only endpoints
  (`GET /api/auth/users`).

## Chat & ticket flow

```text
POST /api/chats               → Chat(active)
POST /api/messages            → user Message saved → AI reply streamed (SSE)
                                if AI reply is a "summary":
                                  Chat.status = waiting_confirmation
POST /api/confirm  { yes }    → Ticket(open) created, Chat.status = closed
POST /api/confirm  { no  }    → Chat.status = active (continue)
POST /chats/:id/draft         → Chat.status = draft (idempotent, skipped if closed)
POST /chats/:id/resume        → draft → active
GET  /drafts                  → list of user's draft chats
GET  /chats/:id/messages      → full history (ownership enforced)
GET  /tickets                 → user's tickets + chat history + attachments
GET  /tickets/:id             → single ticket
POST /api/uploads             → save file to disk, return attachment id
GET  /api/uploads/:id         → stream file (ownership enforced)
```

### AI integration (`services/ai_service.py`)

- Builds a prompt: system instruction + transcript + new user turn.
- The system prompt asks the model to prefix any "ready-to-ticket"
  reply with the literal token `[SUMMARY]`. The service strips that
  marker and tags the message as `ai_answer_type = "summary"`.
- In `MOCK_MODE`, a keyword fallback also flags a reply as a summary
  when the user message contains `summary`, `summarize`,
  `create ticket`, `open ticket`, etc.
- Streaming: `ai_service.stream(...)` returns an iterator that yields
  small text chunks plus a holder with the final assembled reply. The
  HTTP layer wraps it as Server-Sent Events.

### Streaming protocol (SSE)

`POST /api/messages` with `Accept: text/event-stream` and
`{ "stream": true }` (default). Each event is a single
`data: <json>\n\n` line:

```
data: {"type":"user_message","message":{...}}     # user message persisted
data: {"type":"token","content":"Hel"}            # one chunk
data: {"type":"token","content":"lo there"}
data: {"type":"done","chat":{...},"aiMessage":{...}} # AI reply persisted
data: {"type":"error","message":"reason"}         # only on failure
```

Set `{"stream": false}` to receive a single JSON response instead.

### File uploads

Two-step flow keeps the streaming endpoint free of multipart parsing:

1. `POST /api/uploads` (multipart: `chatId`, `file`) → returns
   `{ id, url, filename, mimeType, sizeBytes }`. The file is written
   to `<UPLOAD_DIR>/<userId>/<chatId>/<attachmentId>_<safe_name>` and
   an `Attachment` row is created with `message_id = NULL`.
2. `POST /api/messages` with `attachmentIds: [<id>, …]` links those
   uploads to the user message that was just saved.
3. `GET /api/uploads/:id` streams the file back. Ownership is
   enforced — other users get `404`. The download route accepts the
   JWT either via the `Authorization: Bearer …` header **or** via a
   `?token=…` query string, so plain `<img src>` and `<a href>` tags
   in the chat UI work without extra fetch logic. The query-string
   fallback is read-only and only on this single endpoint; everything
   else still requires the header.

Constraints:

- MIME type must start with `image/`, `application/pdf` or `text/`.
- Size capped at `MAX_UPLOAD_BYTES` (default 10 MB). Oversized uploads
  are aborted mid-stream and the partial file is removed.
- Filenames are sanitised (basename only, unsafe chars → `_`,
  leading dots stripped).

## Access-control rules (enforced in services)

- A chat is only readable / writable by `chat.user_id == current_user.id`.
  Foreign access returns **404 Chat not found** to avoid leaking
  existence.
- `POST /api/messages` is rejected on `closed` chats (**409**) and on
  `draft` chats (frontend must call `/resume` first).
- `POST /api/confirm` only works in `waiting_confirmation`.
- `POST /api/uploads` is rejected on `closed` chats.
- Attachments can only be linked by their owner to a message in the
  same chat (silent skip otherwise).

## Local dev

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                 # then edit JWT_SECRET, etc.
python init_db.py                    # creates all tables
uvicorn main:app --reload --port 8000
```

OpenAPI / Swagger UI: <http://localhost:8000/docs>.

## Using watsonx (production mode)

Set `MOCK_MODE=false` in `.env` and provide `WATSONX_API_KEY`,
`WATSONX_PROJECT_ID`, `WATSONX_URL`, `WATSONX_MODEL_ID`. The
`watsonx_client.WatsonXClient` is initialised lazily on first request
and used by `services/ai_service.py`. See `data_schemas.md` for the
shape of messages flowing through the AI layer.
