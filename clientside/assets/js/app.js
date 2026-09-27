const localApi =
  window.location.protocol === "file:" ||
  (["localhost", "127.0.0.1"].includes(window.location.hostname) &&
    window.location.port !== "3000");
const apiRoot = localApi ? "http://localhost:3000" : "";

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character],
  );

async function getJson(path) {
  const response = await fetch(`${apiRoot}${path}`);
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Could not read the event service response.");
  }
  if (!response.ok) throw new Error(data.error || "Events are unavailable right now.");
  return data;
}

function dateParts(date) {
  const value = new Date(`${date}T12:00:00`);
  return {
    day: new Intl.DateTimeFormat("en-AU", { day: "2-digit" }).format(value),
    month: new Intl.DateTimeFormat("en-AU", { month: "short" }).format(value),
    long: new Intl.DateTimeFormat("en-AU", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).format(value),
  };
}

function money(amount) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency", currency: "AUD", maximumFractionDigits: 0,
  }).format(Number(amount));
}

function eventCard(event) {
  const url = `/event.html?id=${encodeURIComponent(event.id)}`;
  const date = dateParts(event.date);
  const price = Number(event.ticketPrice) === 0 ? "Free" : money(event.ticketPrice);
  return `<article class="event-card">
    <a class="event-card-image" href="${url}" aria-label="View ${escapeHtml(event.name)}">
      <img src="${escapeHtml(event.imagePath)}" alt="">
      <span class="event-card-date"><strong>${escapeHtml(date.day)}</strong><span>${escapeHtml(date.month)}</span></span>
    </a>
    <div class="event-card-body">
      <span class="category-pill">${escapeHtml(event.category)}</span>
      <h3><a href="${url}">${escapeHtml(event.name)}</a></h3>
      <p>${escapeHtml(event.summary)}</p>
      <div class="event-card-footer"><span>${escapeHtml(event.suburb)} · ${escapeHtml(event.startTime)} · ${price}</span><a href="${url}" aria-label="View details for ${escapeHtml(event.name)}">Details</a></div>
    </div>
  </article>`;
}

function showError(container, message) {
  container.innerHTML = `<div class="empty-state"><h3>Events could not be loaded.</h3><p>${escapeHtml(message)} Check the connection and try again.</p></div>`;
}

async function initHome() {
  const next = document.querySelector("#next-event");
  const list = document.querySelector("#featured-events");
  try {
    const events = await getJson("/api/events");
    if (!events.length) {
      next.innerHTML = "<p>No upcoming event is scheduled yet.</p>";
      list.innerHTML = "<p class=\"status-message\">Check back for new dates.</p>";
      return;
    }
    const first = events[0];
    const date = dateParts(first.date);
    next.innerHTML = `<div class="next-event-content">
      <div class="date-block"><strong>${escapeHtml(date.day)}</strong><span>${escapeHtml(date.month)}</span></div>
      <div><h3>${escapeHtml(first.name)}</h3><p>${escapeHtml(first.suburb)} · ${escapeHtml(first.startTime)} · ${escapeHtml(first.category)}</p></div>
      <a class="text-link" href="/event.html?id=${encodeURIComponent(first.id)}"><span class="link-label">Event details for ${escapeHtml(first.name)}</span><span aria-hidden="true">↗</span></a>
    </div>`;
    list.innerHTML = events.slice(1).map(eventCard).join("");
  } catch (error) {
    showError(next, error.message);
    list.innerHTML = "";
  }
}

async function initSearch() {
  const form = document.querySelector("#filter-form");
  const container = document.querySelector("#search-results");
  const count = document.querySelector("#results-count");
  const params = new URLSearchParams(window.location.search);
  for (const field of ["date", "location"]) form.elements[field].value = params.get(field) || "";

  try {
    const categories = await getJson("/api/categories");
    const select = form.elements.category;
    for (const category of categories) {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.name;
      select.append(option);
    }
    select.value = params.get("category") || "";
  } catch (error) {
    showError(container, error.message);
    return;
  }

  async function search() {
    const query = new URLSearchParams();
    for (const field of ["date", "location", "category"]) {
      const value = form.elements[field].value.trim();
      if (value) query.set(field, value);
    }
    const suffix = query.toString();
    history.replaceState(null, "", `/search.html${suffix ? `?${suffix}` : ""}`);
    container.innerHTML = '<p class="status-message">Loading events…</p>';
    count.textContent = "— events";
    try {
      const events = await getJson(`/api/events${suffix ? `?${suffix}` : ""}`);
      count.textContent = `${events.length} ${events.length === 1 ? "event" : "events"}`;
      container.innerHTML = events.length
        ? events.map(eventCard).join("")
        : '<div class="empty-state"><h3>No matching events</h3><p>Try a different date, location or activity.</p></div>';
    } catch (error) {
      showError(container, error.message);
    }
  }

  form.addEventListener("submit", (event) => { event.preventDefault(); search(); });
  document.querySelector("#clear-filters").addEventListener("click", () => { form.reset(); search(); });
  await search();
}

