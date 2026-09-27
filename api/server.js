const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./event_db');

const app = express();
const clientRoot = path.join(__dirname, '..', 'clientside');
const eventFields = `
  e.event_id AS id, e.name, e.summary, e.location_name AS locationName,
  e.suburb, DATE_FORMAT(e.event_date, '%Y-%m-%d') AS date,
  TIME_FORMAT(e.start_time, '%H:%i') AS startTime,
  TIME_FORMAT(e.end_time, '%H:%i') AS endTime,
  e.ticket_price AS ticketPrice, e.funding_goal AS fundingGoal,
  e.funding_raised AS fundingRaised, e.image_path AS imagePath,
  c.category_id AS categoryId, c.name AS category,
  o.name AS organization`;

app.use(cors());
app.use(express.static(clientRoot));

const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok' });
}));

app.get('/api/categories', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query('SELECT category_id AS id, name, slug FROM categories ORDER BY category_id');
  res.json(rows);
}));

app.get('/api/events/featured', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(`SELECT ${eventFields}
    FROM events e
    JOIN categories c ON c.category_id = e.category_id
    JOIN organizations o ON o.organization_id = e.organization_id
    WHERE e.status = 'active' AND e.event_date >= CURDATE()
    ORDER BY e.event_date, e.start_time, e.event_id LIMIT 4`);
  res.json(rows);
}));

app.get('/api/events', asyncRoute(async (req, res) => {
  const { date = '', location = '', category = '' } = req.query;
  if (typeof date !== 'string' || typeof location !== 'string' || typeof category !== 'string') {
    return res.status(400).json({ error: 'Use one value for each filter.' });
  }
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)) {
    return res.status(400).json({ error: 'Enter a valid date in YYYY-MM-DD format.' });
  }
  if (category && !/^[1-9]\d*$/.test(category)) {
    return res.status(400).json({ error: 'Choose a valid category.' });
  }
  if (location.length > 80) {
    return res.status(400).json({ error: 'Location is too long.' });
  }

  const conditions = ["e.status = 'active'", 'e.event_date >= CURDATE()'];
  const values = [];
  if (date) { conditions.push('e.event_date = ?'); values.push(date); }
  if (location.trim()) {
    conditions.push('(e.suburb LIKE ? OR e.location_name LIKE ?)');
    const term = `%${location.trim()}%`;
    values.push(term, term);
  }
  if (category) { conditions.push('e.category_id = ?'); values.push(Number(category)); }

  const [rows] = await pool.execute(`SELECT ${eventFields}
    FROM events e
    JOIN categories c ON c.category_id = e.category_id
    JOIN organizations o ON o.organization_id = e.organization_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY e.event_date, e.start_time, e.event_id`, values);
  res.json(rows);
}));

app.get('/api/events/:id', asyncRoute(async (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid event ID.' });
  }
  const [rows] = await pool.execute(`SELECT ${eventFields},
    e.description, e.purpose, e.meeting_point AS meetingPoint,
    o.summary AS organizationSummary
    FROM events e
    JOIN categories c ON c.category_id = e.category_id
    JOIN organizations o ON o.organization_id = e.organization_id
    WHERE e.event_id = ? AND e.status = 'active' AND e.event_date >= CURDATE()
    LIMIT 1`, [Number(req.params.id)]);
  if (!rows.length) return res.status(404).json({ error: 'Event not found.' });
  res.json(rows[0]);
}));

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'The events are unavailable right now. Please try again.' });
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  pool.query('SELECT 1').then(() => {
    app.listen(port, () => console.log(`Driftline is running at http://localhost:${port}`));
  }).catch((error) => {
    console.error('Could not connect to MySQL:', error.message);
    process.exitCode = 1;
    pool.end();
  });
}

module.exports = app;
