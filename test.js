// test.js - automated checks. Run with: npm test
// It starts the API on a random port, sends real HTTP requests, and checks the answers.
const os = require('os');
const path = require('path');

// Use a throwaway data file + quiet logs + known settings
process.env.DATA_FILE = path.join(os.tmpdir(), `dn-test-${Date.now()}.json`);
process.env.SILENT = '1';
process.env.RATE_LIMIT_MAX = '100';
process.env.API_KEY = 'test-key';

const app = require('./server');

let passed = 0;
let failed = 0;
function check(name, condition, extra = '') {
  if (condition) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name} ${extra}`); }
}

const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const json = { 'Content-Type': 'application/json' };
  const call = async (method, url, body, headers = json) => {
    const res = await fetch(base + url, {
      method, headers,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
  };

  try {
    console.log('Health and page');
    let r = await call('GET', '/api/health');
    check('GET /api/health -> 200', r.status === 200 && r.body.data.status === 'ok');
    const page = await fetch(base + '/');
    const html = await page.text();
    check('GET / serves the DailyNest page', page.status === 200 && html.includes('DailyNest'));
    const js = await fetch(base + '/script.js');
    check('GET /script.js is served', js.status === 200);

    console.log('GET /api/tasks (starter data)');
    r = await call('GET', '/api/tasks');
    check('list -> 200 with the 4 starter tasks', r.status === 200 && r.body.meta.total === 4);
    check('starter tasks keep Project 1 order', r.body.data[0].text === 'Drink 8 glasses of water');

    console.log('POST /api/tasks');
    r = await call('POST', '/api/tasks', { text: '  Read   a book  ', category: 'Study' });
    check('valid task -> 201', r.status === 201, r.status);
    check('text is tidied (spaces)', r.body.data.text === 'Read a book');
    check('category is lower-cased', r.body.data.category === 'study');
    check('done defaults to false', r.body.data.done === false);
    check('Location header is set', r.headers.get('location') === `/api/tasks/${r.body.data.id}`);
    const bookId = r.body.data.id;
    r = await call('POST', '/api/tasks', { text: 'Plan my week' });
    check('category defaults to "home"', r.status === 201 && r.body.data.category === 'home');
    const planId = r.body.data.id;
    r = await call('GET', '/api/tasks');
    check('newest task is first in the list', r.body.data[0].id === planId);

    r = await call('POST', '/api/tasks', { text: '   ', category: 'gym', done: 'yes' });
    check('invalid data -> 400', r.status === 400);
    check('400 lists every bad field', r.body.error.details.length === 3, JSON.stringify(r.body.error.details));
    r = await call('POST', '/api/tasks', { text: '!!!' });
    check('symbols-only text -> 400', r.status === 400);
    r = await call('POST', '/api/tasks', { text: 'x'.repeat(81) });
    check('text over 80 characters -> 400', r.status === 400);
    r = await call('POST', '/api/tasks', { text: 123 });
    check('text that is not a string -> 400', r.status === 400);
    r = await call('POST', '/api/tasks', '{ bad json', json);
    check('broken JSON -> 400', r.status === 400 && r.body.error.code === 'INVALID_JSON');
    r = await call('POST', '/api/tasks', 'text=x', { 'Content-Type': 'text/plain' });
    check('wrong Content-Type -> 415', r.status === 415);
    r = await call('POST', '/api/tasks', [1, 2, 3]);
    check('array body -> 400', r.status === 400);

    console.log('GET filters');
    r = await call('GET', '/api/tasks?category=study');
    check('filter by category works', r.body.meta.total === 2);
    r = await call('GET', '/api/tasks?category=gym');
    check('bad category -> 400', r.status === 400);
    r = await call('GET', '/api/tasks?done=maybe');
    check('bad done value -> 400', r.status === 400);
    r = await call('GET', '/api/tasks?search=WATER');
    check('search works (any letter case)', r.body.data.length === 1);
    r = await call('GET', '/api/tasks?limit=2&page=3');
    check('pagination works', r.body.data.length === 2 && r.body.meta.totalPages === 3);
    r = await call('GET', '/api/tasks?page=0');
    check('page=0 -> 400', r.status === 400);
    r = await call('GET', '/api/tasks?limit=500');
    check('limit=500 -> 400', r.status === 400);

    console.log('GET /api/tasks/:id');
    r = await call('GET', `/api/tasks/${bookId}`);
    check('existing task -> 200', r.status === 200 && r.body.data.text === 'Read a book');
    r = await call('GET', '/api/tasks/9999');
    check('missing task -> 404', r.status === 404);
    r = await call('GET', '/api/tasks/abc');
    check('non-numeric id -> 400', r.status === 400);

    console.log('PATCH /api/tasks/:id');
    r = await call('PATCH', `/api/tasks/${bookId}`, { done: true });
    check('mark done -> 200', r.status === 200 && r.body.data.done === true);
    check('PATCH keeps the other fields', r.body.data.text === 'Read a book' && r.body.data.category === 'study');
    r = await call('PATCH', `/api/tasks/${bookId}`, {});
    check('PATCH with nothing to change -> 400', r.status === 400);
    r = await call('PATCH', `/api/tasks/${bookId}`, { done: 'x' });
    check('PATCH with bad done -> 400', r.status === 400);
    r = await call('PATCH', '/api/tasks/9999', { done: true });
    check('PATCH missing task -> 404', r.status === 404);

    console.log('PUT /api/tasks/:id');
    r = await call('PUT', `/api/tasks/${bookId}`, { text: 'Read two chapters', category: 'study' });
    check('replace task -> 200', r.status === 200 && r.body.data.text === 'Read two chapters');
    check('PUT resets fields that were not sent (done)', r.body.data.done === false);
    r = await call('PUT', `/api/tasks/${bookId}`, { category: 'study' });
    check('PUT without text -> 400', r.status === 400);
    r = await call('PUT', '/api/tasks/9999', { text: 'Ghost task' });
    check('PUT missing task -> 404', r.status === 404);

    console.log('GET /api/stats');
    await call('PATCH', '/api/tasks/1', { done: true });
    r = await call('GET', '/api/stats');
    check('stats -> 200', r.status === 200);
    check('stats numbers are right', r.body.data.total === 6 && r.body.data.done === 1
      && r.body.data.remaining === 5 && r.body.data.percent === 17, JSON.stringify(r.body.data));
    check('stats by category', r.body.data.byCategory.health.done === 1 && r.body.data.byCategory.study.total === 2);

    console.log('DELETE');
    r = await call('DELETE', `/api/tasks/${planId}`, undefined, {});
    check('delete one task -> 204', r.status === 204);
    r = await call('DELETE', `/api/tasks/${planId}`, undefined, {});
    check('delete it again -> 404', r.status === 404);
    r = await call('DELETE', '/api/tasks/abc', undefined, {});
    check('delete bad id -> 400', r.status === 400);
    r = await call('DELETE', '/api/tasks?done=true', undefined, {});
    check('clear finished tasks -> 200', r.status === 200 && r.body.data.deleted === 1, JSON.stringify(r.body));
    r = await call('GET', '/api/tasks');
    check('4 tasks are left', r.body.meta.total === 4);
    r = await call('DELETE', '/api/tasks', undefined, {});
    check('delete-all without done=true -> 400', r.status === 400);

    console.log('POST /api/admin/reset (API key)');
    r = await call('POST', '/api/admin/reset', undefined, {});
    check('no API key -> 401', r.status === 401);
    r = await call('POST', '/api/admin/reset', undefined, { 'x-api-key': 'wrong' });
    check('wrong API key -> 403', r.status === 403);
    await call('POST', '/api/tasks', { text: 'Temporary task' });
    r = await call('POST', '/api/admin/reset', undefined, { 'x-api-key': 'test-key' });
    check('correct key -> 200', r.status === 200);
    r = await call('GET', '/api/tasks');
    check('starter tasks are back', r.body.meta.total === 4 && r.body.data[0].text === 'Drink 8 glasses of water');

    console.log('Other');
    r = await call('GET', '/api/nothing-here');
    check('unknown route -> 404 JSON', r.status === 404 && r.body.success === false);

    let got429 = false;
    for (let i = 0; i < 120; i++) {
      r = await call('GET', '/api/tasks');
      if (r.status === 429) { got429 = true; break; }
    }
    check('too many requests -> 429', got429);
    check('429 has Retry-After header', got429 && !!r.headers.get('retry-after'));
  } catch (err) {
    failed++;
    console.log('  FAIL  test crashed:', err);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  server.close();
  process.exit(failed ? 1 : 0);
});
