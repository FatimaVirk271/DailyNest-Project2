# DailyNest - Project 2: Backend API Development

DailyNest is a daily life planner (Home, Study, Health, Shopping tasks).
**Project 1** was the skin: the responsive frontend. **Project 2** is the nervous system: a backend API that
stores the tasks, validates what the page sends, and answers with clear status codes.

Built for the DecodeLabs Full Stack Development internship (Batch 2026) with **Node.js + Express**.

Built by: FATIMA 

## What changed since Project 1

| Project 1 | Project 2 |
|-----------|-----------|
| Tasks lived in the browser (localStorage) | Tasks live on the server and are saved in `data.json` |
| JavaScript changed the list directly | JavaScript calls the API with `fetch()` and shows what the server returns |
| Nothing checked the data | The server validates every request ("never trust the client") |
| Progress was counted in the page | Progress comes from `GET /api/stats` (calculated on the server) |

## Run it

```bash
npm install     # downloads Express
npm start       # open http://localhost:3000
npm test        # runs the automated checks
```

Open **http://localhost:3000** (not the HTML file directly). The server hands out the page *and* the API,
so they share one address.

## Project structure

```
DailyNest-Project2/
├── server.js          # starts the app, connects all pieces
├── routes/
│   ├── tasks.js       # GET / POST / PUT / PATCH / DELETE for tasks
│   ├── stats.js       # GET /api/stats  (progress numbers)
│   └── admin.js       # POST /api/admin/reset  (needs an API key)
├── validators.js      # checks incoming data
├── middleware.js      # logger, rate limiter, API key check, error handlers
├── store.js           # saves tasks in memory + data.json (no database yet)
├── public/            # the DailyNest page from Project 1
│   ├── index.html
│   ├── styles.css
│   └── script.js      # now talks to the API with fetch()
├── test.js            # automated tests
└── package.json
```

## API reference

Base URL: `http://localhost:3000`. All request and response bodies are JSON.
Resources are nouns (`/tasks`), methods are verbs (GET, POST...).

| Method | URL | What it does | Success |
|--------|-----|--------------|---------|
| GET | `/api/health` | Is the server alive? | 200 |
| GET | `/api/tasks` | List tasks. Optional: `?category=study&done=false&search=milk&page=1&limit=100` | 200 |
| GET | `/api/tasks/:id` | Get one task | 200 |
| POST | `/api/tasks` | Create a task | 201 |
| PUT | `/api/tasks/:id` | Replace a task (send all fields) | 200 |
| PATCH | `/api/tasks/:id` | Change some fields, e.g. `{"done": true}` | 200 |
| DELETE | `/api/tasks/:id` | Delete one task | 204 |
| DELETE | `/api/tasks?done=true` | Clear all finished tasks | 200 |
| GET | `/api/stats` | Totals and progress percentage | 200 |
| POST | `/api/admin/reset` | Put the 4 starter tasks back. Needs header `x-api-key` | 200 |

### Task fields

| Field | Rules |
|-------|-------|
| `text` | required, 1-80 characters, must contain a letter or a number (extra spaces are tidied) |
| `category` | optional: `home`, `study`, `health` or `shopping` (default `home`) |
| `done` | optional: `true` or `false` (default `false`) |

The server adds `id`, `createdAt` and (after a change) `updatedAt`.

### Validation (the Gatekeeper rule)

- **Syntactic** - is the format right? `text` must be text, `done` must be true/false, the body must be valid JSON.
- **Semantic** - does it make sense? `category` must be one of the four, `text` can't be only symbols,
  `page` and `limit` must be sensible numbers.

### Response format

Success: `{ "success": true, "data": ... }`
Error: `{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }`

### Status codes used

| Code | When |
|------|------|
| 200 OK | Read / update / clear worked |
| 201 Created | New task created (a `Location` header points to it) |
| 204 No Content | One task deleted |
| 400 Bad Request | Bad data, bad id, bad query values, broken JSON |
| 401 Unauthorized | Admin endpoint without `x-api-key` |
| 403 Forbidden | Admin endpoint with a wrong `x-api-key` |
| 404 Not Found | Task or route does not exist |
| 409 Conflict | Creating a task that already exists (same text and category, not finished) |
| 413 Payload Too Large | Body bigger than 10 KB |
| 415 Unsupported Media Type | POST/PUT/PATCH without `Content-Type: application/json` |
| 429 Too Many Requests | More than 200 requests per minute from one IP |
| 500 Internal Error | Unexpected bug (no internal details leaked) |

## Examples (copy and run)

On Windows PowerShell use `curl.exe` instead of `curl`, and the single-quoted JSON may need `\"` escapes.
The easiest way to try everything is the DailyNest page itself.

Create a task:
```bash
curl -i -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"text":"Buy milk and eggs","category":"shopping"}'
```

List study tasks that are not done:
```bash
curl "http://localhost:3000/api/tasks?category=study&done=false"
```

Mark task 2 as done:
```bash
curl -X PATCH http://localhost:3000/api/tasks/2 \
  -H "Content-Type: application/json" \
  -d '{"done":true}'
```

See the progress numbers:
```bash
curl http://localhost:3000/api/stats
```

Clear finished tasks:
```bash
curl -X DELETE "http://localhost:3000/api/tasks?done=true"
```

See a validation error:
```bash
curl -i -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"text":"!!!","category":"gym"}'
```

Reset to the starter tasks (key is `decodelabs-secret` unless you set `API_KEY`):
```bash
curl -X POST http://localhost:3000/api/admin/reset -H "x-api-key: decodelabs-secret"
```

## Settings (environment variables)

| Variable | Default | Meaning |
|----------|---------|---------|
| `PORT` | 3000 | Port to listen on |
| `API_KEY` | decodelabs-secret | Key needed for `/api/admin/reset` |
| `RATE_LIMIT_MAX` | 200 | Requests per minute per IP |
| `DATA_FILE` | ./data.json | Where tasks are saved |
| `SILENT` | (off) | Set to `1` to hide request logs |

## How this covers the Project 2 requirements

- **API endpoints (GET / POST)** - `routes/tasks.js` (plus PUT, PATCH and DELETE)
- **Handle user input and responses** - the page sends JSON, the server answers JSON with a clear status code
- **Validate basic data** - `validators.js`, shown to the user as friendly messages in the page
- **RESTful naming** - `/api/tasks`, never `/getTasks`
- **Status codes** - see the table above
- **Security and resilience** - API key (401/403), rate limit (429), body size limit, errors never leak internals
- **Documentation** - this file, with examples you can run

## Ideas for next steps

- Replace `data.json` with a real database (MongoDB or PostgreSQL)
- Add user accounts and login so each person has their own tasks
- Add due dates and reminders
