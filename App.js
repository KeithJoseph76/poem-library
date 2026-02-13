/* ============================================================
   OUR QUIET PLACE — app.js
   Supabase-backed poem library.
   ============================================================ */

// ============================================================
// ██  CONFIGURATION  — fill in your own Supabase credentials
// ============================================================
const SUPABASE_URL   = "https://reuupfvfmfibqqfqniin.supabase.co";
const SUPABASE_KEY   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJldXVwZnZmbWZpYnFxZnFuaWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NjkzMzAsImV4cCI6MjA4NjU0NTMzMH0.mOeDwmEIvlJ-6YrvkCdx20F-Az8c-amh4O5xSTQpxns";
const ADMIN_PASSWORD = "Keillyjessicajoseph";   // local-only check
const TABLE_NAME     = "poems";

// ============================================================
// ██  RELATIONSHIP START DATE  —  change this to your actual date!
// ============================================================
const RELATIONSHIP_START = new Date("2024-12-08");  // Keith & Her — December 8, 2024

function daysTogether() {
    const now = new Date();
    const diff = now - RELATIONSHIP_START;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ============================================================
// ██  SWEET MESSAGES  —  randomly shown when opening poems
// ============================================================
const SWEET_MESSAGES = [
    "Missing you a little extra today ♥",
    "You're the best part of my day",
    "Thinking of you right now",
    "Wish you were here",
    "Can't wait to see you again",
    "You make everything better",
    "Still falling for you every day",
    "Distance means nothing when you mean everything",
    "You're my favorite person",
    "Forever grateful for you"
];

// ============================================================
// ██  MILESTONES  —  special relationship moments
// ============================================================
const MILESTONES = [
    { days: 7, text: "One week together! ✦" },
    { days: 30, text: "First month! 🌙" },
    { days: 50, text: "50 days strong! 💫" },
    { days: 100, text: "100 days! 💯" },
    { days: 180, text: "Half a year! 🎉" },
    { days: 200, text: "200 days! ⭐" },
    { days: 365, text: "One year together! 🎊" },
    { days: 500, text: "500 days! 🌟" },
    { days: 730, text: "Two years! 💕" }
];

// ============================================================
// ██  TAG COLOUR PALETTE  (cycles through these)
// ============================================================
const TAG_COLOURS = [
    { bg: "rgba(91,168,223,.14)",  border: "rgba(91,168,223,.32)",  text: "#5ba8df" },   // frost blue
    { bg: "rgba(90,195,168,.14)",  border: "rgba(90,195,168,.32)",  text: "#5ac3a8" },   // teal
    { bg: "rgba(175,110,230,.14)", border: "rgba(175,110,230,.32)", text: "#af6ee6" },   // violet
    { bg: "rgba(232,144,122,.14)", border: "rgba(232,144,122,.32)", text: "#e8907a" },   // rose-gold
    { bg: "rgba(215,95,140,.14)",  border: "rgba(215,95,140,.32)",  text: "#d75f8c" },   // rose
    { bg: "rgba(80,200,220,.14)",  border: "rgba(80,200,220,.32)",  text: "#50c8dc" }    // cyan
];

// Deterministic colour index for a tag string
function tagColourIndex(tag) {
    let h = 0;
    for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0;
    return Math.abs(h) % TAG_COLOURS.length;
}

function applyTagStyle(el, tag) {
    const c = TAG_COLOURS[tagColourIndex(tag)];
    el.style.background   = c.bg;
    el.style.borderColor  = c.border;
    el.style.color        = c.text;
}

// ============================================================
// ██  MOOD → TAG mapping  (Tonight view)
// ============================================================
const MOOD_TAGS = {
    cozy:    ["cozy", "home", "warm", "comfort", "quiet"],
    hopeful: ["hopeful", "hope", "future", "dreams", "bright", "morning"],
    tender:  ["tender", "love", "longing", "night", "soft", "gentle", "kiss"],
    playful: ["playful", "fun", "laugh", "smile", "joy", "light"]
};

// ============================================================
// ██  SUPABASE HELPERS
// ============================================================
const sb = {
    headers() {
        return {
            "Content-Type":  "application/json",
            "apikey":        SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Prefer":        "return=representation"
        };
    },
    async getAll() {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?order=created_at.desc`,
            { headers: this.headers() }
        );
        if (!res.ok) throw new Error("Failed to fetch poems");
        return res.json();
    },
    async insert(data) {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/${TABLE_NAME}`,
            { method: "POST", headers: this.headers(), body: JSON.stringify(data) }
        );
        if (!res.ok) { const e = await res.text(); throw new Error(e || "Insert failed"); }
        return res.json();
    },
    async update(id, data) {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?id=eq.${id}`,
            { method: "PATCH", headers: this.headers(), body: JSON.stringify(data) }
        );
        if (!res.ok) throw new Error("Update failed");
        return res.json();
    },
    async remove(id) {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?id=eq.${id}`,
            { method: "DELETE", headers: this.headers() }
        );
        if (!res.ok) throw new Error("Delete failed");
    }
};

