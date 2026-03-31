/**
 * script.js – Sound Horeg Festival Wedding Invitation
 * =====================================================
 * Modules:
 *   1. INVITATION  – open / transition cover → content
 *   2. TIMER       – session countdown & DOM auto-hide
 *   3. RSVP        – form handling, localStorage, dynamic list
 *   4. ANIMATION   – scroll-triggered section & timeline entrance
 *   5. INIT        – bootstrap on DOMContentLoaded
 */

"use strict";

/* ============================================================
   MODULE 1 – INVITATION
   Handles the cover → content reveal flow.
   ============================================================ */
const InvitationModule = (() => {
  /** Smoothly reveal the invitation content when user clicks "Buka Undangan". */
  function openInvitation() {
    const btn = document.getElementById("btn-open-invitation");
    const wrapper = document.getElementById("invitation-wrapper");

    if (!btn || !wrapper) return;

    btn.addEventListener("click", () => {
      // Animate the cover out
      const cover = document.getElementById("cover");
      if (cover) {
        cover.style.transition = "opacity 0.8s ease, transform 0.8s ease";
        cover.style.opacity = "0";
        cover.style.transform = "scale(0.97)";
        cover.style.pointerEvents = "none";
      }

      setTimeout(() => {
        // Hide cover, show content
        if (cover) cover.style.display = "none";
        wrapper.classList.remove("hidden");
        document.body.style.background = "#060c1a";

        // Scroll to top of invitation content
        window.scrollTo({ top: 0, behavior: "smooth" });

        // Start session timer now that content is open
        TimerModule.start();

        // Trigger section animations after a short delay
        setTimeout(() => AnimationModule.observeSections(), 100);
      }, 800);
    });
  }

  /** Public API */
  return { init: openInvitation };
})();

/* ============================================================
   MODULE 2 – TIMER
   5-minute (300 s) countdown.
   When time expires: hides #main-content and shows overlay.
   ============================================================ */
