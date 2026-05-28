/**
 * GitLab Pipeline Auto-Runner (DevTools Console)
 * ================================================
 * Paste this entire code in the DevTools console (F12) while on the
 * GitLab pipeline page. It will automatically trigger all manual jobs
 * as soon as they become available.
 *
 * How to stop:
 *   clearInterval(window.__pipelineRunner)
 *
 * How to change the interval (default 10s):
 *   Change the POLL_INTERVAL_MS constant before pasting.
 */

(function () {
  const POLL_INTERVAL_MS = 10000; // polling interval in ms (10 seconds)

  // Stores keys of already-clicked buttons to avoid double-triggering
  const clicked = new Set();

  // -------------------------------------------------------------------------
  // Log utilities with timestamp
  // -------------------------------------------------------------------------
  const log = {
    info:    (msg) => console.log( `%c[${ts()}] ℹ️  ${msg}`, "color: #6a9fd8"),
    success: (msg) => console.log( `%c[${ts()}] ✅ ${msg}`, "color: #4caf50; font-weight: bold"),
    warn:    (msg) => console.warn( `[${ts()}] ⚠️  ${msg}`),
    error:   (msg) => console.error(`[${ts()}] ❌ ${msg}`),
  };

  function ts() {
    return new Date().toLocaleTimeString("en-US");
  }

  // -------------------------------------------------------------------------
  // Reads the job name (inner div with title inside the status link)
  // -------------------------------------------------------------------------
  function getJobName(jobItem) {
    // The ci-job-item-content link has title="manual action", but inside it
    // there is a <div title="job-name"> with the actual name
    const nameEl = jobItem.querySelector(
      '[data-testid="ci-job-item-content"] [title]'
    );
    return nameEl ? nameEl.getAttribute("title") : "unknown";
  }

  // -------------------------------------------------------------------------
  // Discovers the stage name from the ancestor stage-column
  // -------------------------------------------------------------------------
  function getStageName(jobItem) {
    const stageCol = jobItem.closest('[data-testid="stage-column"]');
    if (!stageCol) return "?";
    const titleEl = stageCol.querySelector('[data-testid="stage-column-title"] span');
    return titleEl ? titleEl.textContent.trim() : "?";
  }

  // -------------------------------------------------------------------------
  // Returns a unique key to identify the button (avoids double-triggering)
  // -------------------------------------------------------------------------
  function getButtonKey(playBtn) {
    // The id contains the job path, e.g.: js-ci-action-.../jobs/509224/play
    return playBtn.id || playBtn.closest('[data-testid="ci-job-item"]')?.id || Math.random();
  }

  // -------------------------------------------------------------------------
  // Returns all jobs with an available "Run" button (ready to trigger)
  // -------------------------------------------------------------------------
  function findManualJobs() {
    // If the [title="Run"] button exists in the item, the job is waiting
    // for manual trigger — no need to check status separately.
    // NOTE: the status link title is "manual action" (not "manual"),
    //       which is why the previous version couldn't find the jobs.
    const jobItems = document.querySelectorAll('[data-testid="ci-job-item"]');
    const pending = [];

    for (const item of jobItems) {
      const playBtn = item.querySelector('[data-testid="ci-action-button"][title="Run"]');
      if (!playBtn) continue;

      const key = getButtonKey(playBtn);
      if (clicked.has(key)) continue;

      pending.push({ item, playBtn, key });
    }

    return pending;
  }

  // -------------------------------------------------------------------------
  // Checks if the pipeline has ended (all jobs in a terminal state)
  // -------------------------------------------------------------------------
  function isPipelineFinished() {
    const allItems = document.querySelectorAll('[data-testid="ci-job-item"]');
    if (allItems.length === 0) return false;

    const terminalStatuses = new Set(["passed", "failed", "canceled", "skipped"]);

    for (const item of allItems) {
      const statusLink = item.querySelector('[data-testid="ci-job-item-content"]');
      if (!statusLink) continue;
      const status = (statusLink.getAttribute("title") || "").toLowerCase();
      if (!terminalStatuses.has(status)) return false;
    }
    return true;
  }

  // -------------------------------------------------------------------------
  // Main cycle: called at each interval
  // -------------------------------------------------------------------------
  function cycle() {
    const manualJobs = findManualJobs();

    if (manualJobs.length === 0) {
      if (isPipelineFinished()) {
        log.success("Pipeline finished! Shutting down the auto-runner.");
        clearInterval(window.__pipelineRunner);
        return;
      }
      log.info("Waiting for manual jobs...");
      return;
    }

    for (const { item, playBtn, key } of manualJobs) {
      const name  = getJobName(item);
      const stage = getStageName(item);
      log.success(`Triggering [${stage}] → ${name}`);
      clicked.add(key);
      playBtn.click();
    }
  }

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------
  console.log("%c🚀 GitLab Pipeline Auto-Runner started!", "font-size:14px; font-weight:bold; color:#fc6d26");
  console.log(`%cPolling every ${POLL_INTERVAL_MS / 1000}s.  To stop: clearInterval(window.__pipelineRunner)`, "color: #aaa");

  cycle(); // runs immediately on the first call
  window.__pipelineRunner = setInterval(cycle, POLL_INTERVAL_MS);
})();