// ============================================================
// ██  STATE
// ============================================================
let poems           = [];
let filtered        = [];
let activeTag       = "all";
let searchQuery     = "";
let activePoemId    = null;
let favourites      = new Set();
let pendingDeleteId = null;
let editingId       = null;
let activeMood      = "all";          // Tonight mood filter
let logoClickCount  = 0;              // Hidden admin trigger
let realtimeInterval = null;          // Real-time counter

// ============================================================
// ██  INIT
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
    loadFavourites();
    spawnSnowflakes();
    updateDaysCounter();
    startRealtimeCounter();
    renderMilestones();
    await fetchPoems();
    renderList();
    renderTags();
    renderAdminList();
    updatePoemCount();
    bindUI();
    
    // Initialize mobile if needed
    if (isMobile()) {
        initMobile();
    }
});

// ============================================================
// ██  SNOWFLAKES  (spawned once)
// ============================================================
function spawnSnowflakes() {
    const container = document.getElementById("snowflakes");
    const glyphs = ["❄", "✦", "·", "❅"];
    for (let i = 0; i < 28; i++) {
        const f = document.createElement("div");
        f.className = "flake";
        f.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
        f.style.left          = Math.random() * 100 + "vw";
        f.style.animationDuration = (12 + Math.random() * 18) + "s";
        f.style.animationDelay    = -(Math.random() * 20) + "s";
        f.style.fontSize      = (7 + Math.random() * 8) + "px";
        f.style.opacity       = 0.3 + Math.random() * 0.4;
        container.appendChild(f);
    }
}

// ============================================================
// ██  DATA
// ============================================================
async function fetchPoems() {
    try { 
        poems = await sb.getAll();
        // Initialize filters
        computeFiltered();
        // Render mobile list if on mobile
        if (isMobile()) {
            renderMobileList();
            renderMobileTags();
        }
    }
    catch (e) { 
        console.warn("Could not fetch poems:", e); 
        poems = [];
    }
}

// ============================================================
// ██  FAVOURITES
// ============================================================
function loadFavourites() {
    try {
        const raw = localStorage.getItem("qp_favourites");
        if (raw) favourites = new Set(JSON.parse(raw));
    } catch { /* ignore */ }
}

function saveFavourites() {
    localStorage.setItem("qp_favourites", JSON.stringify([...favourites]));
}

// ============================================================
// ██  FILTERING
// ============================================================
function computeFiltered() {
    let result = poems;
    if (activeTag !== "all") {
        result = result.filter(p => (p.tags || []).includes(activeTag));
    }
    if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        result = result.filter(p =>
            (p.title || "").toLowerCase().includes(q) ||
            (p.body || "").substring(0, 120).toLowerCase().includes(q)
        );
    }
    filtered = result;
}

