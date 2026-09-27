const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('./server');
const pool = require('./event_db');

const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('public lists exclude suspended events', async () => {
  const all = await (await fetch(`${base}/api/events`)).json();
  const featured = await (await fetch(`${base}/api/events/featured`)).json();
  assert.ok(all.length >= 8);
  assert.equal(featured.length, 4);
  assert.ok(all.every((event) => event.id !== 9));
  assert.ok(featured.every((event) => event.id !== 9));
});

test('location and category filters work together', async () => {
  const response = await fetch(`${base}/api/events?location=Bondi&category=1`);
  const events = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(events.map((event) => event.id), [1]);
});

test('detail is available only for active upcoming events', async () => {
  const active = await fetch(`${base}/api/events/1`);
  const suspended = await fetch(`${base}/api/events/9`);
  assert.equal(active.status, 200);
  assert.equal((await active.json()).name, 'North Bondi Beach Clean-up');
  assert.equal(suspended.status, 404);
});

test('invalid filter dates receive a clear error', async () => {
  const response = await fetch(`${base}/api/events?date=2026-02-30`);
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /valid date/i);
});
