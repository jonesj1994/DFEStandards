// Home page: "Clear all data" button. Deletes everything this toolkit saves in
// the browser (both trackers, every register, the selected school and the
// trust overview imports) after the user confirms, then reloads the page.
//
// GitHub Pages shares one browser storage area between every site under
// jonesj1994.github.io, so this removes only the keys listed here and never
// calls localStorage.clear(). Add a new page's storage key to this list.
(function () {
  "use strict";

  const LOCAL_KEYS = [
    "dfe_tracker_v1",          // DfE standards tracker
    "ce_tracker_v1",           // Cyber Essentials tracker
    "software_register_v1",    // Software register
    "hardware_register_v1",    // Hardware and asset register
    "accounts_register_v1",    // User accounts and access register
    "backup_register_v1",      // Backup and DR register
    "incident_log_v1",         // Cyber incident and breach log
    "school_profile_v1",       // School selected on the home page
    "home_trust_v1",           // Trust selected on the home page
    "home_area_v1",            // School / trust tab choice
    "trust_view_settings_v1"   // Trust overview settings
  ];
  const INDEXED_DBS = ["trust_view_v1"]; // Trust overview imported files

  const $ = id => document.getElementById(id);
  const btn = $("reset-btn");
  const dialog = $("reset-dialog");
  const confirmBtn = $("reset-confirm");
  const cancelBtn = $("reset-cancel");
  const status = $("reset-status");
  if (!btn || !dialog || !confirmBtn || !cancelBtn) return;

  function deleteDb(name) {
    return new Promise(resolve => {
      try {
        if (!window.indexedDB) return resolve(true);
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
        // Another tab still has the trust overview open
        req.onblocked = () => resolve(false);
      } catch (e) { resolve(false); }
    });
  }

  async function clearAll() {
    let ok = true;
    for (const key of LOCAL_KEYS) {
      try { localStorage.removeItem(key); } catch (e) { ok = false; }
    }
    for (const name of INDEXED_DBS) {
      if (!(await deleteDb(name))) ok = false;
    }
    return ok;
  }

  btn.addEventListener("click", () => {
    if (status) status.textContent = "";
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
      cancelBtn.focus();
    } else if (window.confirm("Delete all saved data for every tracker and register in this browser? This cannot be undone.")) {
      confirmBtn.click();
    }
  });

  cancelBtn.addEventListener("click", () => { if (dialog.open) dialog.close(); });

  confirmBtn.addEventListener("click", async () => {
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    const ok = await clearAll();
    if (dialog.open) dialog.close();
    if (ok) {
      try { sessionStorage.setItem("reset_done", "1"); } catch (e) { /* ignore */ }
      location.reload();
    } else {
      confirmBtn.disabled = false;
      cancelBtn.disabled = false;
      if (status) status.textContent = "Some data could not be cleared. Close any other tabs with this toolkit open (especially the Trust Overview), then try again.";
    }
  });

  // Confirm after the reload
  try {
    if (sessionStorage.getItem("reset_done")) {
      sessionStorage.removeItem("reset_done");
      if (status) status.textContent = "All saved data has been cleared from this browser.";
    }
  } catch (e) { /* ignore */ }
})();