// ============================================================
// ██  RENDER — sidebar list
// ============================================================
function renderList() {
    computeFiltered();
    const ul = document.getElementById("poemList");
    ul.innerHTML = "";

    if (filtered.length === 0) {
        ul.innerHTML = '<li style="padding:36px 16px;color:var(--ink-dim);font-size:.72rem;text-align:center;letter-spacing:.04em;">nothing here yet</li>';
        return;
    }

    filtered.forEach((p, i) => {
        const li = document.createElement("li");
        li.className = "poem-list-item"
            + (favourites.has(p.id) ? " favourited" : "")
            + (p.id === activePoemId ? " active" : "");
        li.dataset.id = p.id;

        // staggered entrance
        li.style.opacity   = 0;
        li.style.transform = "translateY(6px)";
        li.style.transition = `opacity .3s ${i * 0.04}s ease, transform .3s ${i * 0.04}s ease`;

        const preview = (p.body || "").replace(/\n/g, " ").substring(0, 80);

        li.innerHTML = `
            <span class="item-fav">♥</span>
            <div class="item-title">${escHtml(p.title)}</div>
            <div class="item-date">${formatDate(p.created_at)}</div>
            <div class="item-preview">${escHtml(preview)}</div>
        `;

        li.addEventListener("click", () => openPoem(p.id));
        ul.appendChild(li);

        // trigger entrance on next frame
        requestAnimationFrame(() => {
            li.style.opacity   = 1;
            li.style.transform = "translateY(0)";
        });
    });
}

// ============================================================
// ██  RENDER — tags (coloured)
// ============================================================
function renderTags() {
    const container = document.querySelector(".tag-filter");
    container.querySelectorAll(".tag:not([data-tag='all'])").forEach(el => el.remove());

    // style the "all" tag active state
    const allTag = container.querySelector("[data-tag='all']");
    if (activeTag === "all") {
        allTag.style.background   = "rgba(91,168,223,.17)";
        allTag.style.borderColor  = "rgba(91,168,223,.38)";
        allTag.style.color        = "#5ba8df";
    } else {
        allTag.style.background   = "";
        allTag.style.borderColor  = "";
        allTag.style.color        = "";
    }

    const allTags = new Set();
    poems.forEach(p => (p.tags || []).forEach(t => allTags.add(t)));

    allTags.forEach(tag => {
        const span = document.createElement("span");
        span.className = "tag" + (activeTag === tag ? " active" : "");
        span.dataset.tag = tag;
        span.textContent = tag;

        // always apply colour
        applyTagStyle(span, tag);

        // if not the active one, dim it a bit
        if (activeTag !== tag) {
            span.style.background  = "transparent";
            span.style.borderColor = TAG_COLOURS[tagColourIndex(tag)].border;
            // keep the coloured text
        }

        span.addEventListener("click", () => {
            activeTag = tag;
            document.querySelectorAll(".tag").forEach(t => {
                t.classList.remove("active");
                // reset all to dim state
                if (t.dataset.tag !== "all") {
                    t.style.background = "transparent";
                }
            });
            // dim the "all" tag
            allTag.style.background   = "";
            allTag.style.borderColor  = "";
            allTag.style.color        = "";

            // activate clicked
            span.classList.add("active");
            applyTagStyle(span, tag);

            renderList();
        });
        container.appendChild(span);
    });
}

// ============================================================
// ██  READER
// ============================================================
function openPoem(id) {
    const poem = poems.find(p => p.id === id);
    if (!poem) return;

    activePoemId = id;

    document.getElementById("readerEmpty").style.display = "none";
    const article = document.getElementById("readerArticle");
    article.classList.remove("hidden");

    // sweet message (30% chance)
    const sweetMsgEl = document.getElementById("sweetMessage");
    if (Math.random() < 0.3) {
        const msg = SWEET_MESSAGES[Math.floor(Math.random() * SWEET_MESSAGES.length)];
        sweetMsgEl.textContent = msg;
        sweetMsgEl.classList.remove("hidden");
    } else {
        sweetMsgEl.classList.add("hidden");
    }

    document.getElementById("readTitle").textContent = poem.title;
    document.getElementById("readDate").textContent  = formatDate(poem.created_at);
    document.getElementById("readBody").textContent  = poem.body;

    // dedication
    const dedicationEl = document.getElementById("readDedication");
    if (poem.dedication && poem.dedication.trim()) {
        dedicationEl.textContent = poem.dedication;
        dedicationEl.classList.remove("hidden");
    } else {
        dedicationEl.classList.add("hidden");
    }

    // coloured tags
    const tagsEl = document.getElementById("readTags");
    tagsEl.innerHTML = "";
    (poem.tags || []).forEach(t => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = t;
        applyTagStyle(span, t);
        tagsEl.appendChild(span);
    });

    // favourite
    const favBtn = document.getElementById("favBtn");
    favBtn.classList.toggle("active", favourites.has(id));

    // list highlight
    document.querySelectorAll(".poem-list-item").forEach(li => {
        li.classList.toggle("active", li.dataset.id === String(id));
    });

    // re-trigger shimmer by cloning title node
    const titleEl = document.getElementById("readTitle");
    titleEl.style.animation = "none";
    void titleEl.offsetHeight;
    titleEl.style.animation = "";
}

