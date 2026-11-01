// server.js - the entry point. It wires everything together.
const express = require('express');
const path = require('path');
const tasksRouter = require('./routes/tasks');
const statsRouter = require('./routes/stats');
const adminRouter = require('./routes/admin');
const {
  requestLogger,
  rateLimiter,
  notFound,
  errorHandler,
} = require('./middleware');

const app = express();
app.set('trust proxy', 1); // needed when hosted behind a proxy (Render, etc.)
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10kb' })); // read JSON bodies (max 10 KB)
app.use(requestLogger);                   // log every request

// The DailyNest page (HTML, CSS, JS) is served from the public folder,
// so the page and the API share one address: http://localhost:3000
app.use(express.static(path.join(__dirname, 'public')));

// Health check - lets anyone see the server is alive (not rate limited)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'ok', uptimeSeconds: Math.round(process.uptime()) },
  });
});

app.use('/api', rateLimiter);            // 429 if someone spams the API
app.use('/api/tasks', tasksRouter);      // GET / POST / PUT / PATCH / DELETE
app.use('/api/stats', statsRouter);      // progress numbers
app.use('/api/admin', adminRouter);      // protected by an API key

app.use(notFound);     // unknown URL -> 404
app.use(errorHandler); // any error -> clean JSON (400 / 413 / 500)

// Only start listening when run directly (so tests can import the app)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DailyNest running on http://localhost:${PORT}`);
  });
}

module.exports = app;
