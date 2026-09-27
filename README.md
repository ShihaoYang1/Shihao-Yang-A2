# Driftline Coastal Charity Events Website

A plain HTML/CSS/JavaScript front end, a Node.js/Express REST API and a MySQL database. The home page, event search and event details all read their data from the API.

## Run locally

1. Install Node.js 20+ and MySQL 8+.
2. Run `api/schema.sql` in MySQL to create `charityevents_db` with 9 sample events (8 public, 1 suspended).
3. Go to `api`, copy `.env.example` to `.env` and fill in your local MySQL username and password. Leave `DB_PASSWORD` empty if there is no password.
4. Run `npm install` and `npm start`.
5. Open `http://localhost:3000` in a browser.

The API also accepts requests from a front end served on another local port. When the pages are opened from an address such as `http://localhost:5500/clientside`, they request data from `http://localhost:3000/api`.

## Main endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/events` | All valid upcoming events for the home page; also supports combined filters |
| `GET /api/events/featured` | The next 4 public events |
| `GET /api/events?date=YYYY-MM-DD&location=Bondi&category=1` | Filter by date, location and category |
| `GET /api/categories` | Filter categories |
| `GET /api/events/:id` | Details of a single event |
| `GET /api/health` | Database connection status |

Event dates are calculated from the day the sample data is imported, so upcoming events are always available to view. The registration button currently only shows an "under construction" notice.
