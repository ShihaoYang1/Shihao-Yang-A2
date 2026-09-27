const localApi =
  window.location.protocol === "file:" ||
  (["localhost", "127.0.0.1"].includes(window.location.hostname) &&
    window.location.port !== "3000");
const apiRoot = localApi ? "http://localhost:3000" : "";

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );

async function getJson(path) {
  const response = await fetch(`${apiRoot}${path}`);
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Could not read the event service response.");
  }
  if (!response.ok)
    throw new Error(data.error || "The events are unavailable right now.");
  return data;
}

function dayParts(date) {
  const day = new Date(`${date}T12:00:00`);
  return {
    short: new Intl.DateTimeFormat("en-AU", {
      day: "2-digit",
      month: "short",
    }).format(day),
    long: new Intl.DateTimeFormat("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(day),
  };
}

function eventRow(event, index) {
  const url = `/event.html?id=${encodeURIComponent(event.id)}`;
  return `<article class="event-row">
    <span class="event-index">${String(index + 1).padStart(2, "0")}</span>
    <a href="${url}" aria-label="View ${escapeHtml(event.name)}"><img class="event-thumb" src="${escapeHtml(event.imagePath)}" alt=""></a>
    <div class="event-row-main"><div class="event-category">${escapeHtml(event.category)} / ${escapeHtml(event.suburb)}</div><h3><a href="${url}">${escapeHtml(event.name)}</a></h3><p>${escapeHtml(event.summary)}</p></div>
    <div class="event-meta"><strong>${escapeHtml(dayParts(event.date).short)}</strong>${escapeHtml(event.startTime)} · ${escapeHtml(event.suburb)}<br>${Number(event.ticketPrice) === 0 ? "FREE TO JOIN" : `$${Number(event.ticketPrice).toFixed(2)} TICKET`}</div>
    <a class="event-arrow" href="${url}" aria-label="View ${escapeHtml(event.name)}">↗</a>
  </article>`;
}

function showError(container, message) {
  container.innerHTML = `<div class="empty-state"><h3>Can't load events right now.</h3><p>${escapeHtml(message)} Check the connection and try again.</p></div>`;
}

async function initHome() {
  const container = document.querySelector("#featured-events");
  try {
    const events = await getJson("/api/events/featured");
    container.innerHTML = events.length
      ? events.map(eventRow).join("")
      : '<div class="empty-state"><h3>No field days are scheduled yet.</h3><p>Check back soon for new dates on the coast.</p></div>';
  } catch (error) {
    showError(container, error.message);
  }
}

async function initSearch() {
  const form = document.querySelector("#filter-form");
  const container = document.querySelector("#search-results");
  const count = document.querySelector("#results-count");
  const params = new URLSearchParams(window.location.search);
  for (const field of ["date", "location"])
    form.elements[field].value = params.get(field) || "";

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
    count.textContent = "— EVENTS";
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
    container.innerHTML = '<p class="status-message">Finding field days…</p>';
    count.textContent = "— EVENTS";
    try {
      const events = await getJson(`/api/events${suffix ? `?${suffix}` : ""}`);
      count.textContent = `${String(events.length).padStart(2, "0")} ${events.length === 1 ? "EVENT" : "EVENTS"}`;
      container.innerHTML = events.length
        ? events.map(eventRow).join("")
        : '<div class="empty-state"><h3>No events match this search.</h3><p>Try another date, a nearby suburb or a different activity.</p></div>';
    } catch (error) {
      showError(container, error.message);
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    search();
  });
  document.querySelector("#clear-filters").addEventListener("click", () => {
    form.reset();
    search();
  });
  await search();
}

function money(amount) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