// ============================================================
// ██  TONIGHT
// ============================================================
function showTonightPoem() {
    if (poems.length === 0) return;

    let pool = poems;

    // filter by mood if one is selected
    if (activeMood !== "all" && MOOD_TAGS[activeMood]) {
        const moodTagSet = MOOD_TAGS[activeMood];
        const moodFiltered = poems.filter(p =>
            (p.tags || []).some(t => moodTagSet.includes(t.toLowerCase()))
        );
        // fall back to full list if nothing matches
        if (moodFiltered.length > 0) pool = moodFiltered;
    }

    // avoid repeating last pick
    let pick;
    if (pool.length === 1) {
        pick = pool[0];
    } else {
        const candidates = pool.filter(p => p.id !== (showTonightPoem._lastId || null));
        pick = candidates[Math.floor(Math.random() * candidates.length)];
    }
    showTonightPoem._lastId = pick.id;

    const article = document.getElementById("tonightPoem");

    // hide → re-show to re-trigger animation
    article.classList.add("hidden");
    void article.offsetHeight;
    article.classList.remove("hidden");

    document.getElementById("tTitle").textContent = pick.title;
    document.getElementById("tDate").textContent  = formatDate(pick.created_at);
    document.getElementById("tBody").textContent  = pick.body;

    // dedication
    const dedicationEl = document.getElementById("tDedication");
    if (pick.dedication && pick.dedication.trim()) {
        dedicationEl.textContent = pick.dedication;
        dedicationEl.classList.remove("hidden");
    } else {
        dedicationEl.classList.add("hidden");
    }

    // coloured tags
    const tagsEl = document.getElementById("tTags");
    tagsEl.innerHTML = "";
    (pick.tags || []).forEach(t => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = t;
        applyTagStyle(span, t);
        tagsEl.appendChild(span);
    });
}

// ============================================================
// ██  ADMIN
// ============================================================
async function savePoem() {
    const title      = document.getElementById("poemTitle").value.trim();
    const dedication = document.getElementById("poemDedication").value.trim();
    const body       = document.getElementById("poemBody").value.trim();
    const tagsRaw    = document.getElementById("poemTags").value.trim();
    const tags       = tagsRaw ? tagsRaw.split(",").map(t => t.trim().toLowerCase()).filter(Boolean) : [];
    const errEl      = document.getElementById("saveError");

    if (!title || !body) {
        errEl.textContent = "title and poem are required";
        errEl.classList.remove("hidden");
        return;
    }

    errEl.classList.add("hidden");

    try {
        const data = { title, body, tags };
        if (dedication) data.dedication = dedication;

        if (editingId) {
            await sb.update(editingId, data);
        } else {
            await sb.insert(data);
        }

        await fetchPoems();
        renderList();
        renderTags();
        renderAdminList();
        updatePoemCount();
        clearAdminForm();
    } catch (e) {
        errEl.textContent = e.message || "something went wrong";
        errEl.classList.remove("hidden");
    }
}

function clearAdminForm() {
    document.getElementById("poemTitle").value = "";
    document.getElementById("poemDedication").value = "";
    document.getElementById("poemBody").value  = "";
    document.getElementById("poemTags").value  = "";
    editingId = null;
    document.querySelector(".modal-admin h2").textContent = "write a poem";
}

