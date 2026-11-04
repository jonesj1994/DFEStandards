// Home page: switch between the school area and the trust area, and let a
// multi-academy trust find itself and open the Trust Overview page.
// Uses SchoolLookup (school-lookup.js) for the GIAS trust data.
(function () {
  "use strict";

  const SL = window.SchoolLookup;
  const TRUST_KEY = "home_trust_v1"; // last selected trust: { uid, name, savedAt }
  const AREA_KEY = "home_area_v1";   // last open area: "school" or "trust"
  const SAMPLE = 5;                  // academy names shown in the summary
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // localStorage can be unavailable (private browsing, blocked storage)
  function load(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; } }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  function remove(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } }

  const overviewHref = uid => "trust.html?trust=" + encodeURIComponent(uid);
  const academies = n => `${n.toLocaleString("en-GB")} open ${n === 1 ? "academy" : "academies"}`;

  // ── Tabs (WAI-ARIA tabs pattern, automatic activation) ──────────────────
  const tabs = [$("tab-school"), $("tab-trust")];

  function selectArea(area, focusTab) {
    tabs.forEach(t => {
      const on = t.id === "tab-" + area;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute("aria-controls")).hidden = !on;
      if (on && focusTab) t.focus();
    });
    save(AREA_KEY, area);
  }

  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectArea(t.id.slice(4)));
    t.addEventListener("keydown", e => {
      let next = null;
      if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tabs.length - 1;
      if (next === null) return;
      e.preventDefault();
      selectArea(tabs[next].id.slice(4), true);
    });
  });

  // ── Trust search ──────────────────────────────────────────────────────────
  let busy = false;

  function setStatus(text, kind) {
    const el = $("trust-status");
    el.className = "finder-status" + (kind ? " " + kind : "");
    el.textContent = text || "";
    $("trust-input").setAttribute("aria-invalid", kind === "error" ? "true" : "false");
  }

  function setBusy(on) {
    busy = on;
    $("trust-btn").disabled = on;
    $("trust-btn").textContent = on ? "Searching…" : "Search";
  }

  function validate(q) {
    if (!q) return "Enter your trust's name or its group UID.";
    if (/^\d+$/.test(q)) return q.length > 7 ? "A group UID has up to 7 digits, for example 16748." : "";
    if (q.replace(/[^A-Za-z]/g, "").length < 3) return "Enter at least 3 letters of the trust's name, or its group UID (for example 16748).";
    return "";
  }

  async function runSearch(raw) {
    if (busy) return;
    const q = String(raw || "").trim();
    $("trust-results").innerHTML = "";
    const problem = validate(q);
    if (problem) { setStatus(problem, "error"); return; }
    setBusy(true);
    setStatus("Searching trusts…", "loading");
    try {
      const results = await SL.searchTrusts(q, 20);
      if (!results.length) {
        setStatus(/^\d+$/.test(q)
          ? `No trust found with group UID ${q}. Check the number on Get Information About Schools.`
          : `No trust found with a name matching "${q}". Try fewer words, or the group UID.`, "error");
      } else if (results.length === 1) {
        setStatus("");
        selectTrust(results[0]);
      } else {
        setStatus(`${results.length === 20 ? "Showing the first 20" : results.length} matching trusts. Choose yours:`, "ok");
        $("trust-results").innerHTML = results.map(t =>
          `<li><button type="button" data-uid="${esc(t.uid)}" data-name="${esc(t.name)}">${esc(t.name)}
            <small>Group UID ${esc(t.uid)} · ${esc(academies(t.urns.length))}</small></button></li>`).join("");
      }
    } catch (e) {
      setStatus(e.message || "Something went wrong. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  // ── Selected trust summary ────────────────────────────────────────────────
  // t: { uid, name, urns? }. Saves it as the last trust and shows the summary.
  function selectTrust(t, opts) {
    opts = opts || {};
    $("trust-results").innerHTML = "";
    if (!opts.restoring) save(TRUST_KEY, { uid: t.uid, name: t.name, savedAt: new Date().toISOString() });
    updateTile(t);

    $("trust-card").innerHTML = `
      <p class="eyebrow">${opts.restoring ? "Your last trust" : "Selected trust"}</p>
      <h3 tabindex="-1">${esc(t.name)}</h3>
      <dl class="school-details">
        <dt>Group UID</dt><dd>${esc(t.uid)}</dd>
        <dt>Open academies</dt><dd id="trust-count">${t.urns ? esc(t.urns.length) : "Loading…"}</dd>
      </dl>
      <div id="trust-sample" aria-live="polite"></div>
      <div class="school-actions">
        <a class="btn btn-primary btn-lg" id="trust-open" href="${esc(overviewHref(t.uid))}">Open trust overview &#8594;</a>
        <button type="button" class="btn btn-secondary" id="trust-clear">Clear</button>
      </div>
      <p class="school-links" style="margin:12px 0 0">
        <a href="https://get-information-schools.service.gov.uk/Groups/Group/Details/${esc(encodeURIComponent(t.uid))}" target="_blank" rel="noopener">View on Get Information About Schools<span class="visually-hidden"> (opens in a new tab)</span></a>
      </p>`;
    $("trust-clear").addEventListener("click", clearTrust);
    if (!opts.restoring) $("trust-card").querySelector("h3").focus();
    loadSample(t);
  }

  // Count of open academies, plus a few of their names. Only the first few
  // schools are fetched, so a large trust doesn't download every data file.
  async function loadSample(t) {
    try {
      let urns = t.urns;
      if (!urns) {
        const [full] = await SL.searchTrusts(t.uid);
        if (!full) throw new Error(`Trust ${t.uid} is no longer listed in the latest school data.`);
        urns = full.urns;
        if ($("trust-count")) $("trust-count").textContent = urns.length;
      }
      if (!urns.length) {
        $("trust-sample").innerHTML = `<p class="finder-hint">This trust has no open academies listed.</p>`;
        return;
      }
      const schools = (await Promise.all(urns.slice(0, SAMPLE).map(u => SL.byURN(u).catch(() => null)))).filter(Boolean);
      schools.sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
      const more = urns.length - schools.length;
      const el = $("trust-sample");
      if (!el) return; // cleared meanwhile
      el.innerHTML = `<p class="finder-hint" style="margin:0 0 4px">${more > 0 ? "Some of its academies:" : "Its academies:"}</p>
        <ul class="trust-names">${schools.map(s => `<li>${esc(s.name)}${s.postcode ? ` <span class="finder-hint">(${esc(s.postcode)})</span>` : ""}</li>`).join("")}
        ${more > 0 ? `<li>and ${esc(more)} more</li>` : ""}</ul>`;
    } catch (e) {
      const el = $("trust-sample");
      if (el) el.innerHTML = `<p class="finder-status error">${esc(e.message || "The trust's academies could not be loaded.")}</p>`;
    }
  }

  function clearTrust() {
    remove(TRUST_KEY);
    $("trust-card").innerHTML = "";
    $("trust-input").value = "";
    updateTile(null);
    setStatus("Trust cleared.", "ok");
    $("trust-input").focus();
  }

  // The Trust Overview tile opens straight into the last selected trust
  function updateTile(t) {
    const tile = $("trust-tile");
    if (tile) tile.setAttribute("href", t ? overviewHref(t.uid) : "trust.html");
  }

  // ── Wiring ────────────────────────────────────────────────────────────────
  $("trust-form").addEventListener("submit", e => { e.preventDefault(); runSearch($("trust-input").value); });
  $("trust-results").addEventListener("click", e => {
    const b = e.target.closest("button[data-uid]");
    if (b) SL.searchTrusts(b.dataset.uid).then(([t]) => selectTrust(t || { uid: b.dataset.uid, name: b.dataset.name }))
      .catch(() => selectTrust({ uid: b.dataset.uid, name: b.dataset.name }));
  });

  // Restore the last trust and the last open area
  const last = load(TRUST_KEY);
  if (last && last.uid && last.name) {
    $("trust-input").value = last.name;
    selectTrust({ uid: String(last.uid), name: String(last.name) }, { restoring: true });
  }
  const area = load(AREA_KEY);
  selectArea(area === "trust" ? "trust" : "school");
})();