async function initEvent() {
  const container = document.querySelector("#event-detail");
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id || !/^\d+$/.test(id)) {
    container.innerHTML =
      '<div class="empty-state section"><h3>Event not found.</h3><p>Choose an event from the calendar.</p><a class="text-link dark-link" href="/search.html">Browse events ↗</a></div>';
    return;
  }
  try {
    const event = await getJson(`/api/events/${id}`);
    document.title = `${event.name} — Driftline`;
    const percentage = Math.min(
      100,
      Math.round(
        (Number(event.fundingRaised) / Number(event.fundingGoal)) * 100,
      ),
    );
    container.innerHTML = `<article class="detail-page">
      <div class="detail-top"><a class="back-link" href="/search.html">← BACK TO ALL EVENTS</a></div>
      <div class="detail-hero"><div class="detail-hero-copy"><div class="eyebrow"><span class="signal-dot"></span>${escapeHtml(event.category.toUpperCase())} / ${escapeHtml(event.suburb.toUpperCase())}</div><h1>${escapeHtml(event.name)}</h1><p>${escapeHtml(event.summary)}</p><div class="detail-hero-date">${escapeHtml(dayParts(event.date).short.toUpperCase())} <span class="heading-period">↗</span></div></div><div class="detail-photo"><img src="${escapeHtml(event.imagePath)}" alt="Coastal setting for ${escapeHtml(event.name)}"><span class="detail-photo-caption">${escapeHtml(event.locationName)} / SYDNEY</span></div></div>
      <div class="detail-facts"><div class="detail-fact"><span class="detail-fact-label">WHEN</span><strong>${escapeHtml(dayParts(event.date).long)}</strong></div><div class="detail-fact"><span class="detail-fact-label">TIME</span><strong>${escapeHtml(event.startTime)} – ${escapeHtml(event.endTime)}</strong></div><div class="detail-fact"><span class="detail-fact-label">WHERE</span><strong>${escapeHtml(event.locationName)}, ${escapeHtml(event.suburb)}</strong></div><div class="detail-fact"><span class="detail-fact-label">HOSTED BY</span><strong>${escapeHtml(event.organization)}</strong></div></div>
      <div class="detail-body section"><div class="detail-story"><div class="section-kicker">THE FIELD NOTES <span class="small-line"></span> 01</div><h2>What to expect<span class="heading-period">.</span></h2><p>${escapeHtml(event.description)}</p><div class="detail-purpose"><span>WHY THIS DAY MATTERS</span><p>${escapeHtml(event.purpose)}</p></div><h3>Meeting point</h3><p>${escapeHtml(event.meetingPoint)}</p></div><aside class="detail-side"><div class="section-kicker">TAKE PART <span class="small-line"></span> 02</div><h2>Your place on the coast<span class="heading-period">.</span></h2><div class="ticket-line"><span>ENTRY</span><strong>${Number(event.ticketPrice) === 0 ? "Free" : money(event.ticketPrice)}</strong></div><div class="ticket-line"><span>LOCATION</span><strong>${escapeHtml(event.suburb)}</strong></div><div class="progress-head"><span class="tiny-label">COMMUNITY FUNDING</span><br><strong>${money(event.fundingRaised)} raised</strong></div><div class="progress-track" role="progressbar" aria-label="Funding progress" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" style="width:${percentage}%"></div></div><div class="progress-labels"><span>${percentage}% OF GOAL</span><span>GOAL ${money(event.fundingGoal)}</span></div><button type="button" class="button button-coral register-button">Register for this event <span aria-hidden="true">↗</span></button><p class="side-note">Bring yourself and a willingness to lend a hand. We’ll take care of the rest.</p></aside></div>
    </article>`;
    container
      .querySelector(".register-button")
      .addEventListener("click", () =>
        window.alert(
          "Registration is under construction. Please check back soon.",
        ),
      );
  } catch (error) {
    container.innerHTML = `<div class="empty-state section"><h3>Event not found.</h3><p>${escapeHtml(error.message)}</p><a class="text-link dark-link" href="/search.html">Browse events ↗</a></div>`;
  }
}

document.querySelectorAll(".year").forEach((node) => {
  node.textContent = new Date().getFullYear();
});
const menuButton = document.querySelector(".menu-toggle");
menuButton?.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  document.querySelector("#site-nav").classList.toggle("open", !isOpen);
});

if (document.body.dataset.page === "home") initHome();
if (document.body.dataset.page === "search") initSearch();
if (document.body.dataset.page === "event") initEvent();