function renderAdminList() {
    const ul = document.getElementById("adminPoemList");
    ul.innerHTML = "";

    poems.forEach(p => {
        const li = document.createElement("li");
        li.className = "admin-poem-item";
        li.innerHTML = `
            <span class="apo-title">${escHtml(p.title)}</span>
            <div class="apo-actions">
                <button class="apo-edit" data-id="${p.id}">edit</button>
                <button class="apo-delete" data-id="${p.id}">delete</button>
            </div>
        `;
        ul.appendChild(li);
    });

    ul.querySelectorAll(".apo-edit").forEach(btn => {
        btn.addEventListener("click", () => startEdit(btn.dataset.id));
    });

    ul.querySelectorAll(".apo-delete").forEach(btn => {
        btn.addEventListener("click", () => {
            pendingDeleteId = btn.dataset.id;
            document.getElementById("deleteConfirmOverlay").classList.remove("hidden");
        });
    });
}

function startEdit(id) {
    const poem = poems.find(p => String(p.id) === String(id));
    if (!poem) return;

    editingId = poem.id;
    document.getElementById("poemTitle").value = poem.title;
    document.getElementById("poemDedication").value = poem.dedication || "";
    document.getElementById("poemBody").value  = poem.body;
    document.getElementById("poemTags").value  = (poem.tags || []).join(", ");
    document.querySelector(".modal-admin h2").textContent = "edit poem";

    document.getElementById("poemTitle").scrollIntoView({ behavior: "smooth", block: "center" });
    document.getElementById("poemTitle").focus();
}

async function confirmDelete() {
    if (pendingDeleteId == null) return;
    try {
        await sb.remove(pendingDeleteId);

        if (String(activePoemId) === String(pendingDeleteId)) {
            activePoemId = null;
            document.getElementById("readerArticle").classList.add("hidden");
            document.getElementById("readerEmpty").style.display = "";
        }

        if (String(editingId) === String(pendingDeleteId)) clearAdminForm();

        await fetchPoems();
        renderList();
        renderTags();
        renderAdminList();
        updatePoemCount();
    } catch (e) { console.warn("Delete failed:", e); }

    pendingDeleteId = null;
    document.getElementById("deleteConfirmOverlay").classList.add("hidden");
}

// ============================================================
// ██  POEM COUNT BADGE
// ============================================================
function updatePoemCount() {
    document.getElementById("poemCount").textContent = poems.length;
}