async function initEvent() {
  const container = document.querySelector("#event-detail");
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id || !/^\d+$/.test(id)) {
    container.innerHTML = '<div class="empty-state content-shell"><h3>Event not found</h3><p>Choose an event from the list.</p><a class="text-link" href="/search.html">Browse events →</a></div>';
    return;
  }
  try {
    const event = await getJson(`/api/events/${id}`);
    const date = dateParts(event.date);
    const percentage = Math.max(0, Math.min(100, Math.round(Number(event.fundingRaised) / Number(event.fundingGoal) * 100)));
    const price = Number(event.ticketPrice) === 0 ? "Free" : money(event.ticketPrice);
    document.title = `${event.name} — Driftline`;
    container.innerHTML = `<article class="detail-page content-shell">
      <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/search.html">Events</a><span aria-hidden="true">/</span><span>${escapeHtml(event.name)}</span></nav>
      <div class="detail-hero">
        <figure class="detail-cover"><img src="${escapeHtml(event.imagePath)}" alt=""></figure>
        <header class="detail-header"><span class="category-pill">${escapeHtml(event.category)}</span><h1>${escapeHtml(event.name).replaceAll("-", "&#8209;")}</h1><p>${escapeHtml(event.summary)}</p><div class="detail-hero-meta"><span>${escapeHtml(date.long)}</span><span>${escapeHtml(event.suburb)}</span></div></header>
      </div>
      <div class="detail-layout">
        <div class="detail-main"><section class="detail-story" aria-labelledby="about-event"><h2 id="about-event">About this event</h2><p>${escapeHtml(event.description)}</p><h3>Purpose</h3><p>${escapeHtml(event.purpose)}</p><h3>Meeting point</h3><p>${escapeHtml(event.meetingPoint)}</p><h3>Organised by ${escapeHtml(event.organization)}</h3><p>${escapeHtml(event.organizationSummary)}</p></section></div>
        <aside class="booking-panel" aria-labelledby="booking-title"><h2 id="booking-title">Event details</h2><dl class="booking-facts"><div><dt>Date</dt><dd>${escapeHtml(date.long)}</dd></div><div><dt>Time</dt><dd>${escapeHtml(event.startTime)}–${escapeHtml(event.endTime)}</dd></div><div><dt>Location</dt><dd>${escapeHtml(event.locationName)}, ${escapeHtml(event.suburb)}</dd></div><div><dt>Entry</dt><dd>${price}</dd></div></dl><div class="funding"><h3>Fundraising progress</h3><div class="funding-amounts"><strong>${money(event.fundingRaised)} raised</strong><span>${money(event.fundingGoal)} goal</span></div><div class="progress-track" role="progressbar" aria-label="Fundraising progress" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" style="width:${percentage}%"></div></div></div><button type="button" class="primary-button register-button">Register</button></aside>
      </div>
    </article>`;
    container.querySelector(".register-button").addEventListener("click", () => window.alert("This feature is currently under construction."));
  } catch (error) {
    container.innerHTML = `<div class="empty-state content-shell"><h3>Event not found</h3><p>${escapeHtml(error.message)}</p><a class="text-link" href="/search.html">Browse events →</a></div>`;
  }
}

const menuButton = document.querySelector(".menu-toggle");
menuButton?.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  document.querySelector("#site-nav").classList.toggle("open", !isOpen);
});

if (document.body.dataset.page === "home") initHome();
if (document.body.dataset.page === "search") initSearch();
if (document.body.dataset.page === "event") initEvent();