const TimerModule = (() => {
  const SESSION_SECONDS = 5 * 60; // 300 seconds = 5 minutes
  let remaining = SESSION_SECONDS;
  let intervalId = null;

  /** Format seconds → MM:SS */
  function formatTime(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  /** Update displayed timer string */
  function updateDisplay() {
    const el = document.getElementById("timer-display");
    if (el) el.textContent = formatTime(remaining);
  }

  /** Trigger session-expired overlay */
  function expireSession() {
    clearInterval(intervalId);

    const main = document.getElementById("main-content");
    const overlay = document.getElementById("session-overlay");

    // Hide main DOM
    if (main) main.style.display = "none";

    // Show overlay
    if (overlay) {
      overlay.classList.remove("hidden");
      overlay.setAttribute("aria-hidden", "false");
    }
  }

  /** Wire up the "Buka Kembali" button inside the overlay */
  function bindReopenButton() {
    const btn = document.getElementById("btn-reopen");
    if (btn) btn.addEventListener("click", () => location.reload());
  }

  /** Start the countdown (called after invitation is opened) */
  function start() {
    const timerEl = document.getElementById("session-timer");
    if (timerEl) timerEl.classList.remove("hidden");

    updateDisplay();

    intervalId = setInterval(() => {
      remaining -= 1;
      updateDisplay();

      // Warning pulse when ≤ 60 seconds left
      if (remaining === 60) {
        const timerWrapper = document.getElementById("session-timer");
        if (timerWrapper) {
          timerWrapper.style.borderColor = "rgba(255,100,100,0.6)";
          timerWrapper.style.color = "#ff6b6b";
        }
      }

      if (remaining <= 0) expireSession();
    }, 1000);
  }

  return { start, bindReopenButton };
})();

/* ============================================================
   MODULE 3 – RSVP
   Handles form submit/validate, localStorage persistence,
   and dynamic rendering of the RSVP card list.
   ============================================================ */
const RSVPModule = (() => {
  const STORAGE_KEY = "horeg_wedding_rsvp";

  /* ---------- Storage ---------- */

  function loadEntries() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (_) {
      return [];
    }
  }

  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  /* ---------- Validation ---------- */

  function showError(fieldId, msg) {
    const el = document.getElementById(fieldId);
    if (el) el.textContent = msg;
  }

  function clearErrors() {
    ["name-error", "attendance-error", "count-error"].forEach((id) =>
      showError(id, ""),
    );
  }

  function validateForm(name, attendance, count) {
    let valid = true;
    clearErrors();

    if (!name.trim()) {
      showError("name-error", "Nama tamu wajib diisi.");
      valid = false;
    }
    if (!attendance) {
      showError("attendance-error", "Pilih status kehadiran.");
      valid = false;
    }
    const countNum = parseInt(count, 10);
    if (!count || isNaN(countNum) || countNum < 1 || countNum > 10) {
      showError("count-error", "Masukkan jumlah tamu antara 1–10.");
      valid = false;
    }

    return valid;
  }

  /* ---------- Rendering ---------- */

  /** Determine CSS class for attendance status badge */
  function statusClass(attendance) {
    if (attendance === "Hadir") return "status-hadir";
    if (attendance === "Tidak Hadir") return "status-tidak-hadir";
    return "status-mungkin";
  }

  /** Build a single RSVP card HTML string */
  function buildCard(entry) {
    const msgHtml = entry.message
      ? `<p class="rsvp-card-msg">"${escapeHTML(entry.message)}"</p>`
      : "";
    return `
      <div class="rsvp-card">
        <div class="rsvp-card-header">
          <span class="rsvp-card-name">${escapeHTML(entry.name)}</span>
          <span class="rsvp-card-status ${statusClass(entry.attendance)}">${escapeHTML(entry.attendance)}</span>
        </div>
        <span class="rsvp-card-count">👥 ${entry.count} orang</span>
        ${msgHtml}
        <span class="rsvp-card-time">${entry.timestamp}</span>
      </div>`;
  }

  /** Render all stored entries into #rsvp-list */
  function renderList() {
    const listEl = document.getElementById("rsvp-list");
    const emptyEl = document.getElementById("rsvp-empty");
    const badge = document.getElementById("rsvp-count-badge");
    const entries = loadEntries();

    if (!listEl) return;

    if (entries.length === 0) {
      if (emptyEl) emptyEl.style.display = "block";
      if (badge) badge.textContent = "0";
      return;
    }

    // Hide empty state
    if (emptyEl) emptyEl.style.display = "none";
    if (badge) badge.textContent = String(entries.length);

    // Render newest first
    const reversed = [...entries].reverse();
    listEl.innerHTML = reversed.map(buildCard).join("");
  }

  /* ---------- Form Submission ---------- */

  function handleSubmit(e) {
    e.preventDefault();

    const name = document.getElementById("rsvp-name").value;
    const attendance = document.getElementById("rsvp-attendance").value;
    const count = document.getElementById("rsvp-count").value;
    const message = document.getElementById("rsvp-message").value.trim();

    if (!validateForm(name, attendance, count)) return;

    const entries = loadEntries();
    const entry = {
      id: Date.now(),
      name: name.trim(),
      attendance,
      count: parseInt(count, 10),
      message,
      timestamp: new Date().toLocaleString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    entries.push(entry);
    saveEntries(entries);

    // Reset form & show success
    document.getElementById("rsvp-form").reset();
    const successEl = document.getElementById("rsvp-success");
    if (successEl) {
      successEl.classList.remove("hidden");
      setTimeout(() => successEl.classList.add("hidden"), 4500);
    }

    renderList();
  }

  /* ---------- Init ---------- */

  function init() {
    const form = document.getElementById("rsvp-form");
    if (form) form.addEventListener("submit", handleSubmit);
    renderList();
  }

  return { init };
})();

/* ============================================================
   MODULE 4 – ANIMATION
   Scroll-triggered entrance for sections and timeline items.
   Uses IntersectionObserver (no external library needed).
   ============================================================ */
const AnimationModule = (() => {
  /** Observe all .section elements (except cover) for fade-in */
  function observeSections() {
    const sections = document.querySelectorAll(
      "#prayer, #couple, #maps, #rsvp, #timeline, #footer",
    );

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            sectionObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    sections.forEach((sec) => sectionObserver.observe(sec));

    // Observe timeline items separately
    observeTimeline();
  }

  /** Observe timeline items for staggered slide-in */
  function observeTimeline() {
    const items = document.querySelectorAll(".tl-item");

    const tlObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add("visible");
            }, i * 150);
            tlObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );

    items.forEach((item) => tlObserver.observe(item));
  }

  return { observeSections };
})();

/* ============================================================
   HELPERS
   ============================================================ */

/** Prevent XSS in dynamically inserted text */
function escapeHTML(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* ============================================================
   MODULE 5 – INIT
   Bootstrap every module on DOM ready.
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  // 1. Bind the "Buka Undangan" button
  InvitationModule.init();

  // 2. Bind "Buka Kembali" in session overlay
  TimerModule.bindReopenButton();

  // 3. Init RSVP (render persisted entries immediately)
  RSVPModule.init();

  // Note: AnimationModule.observeSections() is called INSIDE
  //       InvitationModule after the wrapper is revealed, so
  //       IntersectionObserver targets are already in the DOM.
});