// ============================================================
// ██  BIND UI
// ============================================================
function bindUI() {
    // --- hidden admin trigger (triple-click logo) ---
    const logo = document.getElementById("logoTrigger");
    let clickTimeout;
    logo.addEventListener("click", () => {
        logoClickCount++;
        clearTimeout(clickTimeout);
        
        if (logoClickCount === 3) {
            // Triple-click detected - open admin login
            document.getElementById("loginOverlay").classList.remove("hidden");
            document.getElementById("adminPassword").value = "";
            document.getElementById("loginError").classList.add("hidden");
            setTimeout(() => document.getElementById("adminPassword").focus(), 120);
            logoClickCount = 0;
        }
        
        clickTimeout = setTimeout(() => {
            logoClickCount = 0;
        }, 500); // reset after 500ms
    });

    // --- view switcher ---
    document.querySelectorAll(".nav-btn[data-view]").forEach(btn => {
        btn.addEventListener("click", () => {
            const view = btn.dataset.view;
            document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
            document.getElementById("view" + view.charAt(0).toUpperCase() + view.slice(1)).classList.add("active");
        });
    });

    // --- search ---
    document.getElementById("searchInput").addEventListener("input", function() {
        searchQuery = this.value;
        renderList();
    });

    // --- tag "all" ---
    document.querySelector(".tag[data-tag='all']").addEventListener("click", function() {
        activeTag = "all";
        document.querySelectorAll(".tag").forEach(t => {
            t.classList.remove("active");
            if (t.dataset.tag !== "all") t.style.background = "transparent";
        });
        this.classList.add("active");
        this.style.background   = "rgba(91,168,223,.17)";
        this.style.borderColor  = "rgba(91,168,223,.38)";
        this.style.color        = "#5ba8df";
        renderList();
    });

    // --- favourite toggle with pulse ---
    document.getElementById("favBtn").addEventListener("click", function() {
        if (activePoemId == null) return;

        if (favourites.has(activePoemId)) {
            favourites.delete(activePoemId);
        } else {
            favourites.add(activePoemId);
        }
        saveFavourites();
        this.classList.toggle("active", favourites.has(activePoemId));

        // heartbeat pulse
        this.classList.add("pulse");
        setTimeout(() => this.classList.remove("pulse"), 360);

        // update list
        const li = document.querySelector(`.poem-list-item[data-id="${activePoemId}"]`);
        if (li) li.classList.toggle("favourited", favourites.has(activePoemId));
    });

    // --- tonight button ---
    document.getElementById("tonightBtn").addEventListener("click", showTonightPoem);

    // --- mood wheel ---
    document.querySelectorAll(".mood-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            activeMood = this.dataset.mood;
            document.querySelectorAll(".mood-btn").forEach(b => b.classList.remove("active"));
            this.classList.add("active");
        });
    });

    // --- login ---
    document.getElementById("loginBtn").addEventListener("click", attemptLogin);
    document.getElementById("adminPassword").addEventListener("keydown", function(e) {
        if (e.key === "Enter") attemptLogin();
    });

    // --- admin close ---
    document.getElementById("adminClose").addEventListener("click", () => {
        document.getElementById("adminOverlay").classList.add("hidden");
        clearAdminForm();
    });

    document.getElementById("adminOverlay").addEventListener("click", function(e) {
        if (e.target === this) { this.classList.add("hidden"); clearAdminForm(); }
    });

    document.getElementById("loginOverlay").addEventListener("click", function(e) {
        if (e.target === this) this.classList.add("hidden");
    });

    // --- save ---
    document.getElementById("saveBtn").addEventListener("click", savePoem);

    // --- delete confirm ---
    document.getElementById("confirmDelete").addEventListener("click", confirmDelete);
    document.getElementById("cancelDelete").addEventListener("click", () => {
        pendingDeleteId = null;
        document.getElementById("deleteConfirmOverlay").classList.add("hidden");
    });
    document.getElementById("deleteConfirmOverlay").addEventListener("click", function(e) {
        if (e.target === this) { pendingDeleteId = null; this.classList.add("hidden"); }
    });
}

// ============================================================
// ██  LOGIN
// ============================================================
function attemptLogin() {
    const pw = document.getElementById("adminPassword").value;
    if (pw === ADMIN_PASSWORD) {
        document.getElementById("loginOverlay").classList.add("hidden");
        document.getElementById("adminOverlay").classList.remove("hidden");
        document.getElementById("loginError").classList.add("hidden");
    } else {
        document.getElementById("loginError").classList.remove("hidden");
        document.getElementById("adminPassword").value = "";
        document.getElementById("adminPassword").focus();

        const input = document.getElementById("adminPassword");
        input.style.animation = "shake .3s ease";
        setTimeout(() => input.style.animation = "", 300);
    }
}

// ============================================================
// ██  DAYS COUNTER & REAL-TIME TRACKER
// ============================================================
function updateDaysCounter() {
    const days = daysTogether();
    const counter = document.getElementById("daysCounter");
    const messageDays = document.getElementById("messageDays");
    
    if (counter) counter.textContent = `${days} days ♥`;
    if (messageDays) messageDays.textContent = `${days} days together, and counting forever...`;
}

function updateRealtimeStats() {
    const now = new Date();
    const diff = now - RELATIONSHIP_START;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    const daysEl = document.getElementById("statDays");
    const hoursEl = document.getElementById("statHours");
    const minutesEl = document.getElementById("statMinutes");
    const secondsEl = document.getElementById("statSeconds");
    
    if (daysEl) daysEl.textContent = days.toLocaleString();
    if (hoursEl) hoursEl.textContent = hours;
    if (minutesEl) minutesEl.textContent = minutes;
    if (secondsEl) secondsEl.textContent = seconds;
}

function startRealtimeCounter() {
    updateRealtimeStats();
    if (realtimeInterval) clearInterval(realtimeInterval);
    realtimeInterval = setInterval(updateRealtimeStats, 1000);
}

function renderMilestones() {
    const days = daysTogether();
    const container = document.getElementById("milestones");
    if (!container) return;
    
    container.innerHTML = "";
    
    const achieved = MILESTONES.filter(m => days >= m.days);
    const recentMilestones = achieved.slice(-3); // show last 3 achieved
    
    recentMilestones.forEach((milestone, index) => {
        const badge = document.createElement("div");
        badge.className = "milestone-badge";
        badge.textContent = milestone.text;
        badge.style.animationDelay = `${index * 0.1}s`;
        container.appendChild(badge);
    });
}

// ============================================================
// ██  UTILITIES
// ============================================================
function escHtml(str) {
    const d = document.createElement("div");
    d.appendChild(document.createTextNode(str || ""));
    return d.innerHTML;
}

function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const months = ["january","february","march","april","may","june",
                    "july","august","september","october","november","december"];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// injected keyframes
const _styles = document.createElement("style");
_styles.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25%      { transform: translateX(-6px); }
        75%      { transform: translateX(6px); }
    }
`;
document.head.appendChild(_styles);

// ============================================================
// ██  MOBILE-SPECIFIC FUNCTIONS
// ============================================================

// Check if mobile
function isMobile() {
    return window.innerWidth <= 680;
}

// Render mobile poem list
function renderMobileList() {
    if (!isMobile()) return;
    
    const container = document.getElementById("mobilePoemList");
    if (!container) return;
    
    console.log('Mobile: Rendering', filtered.length, 'poems');
    
    container.innerHTML = "";
    
    filtered.forEach(poem => {
        const li = document.createElement("div");
        li.className = "mobile-poem-item";
        li.dataset.id = poem.id;
        
        if (poem.id === activePoemId) {
            li.classList.add("active");
        }
        
        const preview = (poem.body || "").split("\n")[0].slice(0, 100);
        const isFav = favourites.has(poem.id);
        
        li.innerHTML = `
            <div class="mobile-poem-title">${poem.title}</div>
            <div class="mobile-poem-preview">${preview}${preview.length >= 100 ? '...' : ''}</div>
            <div class="mobile-poem-meta">
                <span class="mobile-poem-date">${formatDate(poem.created_at)}</span>
                <span class="mobile-poem-fav">${isFav ? '♥' : ''}</span>
            </div>
        `;
        
        li.addEventListener("click", () => openMobilePoem(poem.id));
        container.appendChild(li);
    });
    
    // Update mobile count
    const countEl = document.getElementById("poemCountMobile");
    if (countEl) countEl.textContent = poems.length;
}

// Open poem in mobile reader
function openMobilePoem(id) {
    const poem = poems.find(p => p.id === id);
    if (!poem) return;
    
    activePoemId = id;
    
    // Show reader view
    const readerView = document.getElementById("mobileReaderView");
    readerView.classList.add("active");
    
    // Hide empty, show article
    document.getElementById("readerEmptyMobile").style.display = "none";
    const article = document.getElementById("poemArticleMobile");
    article.classList.remove("hidden");
    
    // Sweet message (30% chance)
    const sweetMsgEl = document.getElementById("sweetMessageMobile");
    if (Math.random() < 0.3) {
        const msg = SWEET_MESSAGES[Math.floor(Math.random() * SWEET_MESSAGES.length)];
        sweetMsgEl.textContent = msg;
        sweetMsgEl.classList.remove("hidden");
    } else {
        sweetMsgEl.classList.add("hidden");
    }
    
    // Populate content
    document.getElementById("readTitleMobile").textContent = poem.title;
    document.getElementById("readDateMobile").textContent = formatDate(poem.created_at);
    document.getElementById("readBodyMobile").textContent = poem.body;
    
    // Dedication
    const dedicationEl = document.getElementById("readDedicationMobile");
    if (poem.dedication && poem.dedication.trim()) {
        dedicationEl.textContent = poem.dedication;
        dedicationEl.classList.remove("hidden");
    } else {
        dedicationEl.classList.add("hidden");
    }
    
    // Tags
    const tagsEl = document.getElementById("readTagsMobile");
    tagsEl.innerHTML = "";
    (poem.tags || []).forEach(t => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = t;
        applyTagStyle(span, t);
        tagsEl.appendChild(span);
    });
    
    // Favourite button
    const favBtn = document.getElementById("favBtnMobile");
    favBtn.classList.toggle("active", favourites.has(id));
    
    // Update list highlighting
    document.querySelectorAll(".mobile-poem-item").forEach(item => {
        item.classList.toggle("active", item.dataset.id === String(id));
    });
}

// Close mobile reader
function closeMobileReader() {
    const readerView = document.getElementById("mobileReaderView");
    readerView.classList.remove("active");
}

// Mobile search
function setupMobileSearch() {
    const input = document.getElementById("searchInputMobile");
    if (!input) return;
    
    input.addEventListener("input", function() {
        searchQuery = this.value;
        computeFiltered();
        renderMobileList();
    });
}

// Mobile tag filter
function setupMobileTags() {
    const container = document.getElementById("mobileTagFilter");
    if (!container) return;
    
    // "all" tag handler
    const allTag = container.querySelector("[data-tag='all']");
    if (allTag) {
        allTag.addEventListener("click", function() {
            activeTag = "all";
            document.querySelectorAll("#mobileTagFilter .tag").forEach(t => {
                t.classList.remove("active");
            });
            this.classList.add("active");
            computeFiltered();
            renderMobileList();
        });
    }
}

// Render mobile tags
function renderMobileTags() {
    if (!isMobile()) return;
    
    const container = document.getElementById("mobileTagFilter");
    if (!container) return;
    
    // Remove all except "all"
    container.querySelectorAll(".tag:not([data-tag='all'])").forEach(el => el.remove());
    
    const allTags = new Set();
    poems.forEach(p => (p.tags || []).forEach(t => allTags.add(t)));
    
    allTags.forEach(tag => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = tag;
        span.dataset.tag = tag;
        
        applyTagStyle(span, tag);
        
        span.addEventListener("click", function() {
            activeTag = tag;
            document.querySelectorAll("#mobileTagFilter .tag").forEach(t => {
                t.classList.remove("active");
            });
            this.classList.add("active");
            computeFiltered();
            renderMobileList();
        });
        
        container.appendChild(span);
    });
}

// Mobile favourite toggle
function setupMobileFav() {
    const favBtn = document.getElementById("favBtnMobile");
    if (!favBtn) return;
    
    favBtn.addEventListener("click", function() {
        if (activePoemId == null) return;
        
        if (favourites.has(activePoemId)) {
            favourites.delete(activePoemId);
            this.classList.remove("active");
        } else {
            favourites.add(activePoemId);
            this.classList.add("active");
        }
        
        saveFavourites();
        renderMobileList(); // Update heart in list
    });
}

// Setup mobile reader back button
function setupMobileBack() {
    const backBtn = document.getElementById("readerBack");
    if (backBtn) {
        backBtn.addEventListener("click", closeMobileReader);
    }
}

// Initialize mobile features
function initMobile() {
    if (!isMobile()) return;
    
    setupMobileSearch();
    setupMobileTags();
    setupMobileFav();
    setupMobileBack();
    renderMobileList();
    renderMobileTags();
}

// Handle window resize
window.addEventListener("resize", function() {
    if (isMobile()) {
        renderMobileList();
        renderMobileTags();
    }
});

(function enableMobileSwipeBack() {
    let startX = 0;
    let startY = 0;
    let isSwiping = false;

    function onTouchStart(e) {
        if (!isMobile()) return;
        if (!document.getElementById("mobileReaderView")?.classList.contains("active")) return;

        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        isSwiping = true;
    }

    function onTouchMove(e) {
        if (!isSwiping) return;
        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;

        // If vertical movement is stronger, ignore (so scrolling still works)
        if (Math.abs(dy) > Math.abs(dx)) {
            isSwiping = false;
        }
    }

    function onTouchEnd(e) {
        if (!isSwiping) return;
        isSwiping = false;

        const touch = e.changedTouches[0];
        const dx = touch.clientX - startX;

        // Swipe right threshold
        if (dx > 80) {
            closeMobileReader();
        }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);
})();
