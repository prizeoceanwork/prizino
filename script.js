
if (!window.PZ_CONFIG) {
    window.PZ_CONFIG = {
        api:    '/wp-json/prizino/v1/',
        nonce:  '',
        userId: 1
    };
}

(function () {
    "use strict";

    var PZ_API    = window.PZ_CONFIG.api;
    var PZ_NONCE = window.PZ_CONFIG.nonce;
    var LOGGED_IN = window.PZ_CONFIG.userId > 0;

    var screenContent = null;

    /* ---------- FETCH ---------- */
    function pzFetch(endpoint, options) {
        options = options || {};
        return fetch(PZ_API + endpoint, {
            method: options.method || "GET",
            credentials: "same-origin",
            headers: Object.assign({
                "X-WP-Nonce": PZ_NONCE,
                "Accept": "application/json"
            }, options.body ? { "Content-Type": "application/json" } : {}, options.headers || {}),
            body: options.body || undefined
        }).then(function (r) {
            return r.text().then(function (t) {
                var data = null;
                try { data = t ? JSON.parse(t) : null; } catch (_) {}
                if (!r.ok) {
                    var msg = (data && data.message) || ("HTTP " + r.status);
                    throw new Error(msg);
                }
                return data;
            });
        });
    }

    function esc(v) {
        if (v === null || v === undefined) return "";
        return String(v)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function fmtMoney(n, unit) {
        var v = parseFloat(n);
        if (isNaN(v)) v = 0;
        return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
             + (unit ? " " + unit : "");
    }

    function fmtDate(s) {
        if (!s) return "—";
        var d = new Date(s);
        if (isNaN(d.getTime())) return esc(s);
        return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
    }

    /* ---------- BALANCE ---------- */
    function setBalances(data) {
        if (!data) return;
        var balances  = data.balances  || data;
        var formatted = data.formatted || balances.formatted || {};

        function set(id, key, unit) {
            var el = document.getElementById(id);
            if (!el) return;
            var pretty = formatted[key];
            if (pretty) { el.textContent = pretty; return; }
            var n = parseFloat(balances[key]);
            if (isNaN(n)) { el.textContent = '— ' + unit; return; }
            el.textContent = n.toLocaleString(undefined, {
                minimumFractionDigits: 2, maximumFractionDigits: 2
            }) + ' ' + unit;
        }
        set('pz-bal-tz', 'Tz', 'Tz');
        set('pz-bal-dz', 'Dz', 'Dz');
        set('pz-bal-pr', 'PR', 'PR');
    }

    function loadBalance() {
        if (!LOGGED_IN) return;
        fetch(PZ_API + 'balance', {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 'X-WP-Nonce': PZ_NONCE, 'Accept': 'application/json' }
        })
        .then(function (r) { return r.text(); })
        .then(function (text) {
            var data = null;
            try { data = JSON.parse(text); } catch (e) {}
            setBalances(data);
        })
        .catch(function () {});
    }

    /* ---------- ROUTER ---------- */
    window.prizinoShowScreen = function (screen) {
        if (!screenContent) screenContent = document.getElementById("pz-screen-content");
        if (!screenContent) return;
        screenContent.scrollTop = 0;
        switch (screen) {
            case "profile":   renderProfileScreen();   break;
            case "activity":  renderActivityScreen();  break;
            case "history":   renderHistoryScreen();   break;
            case "prizelist": renderPrizelistScreen(); break;
            case "star-pick":  renderStarPickScreen();   break;
            case "care":      renderCareScreen();      break;
            case "rewards":   renderRewardsScreen();   break;
            case "games":     renderComingSoon("Games");  break;
            case "prizes":    renderComingSoon("Prizes"); break;
            default:          renderDashboardScreen();    break;
        }
    };

    /* ---------- STAR PICK ---------- */
    function renderStarPickScreen() {
        if (!screenContent) screenContent = document.getElementById("pz-screen-content");
        if (!screenContent) return;

        screenContent.innerHTML =
            '<div class="pz-inner-screen pz-star-pick-screen">' +
                topbar("STAR PICK") +
                '<div class="pz-section-title">' +
                    '<strong>STAR PICK</strong>' +
                    '<small>YOUR FREE WEEKLY RAFFLE PICK</small>' +
                '</div>' +
                '<div id="pz-star-pick-body">' +
                    '<div class="pz-empty">Loading your Star Pick…</div>' +
                '</div>' +
            '</div>';

        loadStarPick();
    }

    function loadStarPick() {
        var body = document.getElementById("pz-star-pick-body");
        if (!body) return;

        if (!LOGGED_IN) {
            body.innerHTML = '<div class="pz-empty">Please log in to use Star Pick.</div>';
            return;
        }

        pzFetch("account/star-pick")
            .then(function (d) { renderStarPickBody(d || {}); })
            .catch(function () {
                // Endpoint may not be live yet — show intro screen as fallback
                renderStarPickBody({ pick: null });
            });
    }

    function renderStarPickBody(data) {
        var body = document.getElementById("pz-star-pick-body");
        if (!body) return;

        var pick = data && data.pick ? data.pick : null;

        if (pick) {
            /* -------- Customer has a pick -------- */
            var image = pick.image
                ? '<div class="pz-star-pick-thumb" style="background-image:url(' + esc(pick.image) + ')"></div>'
                : '<div class="pz-star-pick-thumb pz-star-pick-thumb-fallback">★</div>';

            body.innerHTML =
                '<div class="pz-star-pick-current">' +
                    '<span class="pz-star-pick-label">YOUR CURRENT PICK</span>' +
                    image +
                    '<strong class="pz-star-pick-name">' + esc(pick.name || "Star Pick Item") + '</strong>' +
                    (pick.description
                        ? '<p class="pz-star-pick-desc">' + esc(pick.description) + '</p>'
                        : '') +
                    '<span class="pz-star-pick-status">★ Locked in for this week</span>' +
                '</div>';
        } else {
            /* -------- No pick yet — intro screen -------- */
            body.innerHTML =
                '<div class="pz-star-pick-intro">' +
                    '<div class="pz-star-pick-hero">★</div>' +
                    '<strong>PICK YOUR STAR PRIZE</strong>' +
                    '<p>Every week you can lock in a free Star Pick from our Treasury. If your prize is drawn, it\'s yours.</p>' +
                    '<ol class="pz-star-pick-steps">' +
                        '<li><span>1</span> Browse prizes in the Treasury</li>' +
                        '<li><span>2</span> Choose your favourite as your Star Pick</li>' +
                        '<li><span>3</span> Wait for the weekly draw — win it free</li>' +
                    '</ol>' +
                    '<a class="pz-star-pick-cta" href="/treasury">EXPLORE PRIZES IN TREASURY</a>' +
                '</div>';
        }
    }

    /* ---------- TOPBAR ---------- */
    function topbar(title) {
        return '' +
            '<div class="pz-screen-topbar">' +
                '<button type="button" class="pz-back-button" data-screen="dashboard">← BACK</button>' +
                '<span>' + esc(title) + '</span>' +
                '<button type="button" class="pz-logout-button" ' +
                    'onclick="window.location.href=\'/wp-login.php?action=logout\'">LOGOUT</button>' +
            '</div>';
    }

    /* ---------- DASHBOARD ---------- */
    function renderDashboardScreen() {
        if (!screenContent) screenContent = document.getElementById("pz-screen-content");
        if (!screenContent) return;

        var tiles = [
            { key:"profile",   label:"Profile",         cls:"tile-profile",   icon:"purple",
              svg:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7"/>' },
            { key:"activity",  label:"Activity",        cls:"tile-activity",  icon:"cyan",
              svg:'<path d="M13 2L3 14h8l-1 8 11-14h-8z"/>' },
            { key:"history",   label:"History",         cls:"tile-history",   icon:"yellow",
              svg:'<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>' },
            { key:"prizelist", label:"Prizelist",       cls:"tile-prizelist", icon:"green",
              svg:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h6"/>' },
            { key:"care",      label:"Care",            cls:"tile-care",      icon:"white",
              svg:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>' },
            { key:"rewards",   label:"Prizino Rewards", cls:"tile-rewards",   icon:"cyan",
              svg:'<path d="M20 12v8H4v-8"/><path d="M2 7h20v5H2z"/><path d="M12 7v13"/>' +
                  '<path d="M12 7H8.5A2.5 2.5 0 1 1 11 4.5V7z"/><path d="M12 7h3.5A2.5 2.5 0 1 0 13 4.5V7z"/>' }
        ];

        screenContent.innerHTML =
            '<div class="pz-screen-view pz-dashboard-view" data-view="dashboard">' +
                '<div class="overview-grid">' +
                    tiles.map(function (t) {
                        return '<button type="button" class="account-tile ' + t.cls + '" data-screen="' + t.key + '">' +
                            '<div class="tile-top">' +
                                '<span class="tile-icon tile-icon-' + t.icon + '">' +
                                    '<svg viewBox="0 0 24 24">' + t.svg + '</svg>' +
                                '</span>' +
                                '<span class="tile-arrow">›</span>' +
                            '</div>' +
                            '<div class="tile-title">' + esc(t.label) + '</div>' +
                        '</button>';
                    }).join("") +
                '</div>' +
            '</div>';
    }

    /* ---------- PROFILE ---------- */
    function renderProfileScreen() {
        if (!screenContent) screenContent = document.getElementById("pz-screen-content");
        if (!screenContent) return;

        screenContent.innerHTML =
            '<div class="pz-inner-screen pz-profile-screen">' +
                topbar("PROFILE") +
                '<div class="pz-section-title">' +
                    '<strong>PLAYER PROFILE</strong>' +
                    '<small>MANAGE YOUR ACCOUNT</small>' +
                '</div>' +
                '<form id="pz-profile-form" class="pz-profile-form" novalidate>' +
                    '<div class="pz-field-grid">' +
                        '<label class="pz-field"><span>First Name</span>' +
                            '<input type="text" id="pz-first-name" autocomplete="given-name"></label>' +
                        '<label class="pz-field"><span>Last Name</span>' +
                            '<input type="text" id="pz-last-name" autocomplete="family-name"></label>' +
                        '<label class="pz-field"><span>Username</span>' +
                            '<input type="text" id="pz-username" maxlength="30" autocomplete="username"></label>' +
                        '<label class="pz-field pz-field-readonly"><span>Email <em>(read-only)</em></span>' +
                            '<input type="email" id="pz-email" readonly></label>' +
                        '<label class="pz-field"><span>Country</span>' +
                            '<input type="text" id="pz-country" autocomplete="country-name"></label>' +
                        '<label class="pz-field"><span>Region</span>' +
                            '<input type="text" id="pz-region" autocomplete="address-level1"></label>' +
                        '<label class="pz-field pz-field-wide"><span>Address Line 1</span>' +
                            '<input type="text" id="pz-address-1" autocomplete="address-line1"></label>' +
                        '<label class="pz-field pz-field-wide"><span>Address Line 2</span>' +
                            '<input type="text" id="pz-address-2" autocomplete="address-line2"></label>' +
                        '<label class="pz-field"><span>Town / City</span>' +
                            '<input type="text" id="pz-city" autocomplete="address-level2"></label>' +
                        '<label class="pz-field"><span>Postcode</span>' +
                            '<input type="text" id="pz-postcode" autocomplete="postal-code"></label>' +
                    '</div>' +
                    '<div class="pz-phone-block">' +
                        '<div class="pz-phone-head">' +
                            '<span class="pz-phone-title">PHONE NUMBER</span>' +
                            '<span class="pz-phone-status" id="pz-phone-status">Not added</span>' +
                        '</div>' +
                        '<div class="pz-phone-body">' +
                            '<input type="tel" id="pz-phone-input" placeholder="+00 000 000 0000" autocomplete="tel">' +
                            '<button type="button" class="pz-mini-btn" id="pz-phone-save">SAVE</button>' +
                            '<button type="button" class="pz-mini-btn pz-phone-remove" id="pz-phone-remove" style="display:none;">REMOVE</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="pz-reward-banner" id="pz-reward-banner">' +
                        '<span class="pz-reward-icon">★</span>' +
                        '<span class="pz-reward-text">Complete your profile to earn <strong>+200 PR</strong>.</span>' +
                        '<span class="pz-reward-state" id="pz-reward-state">Pending</span>' +
                    '</div>' +
                    '<div class="pz-form-actions">' +
                        '<button type="submit" class="pz-primary-btn" id="pz-profile-save">SAVE PROFILE</button>' +
                        '<span class="pz-form-msg" id="pz-form-msg" role="status"></span>' +
                    '</div>' +
                '</form>' +
            '</div>';

        bindProfile();
        loadProfile();
    }

    function setField(id, value) {
        var el = document.getElementById(id);
        if (el) el.value = value || "";
    }
    function getField(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : "";
    }

    function applyProfile(data) {
        if (!data) return;
        setField("pz-first-name", data.first_name);
        setField("pz-last-name",  data.last_name);
        setField("pz-username",   data.username);
        setField("pz-email",      data.email);
        setField("pz-country",    data.country);
        setField("pz-region",     data.region);
        setField("pz-address-1",  data.address_1);
        setField("pz-address-2",  data.address_2);
        setField("pz-city",       data.city);
        setField("pz-postcode",   data.postcode);

        var phone      = data.phone || "";
        var phoneInput = document.getElementById("pz-phone-input");
        var phoneStat  = document.getElementById("pz-phone-status");
        var phoneRm    = document.getElementById("pz-phone-remove");

        if (phone) {
            phoneInput.value = phone;
            phoneStat.textContent = phone;
            phoneStat.classList.add("is-on");
            phoneRm.style.display = "";
        } else {
            phoneInput.value = "";
            phoneStat.textContent = "Not added";
            phoneStat.classList.remove("is-on");
            phoneRm.style.display = "none";
        }

        var done = !!(data.profile_reward_claimed);
        var stateEl = document.getElementById("pz-reward-state");
        var banner  = document.getElementById("pz-reward-banner");
        if (stateEl) {
            stateEl.textContent = done ? "Claimed" : "Pending";
            stateEl.classList.toggle("is-done", done);
        }
        if (banner) banner.style.opacity = done ? ".65" : "1";
    }

    function setProfileMsg(text, type) {
        var el = document.getElementById("pz-form-msg");
        if (!el) return;
        el.textContent = text || "";
        el.className = "pz-form-msg" + (type ? " is-" + type : "");
    }

    function loadProfile() {
        if (!LOGGED_IN) { setProfileMsg("Please log in.", "error"); return; }
        pzFetch("profile")
            .then(function (data) { applyProfile(data && data.profile ? data.profile : data); })
            .catch(function (e) { console.warn("[Prizino] profile load:", e); });
    }

    function fireProfileReward() {
        if (!LOGGED_IN) return Promise.resolve();
        return fetch('/wp-json/prizino/v1/account/profile-complete', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'X-WP-Nonce': PZ_NONCE, 'Accept': 'application/json' }
        }).then(function (r) { return r.text(); })
          .then(function () { loadBalance(); })
          .catch(function (e) { console.warn('[Prizino] profile-complete:', e); });
    }

    function bindProfile() {
        var form      = document.getElementById("pz-profile-form");
        var saveBtn   = document.getElementById("pz-profile-save");
        var phoneSave = document.getElementById("pz-phone-save");
        var phoneRm   = document.getElementById("pz-phone-remove");

        if (form) form.addEventListener("submit", function (e) {
            e.preventDefault();
            if (!LOGGED_IN) return;
            var payload = {
                first_name: getField("pz-first-name"),
                last_name:  getField("pz-last-name"),
                username:   getField("pz-username"),
                country:    getField("pz-country"),
                region:     getField("pz-region"),
                address_1:  getField("pz-address-1"),
                address_2:  getField("pz-address-2"),
                city:       getField("pz-city"),
                postcode:   getField("pz-postcode")
            };
            saveBtn.disabled = true;
            setProfileMsg("Saving…");
            pzFetch("profile", { method: "PUT", body: JSON.stringify(payload) })
                .then(function (data) {
                    setProfileMsg("Profile saved.", "ok");
                    if (data && data.profile) applyProfile(data.profile);
                    else loadProfile();
                    return fireProfileReward();
                })
                .catch(function () { setProfileMsg("Could not save profile.", "error"); })
                .finally(function () { saveBtn.disabled = false; });
        });

        if (phoneSave) phoneSave.addEventListener("click", function () {
            var val = getField("pz-phone-input");
            if (!val) return;
            setProfileMsg("Saving phone…");
            pzFetch("profile/phone", { method: "PUT", body: JSON.stringify({ phone: val }) })
                .then(function () {
                    var stat = document.getElementById("pz-phone-status");
                    stat.textContent = val;
                    stat.classList.add("is-on");
                    document.getElementById("pz-phone-remove").style.display = "";
                    setProfileMsg("Phone saved.", "ok");
                    return fireProfileReward();
                })
                .catch(function () { setProfileMsg("Could not save phone.", "error"); });
        });

        if (phoneRm) phoneRm.addEventListener("click", function () {
            pzFetch("profile/phone", { method: "DELETE" })
                .then(function () {
                    document.getElementById("pz-phone-input").value = "";
                    var stat = document.getElementById("pz-phone-status");
                    stat.textContent = "Not added";
                    stat.classList.remove("is-on");
                    phoneRm.style.display = "none";
                    setProfileMsg("Phone removed.", "ok");
                })
                .catch(function () { setProfileMsg("Could not remove phone.", "error"); });
        });
    }

    /* ---------- ACTIVITY ---------- */
    function renderActivityScreen() {
        if (!screenContent) screenContent = document.getElementById("pz-screen-content");
        if (!screenContent) return;

        screenContent.innerHTML =
            '<div class="pz-inner-screen pz-activity-screen">' +
                topbar("ACTIVITY") +
                '<div class="pz-section-title">' +
                    '<strong>PLAYER ACTIVITY</strong>' +
                    '<small>GAMES, ORDERS &amp; COIN BALANCE</small>' +
                '</div>' +
                '<div class="pz-tabs" role="tablist">' +
                    '<button type="button" class="pz-tab is-active" data-tab="games">OPEN GAMES</button>' +
                    '<button type="button" class="pz-tab"           data-tab="orders">OPEN ORDERS</button>' +
                    '<button type="button" class="pz-tab"           data-tab="coins">COIN BALANCE</button>' +
                '</div>' +
                '<section class="pz-panel is-active" data-panel="games">' +
                    '<div class="pz-panel-list" id="pz-games-list">' +
                        '<div class="pz-empty">Loading open games…</div>' +
                    '</div>' +
                '</section>' +
                '<section class="pz-panel" data-panel="orders">' +
                    '<div class="pz-panel-list" id="pz-orders-list">' +
                        '<div class="pz-empty">Loading open orders…</div>' +
                    '</div>' +
                '</section>' +
                '<section class="pz-panel" data-panel="coins">' +
                    '<div class="pz-coin-filter">' +
                        '<label>Coin' +
                            '<select id="pz-coin-type">' +
                                '<option value="">All</option>' +
                                '<option value="Tz">Tokenz (Tz)</option>' +
                                '<option value="Dz">Dimenz (Dz)</option>' +
                                '<option value="PR">Prizino Rewards (PR)</option>' +
                                '<option value="MP">Mint Points (MP)</option>' +
                            '</select>' +
                        '</label>' +
                        '<button type="button" class="pz-mini-btn" id="pz-coin-refresh">REFRESH</button>' +
                    '</div>' +
                    '<div class="pz-tx-table-wrap">' +
                        '<table class="pz-tx-table">' +
                            '<thead><tr>' +
                                '<th>Date</th><th>Type</th><th>Description</th>' +
                                '<th class="pz-num">Amount</th><th class="pz-num">Balance</th><th>Ref</th>' +
                            '</tr></thead>' +
                            '<tbody id="pz-tx-body">' +
                                '<tr><td colspan="6" class="pz-empty">Loading transactions…</td></tr>' +
                            '</tbody>' +
                        '</table>' +
                    '</div>' +
                '</section>' +
            '</div>';

        bindActivity();
        loadGames();
    }

    function statusTag(status) {
        var s = String(status || "").toLowerCase();
        var cls = "is-hold", label = status || "Unknown";
        if (s.indexOf("wait") === 0 || s === "pending") { cls = "is-wait"; label = "Waiting-for-draw"; }
        else if (s === "reserved") { cls = "is-res";  label = "Reserved"; }
        else if (s === "sent")     { cls = "is-sent"; label = "Sent"; }
        else if (s === "delivered" || s === "complete" || s === "completed") { cls = "is-done"; label = "Delivered"; }
        return '<span class="pz-tag ' + cls + '">' + esc(label) + '</span>';
    }

    function renderGames(rows) {
        var box = document.getElementById("pz-games-list");
        if (!box) return;
        if (!rows || !rows.length) {
            box.innerHTML = '<div class="pz-empty">No open games right now.</div>';
            return;
        }
        box.innerHTML = rows.map(function (g) {
            return '<div class="pz-card pz-card-live">' +
                '<div class="pz-card-head">' +
                    '<span class="pz-card-title">' + esc(g.name || "Raffle") + '</span>' +
                    statusTag(g.status || "waiting-for-draw") +
                '</div>' +
                '<div class="pz-card-meta">' +
                    '<span>Entered: <b>' + fmtDate(g.entry_date) + '</b></span>' +
                    '<span>Draw date: <b>' + fmtDate(g.draw_date) + '</b></span>' +
                    (g.entries ? '<span>Entries: <b>' + esc(g.entries) + '</b></span>' : '') +
                '</div>' +
            '</div>';
        }).join("");
    }

    function loadGames() {
        var box = document.getElementById("pz-games-list");
        if (box) box.innerHTML = '<div class="pz-empty">Loading open games…</div>';
        if (!LOGGED_IN) { renderGames([]); return; }
        pzFetch("activity/games")
            .then(function (d) { renderGames(d && d.games ? d.games : []); })
            .catch(function () { renderGames([]); });
    }

    function renderOrders(rows) {
        var box = document.getElementById("pz-orders-list");
        if (!box) return;
        if (!rows || !rows.length) {
            box.innerHTML = '<div class="pz-empty">No open orders.</div>';
            return;
        }
        box.innerHTML = rows.map(function (o) {
            return '<div class="pz-card pz-card-live">' +
                '<div class="pz-card-head">' +
                    '<span class="pz-card-title">' + esc(o.product || o.title || "Order") + '</span>' +
                    statusTag(o.delivery_status || o.status) +
                '</div>' +
                '<div class="pz-card-meta">' +
                    '<span>Order #: <b>' + esc(o.order_number || o.id || "—") + '</b></span>' +
                    '<span>Date: <b>' + fmtDate(o.order_date) + '</b></span>' +
                    '<span>Status: <b>' + esc(o.status || "—") + '</b></span>' +
                    (o.tracking ? '<span>Tracking: <b>' + esc(o.tracking) + '</b></span>' : '') +
                '</div>' +
            '</div>';
        }).join("");
    }

    function loadOrders() {
        var box = document.getElementById("pz-orders-list");
        if (box) box.innerHTML = '<div class="pz-empty">Loading open orders…</div>';
        if (!LOGGED_IN) { renderOrders([]); return; }
        pzFetch("activity/orders")
            .then(function (d) { renderOrders(d && d.orders ? d.orders : []); })
            .catch(function () { renderOrders([]); });
    }

        /* ---------- TRANSACTION ROWS (with data-label for mobile stacking) ---------- */
    function buildTxRow(t) {
        var amt = parseFloat(t.amount);
        var neg = !isNaN(amt) && amt < 0;
        return '<tr>' +
            '<td data-label="Date">' + fmtDate(t.date) + '</td>' +
            '<td data-label="Type">' + esc(t.type || "") + '</td>' +
            '<td data-label="Description">' + esc(t.description || "") + '</td>' +
            '<td data-label="Amount" class="pz-num ' + (neg ? "pz-amt-neg" : "pz-amt-pos") + '">' +
                (isNaN(amt) ? "—" : (neg ? "" : "+") + fmtMoney(amt, t.unit || "")) +
            '</td>' +
            '<td data-label="Balance" class="pz-num">' +
                (t.balance_after != null ? fmtMoney(t.balance_after, t.unit || "") : "—") +
            '</td>' +
            '<td data-label="Ref">' + esc(t.reference || "—") + '</td>' +
        '</tr>';
    }

    function renderTx(rows) {
        var body = document.getElementById("pz-tx-body");
        if (!body) return;
        if (!rows || !rows.length) {
            body.innerHTML = '<tr><td colspan="6" class="pz-empty">No transactions found.</td></tr>';
            return;
        }
        body.innerHTML = rows.map(buildTxRow).join("");
    }

    function loadTx() {
        var body = document.getElementById("pz-tx-body");
        if (body) body.innerHTML = '<tr><td colspan="6" class="pz-empty">Loading transactions…</td></tr>';
        if (!LOGGED_IN) { renderTx([]); return; }
        var sel = document.getElementById("pz-coin-type");
        var q = sel && sel.value ? ("?coin=" + encodeURIComponent(sel.value)) : "";
        pzFetch("transactions" + q)
            .then(function (d) { renderTx(d && d.transactions ? d.transactions : []); })
            .catch(function () { renderTx([]); });
    }

    function bindActivity() {
        if (!screenContent) screenContent = document.getElementById("pz-screen-content");
        if (!screenContent) return;
        var tabs   = screenContent.querySelectorAll(".pz-tab");
        var panels = screenContent.querySelectorAll(".pz-panel");

        function switchTab(name) {
            tabs.forEach(function (t) { t.classList.toggle("is-active", t.dataset.tab === name); });
            panels.forEach(function (p) { p.classList.toggle("is-active", p.dataset.panel === name); });
            if (name === "games")  loadGames();
            if (name === "orders") loadOrders();
            if (name === "coins")  loadTx();
        }
        tabs.forEach(function (t) {
            t.addEventListener("click", function () { switchTab(t.dataset.tab); });
        });
        var sel = document.getElementById("pz-coin-type");
        if (sel) sel.addEventListener("change", loadTx);
        var refresh = document.getElementById("pz-coin-refresh");
        if (refresh) refresh.addEventListener("click", loadTx);
    }

    /* ---------- HISTORY ---------- */
    function renderHistoryScreen() {
        if (!screenContent) screenContent = document.getElementById("pz-screen-content");
        if (!screenContent) return;

        screenContent.innerHTML =
            '<div class="pz-inner-screen pz-history-screen">' +
                topbar("HISTORY") +
                '<div class="pz-section-title pz-section-title-history">' +
                    '<strong>PLAYER HISTORY</strong>' +
                    '<small>COMPLETED ACTIVITY &amp; PAST TRANSACTIONS</small>' +
                '</div>' +
                '<div class="pz-tabs pz-tabs-history" role="tablist">' +
                    '<button type="button" class="pz-tab is-active" data-tab="games">CLOSED GAMES</button>' +
                    '<button type="button" class="pz-tab"           data-tab="orders">CLOSED ORDERS</button>' +
                    '<button type="button" class="pz-tab"           data-tab="coins">TRANSACTIONS</button>' +
                '</div>' +
                '<section class="pz-panel is-active" data-panel="games">' +
                    '<p class="pz-hist-hint">Past raffles you entered. Results appear here once the draw has happened.</p>' +
                    '<div class="pz-panel-list" id="pz-hist-games-list">' +
                        '<div class="pz-empty">Loading closed games…</div>' +
                    '</div>' +
                '</section>' +
                '<section class="pz-panel" data-panel="orders">' +
                    '<p class="pz-hist-hint">Prizes and orders that have been delivered to you.</p>' +
                    '<div class="pz-panel-list" id="pz-hist-orders-list">' +
                        '<div class="pz-empty">Loading closed orders…</div>' +
                    '</div>' +
                '</section>' +
                '<section class="pz-panel" data-panel="coins">' +
                    '<p class="pz-hist-hint">Full history of your Tz, Dz, PR and MP transactions.</p>' +
                    '<div class="pz-coin-filter">' +
                        '<label>Coin' +
                            '<select id="pz-hist-coin-type">' +
                                '<option value="">All</option>' +
                                '<option value="Tz">Tokenz (Tz)</option>' +
                                '<option value="Dz">Dimenz (Dz)</option>' +
                                '<option value="PR">Prizino Rewards (PR)</option>' +
                                '<option value="MP">Mint Points (MP)</option>' +
                            '</select>' +
                        '</label>' +
                        '<button type="button" class="pz-mini-btn" id="pz-hist-coin-refresh">REFRESH</button>' +
                    '</div>' +
                    '<div class="pz-tx-table-wrap">' +
                        '<table class="pz-tx-table">' +
                            '<thead><tr>' +
                                '<th>Date</th><th>Type</th><th>Description</th>' +
                                '<th class="pz-num">Amount</th><th class="pz-num">Balance</th><th>Ref</th>' +
                            '</tr></thead>' +
                            '<tbody id="pz-hist-tx-body">' +
                                '<tr><td colspan="6" class="pz-empty">Loading transactions…</td></tr>' +
                            '</tbody>' +
                        '</table>' +
                    '</div>' +
                '</section>' +
            '</div>';

        bindHistory();
        loadHistoryGames();
    }

    function bindHistory() {
        if (!screenContent) screenContent = document.getElementById("pz-screen-content");
        if (!screenContent) return;
        var tabs   = screenContent.querySelectorAll(".pz-tab");
        var panels = screenContent.querySelectorAll(".pz-panel");

        function switchTab(name) {
            tabs.forEach(function (t) { t.classList.toggle("is-active", t.dataset.tab === name); });
            panels.forEach(function (p) { p.classList.toggle("is-active", p.dataset.panel === name); });
            if (name === "games")  loadHistoryGames();
            if (name === "orders") loadHistoryOrders();
            if (name === "coins")  loadHistoryTx();
        }
        tabs.forEach(function (t) {
            t.addEventListener("click", function () { switchTab(t.dataset.tab); });
        });
        var sel = document.getElementById("pz-hist-coin-type");
        if (sel) sel.addEventListener("change", loadHistoryTx);
        var refresh = document.getElementById("pz-hist-coin-refresh");
        if (refresh) refresh.addEventListener("click", loadHistoryTx);
    }

    function loadHistoryGames() {
        var box = document.getElementById("pz-hist-games-list");
        if (box) box.innerHTML = '<div class="pz-empty">Loading closed games…</div>';
        if (!LOGGED_IN) { if (box) box.innerHTML = '<div class="pz-empty">Please log in.</div>'; return; }
        pzFetch("history/games")
            .then(function (d) {
                var rows = d && d.games ? d.games : [];
                if (!box) return;
                if (!rows.length) { box.innerHTML = '<div class="pz-empty">No closed games yet. Completed draws will appear here.</div>'; return; }
                box.innerHTML = rows.map(function (g) {
                    return '<div class="pz-hist-card">' +
                        '<div class="pz-hist-dot"></div>' +
                        '<div class="pz-hist-body">' +
                            '<div class="pz-hist-head">' +
                                '<span class="pz-hist-title">' + esc(g.name || "Raffle") + '</span>' +
                                '<span class="pz-hist-date">' + fmtDate(g.draw_date || g.entry_date) + '</span>' +
                            '</div>' +
                            '<div class="pz-hist-result"><span class="pz-tag is-done">CLOSED</span></div>' +
                            '<div class="pz-hist-meta">' +
                                '<span>Entered: <b>' + fmtDate(g.entry_date) + '</b></span>' +
                                (g.entries ? '<span>Entries: <b>' + esc(g.entries) + '</b></span>' : '') +
                            '</div>' +
                        '</div>' +
                    '</div>';
                }).join("");
            })
            .catch(function () { if (box) box.innerHTML = '<div class="pz-empty">Could not load games.</div>'; });
    }

    function loadHistoryOrders() {
        var box = document.getElementById("pz-hist-orders-list");
        if (box) box.innerHTML = '<div class="pz-empty">Loading closed orders…</div>';
        if (!LOGGED_IN) { if (box) box.innerHTML = '<div class="pz-empty">Please log in.</div>'; return; }
        pzFetch("history/orders")
            .then(function (d) {
                var rows = d && d.orders ? d.orders : [];
                if (!box) return;
                if (!rows.length) { box.innerHTML = '<div class="pz-empty">No closed orders yet. Delivered prizes will appear here.</div>'; return; }
                box.innerHTML = rows.map(function (o) {
                    return '<div class="pz-hist-card">' +
                        '<div class="pz-hist-dot"></div>' +
                        '<div class="pz-hist-body">' +
                            '<div class="pz-hist-head">' +
                                '<span class="pz-hist-title">' + esc(o.product || o.title || "Order") + '</span>' +
                                '<span class="pz-hist-date">' + fmtDate(o.order_date) + '</span>' +
                            '</div>' +
                            '<div class="pz-hist-result">' + statusTag(o.delivery_status || o.status) + '</div>' +
                            '<div class="pz-hist-meta">' +
                                '<span>Order #: <b>' + esc(o.order_number || o.id || "—") + '</b></span>' +
                                '<span>Status: <b>' + esc(o.status || "—") + '</b></span>' +
                                (o.tracking ? '<span>Tracking: <b>' + esc(o.tracking) + '</b></span>' : '') +
                            '</div>' +
                        '</div>' +
                    '</div>';
                }).join("");
            })
            .catch(function () { if (box) box.innerHTML = '<div class="pz-empty">Could not load orders.</div>'; });
    }

        function loadHistoryTx() {
        var body = document.getElementById("pz-hist-tx-body");
        if (body) body.innerHTML = '<tr><td colspan="6" class="pz-empty">Loading transactions…</td></tr>';
        if (!LOGGED_IN) { if (body) body.innerHTML = '<tr><td colspan="6" class="pz-empty">Please log in.</td></tr>'; return; }
        var sel = document.getElementById("pz-hist-coin-type");
        var q = sel && sel.value ? ("?coin=" + encodeURIComponent(sel.value)) : "";
        pzFetch("history/coins" + q)
            .then(function (d) {
                var rows = d && d.transactions ? d.transactions : [];
                if (!body) return;
                if (!rows.length) { body.innerHTML = '<tr><td colspan="6" class="pz-empty">No transactions found.</td></tr>'; return; }
                body.innerHTML = rows.map(buildTxRow).join("");
            })
            .catch(function () { if (body) body.innerHTML = '<tr><td colspan="6" class="pz-empty">Could not load transactions.</td></tr>'; });
    }

    /* ---------- PRIZELIST ---------- */
    function renderPrizelistScreen() {
        if (!screenContent) screenContent = document.getElementById("pz-screen-content");
        if (!screenContent) return;

        screenContent.innerHTML =
            '<div class="pz-inner-screen pz-prizelist-screen">' +
                topbar("PRIZELIST") +
                '<div class="pz-section-title">' +
                    '<strong>PRIZELIST</strong>' +
                    '<small>PRIZINO EMAIL NEWSLETTER</small>' +
                '</div>' +
                '<div id="pz-prizelist-body">' +
                    '<div class="pz-empty">Loading…</div>' +
                '</div>' +
            '</div>';

        loadPrizelist();
    }

    function loadPrizelist() {
        var body = document.getElementById("pz-prizelist-body");
        if (!body) return;
        if (!LOGGED_IN) { body.innerHTML = '<div class="pz-empty">Please log in.</div>'; return; }

        pzFetch("prizelist")
            .then(function (d) { renderPrizelistBody(d || {}); })
            .catch(function () { body.innerHTML = '<div class="pz-empty">Could not load Prizelist.</div>'; });
    }

    function renderPrizelistBody(data) {
        var body = document.getElementById("pz-prizelist-body");
        if (!body) return;

        var active   = !!data.active;
        var unlocked = !!data.unlocked;

        var html = '';

        html +=
            '<div class="pz-news-block">' +
                '<div class="pz-news-status">' +
                    '<span>Newsletter status</span>' +
                    '<b class="pz-news-badge ' + (active ? 'is-on' : 'is-off') + '">' +
                        (active ? 'ACTIVE' : 'INACTIVE') +
                    '</b>' +
                '</div>' +
                '<p class="pz-news-desc">Receive Prizelist emails with unlock passwords, promotions, and announcements.</p>' +
                '<button type="button" class="pz-primary-btn" id="pz-prizelist-toggle">' +
                    (active ? 'UNSUBSCRIBE' : 'JOIN PRIZELIST') +
                '</button>' +
            '</div>';

        if (!unlocked) {
            html +=
                '<div class="pz-lock-block">' +
                    '<div class="pz-lock-icon">🔒</div>' +
                    '<strong>LOCKED CONTENT</strong>' +
                    '<p>Enter the password from your latest Prizelist email to unlock exclusive content.</p>' +
                    '<div class="pz-lock-form">' +
                        '<input type="text" id="pz-prizelist-pass" placeholder="Enter password">' +
                        '<button type="button" class="pz-mini-btn" id="pz-prizelist-unlock">UNLOCK</button>' +
                    '</div>' +
                    '<span class="pz-form-msg" id="pz-prizelist-msg" role="status"></span>' +
                '</div>';
        } else {
            html +=
                '<div class="pz-unlocked-block">' +
                    '<strong>★ UNLOCKED CONTENT</strong>' +
                    '<div class="pz-unlocked-content">' +
                        '<p>Welcome to the exclusive Prizelist content area. Here you will find bonus rewards, early access offers, and Prizino news.</p>' +
                        '<p>Stay tuned for regular updates delivered through Prizelist emails.</p>' +
                    '</div>' +
                '</div>';
        }

        body.innerHTML = html;

        var toggle = document.getElementById("pz-prizelist-toggle");
        if (toggle) {
            toggle.addEventListener("click", function () {
                var endpoint = active ? "prizelist/unsubscribe" : "prizelist/subscribe";
                toggle.disabled = true;
                pzFetch(endpoint, { method: "POST" })
                    .then(function () { loadPrizelist(); })
                    .catch(function () { toggle.disabled = false; });
            });
        }

        var unlock = document.getElementById("pz-prizelist-unlock");
        if (unlock) {
            unlock.addEventListener("click", function () {
                var pass = document.getElementById("pz-prizelist-pass");
                var msg  = document.getElementById("pz-prizelist-msg");
                if (!pass || !pass.value) { if (msg) msg.textContent = "Enter a password."; return; }
                unlock.disabled = true;
                if (msg) { msg.textContent = "Checking…"; msg.className = "pz-form-msg"; }
                pzFetch("prizelist/unlock", {
                    method: "POST",
                    body: JSON.stringify({ password: pass.value })
                })
                .then(function () { loadPrizelist(); })
                .catch(function () {
                    if (msg) { msg.textContent = "Incorrect password."; msg.className = "pz-form-msg is-error"; }
                    unlock.disabled = false;
                });
            });
        }
    }

        /* ---------- CARE ---------- */
    function renderCareScreen() {
        if (!screenContent) screenContent = document.getElementById("pz-screen-content");
        if (!screenContent) return;

        screenContent.innerHTML =
            '<div class="pz-inner-screen pz-care-screen">' +
                topbar("CUSTOMER CARE") +
                '<div class="pz-section-title pz-section-title-care">' +
                    '<strong>CUSTOMER CARE</strong>' +
                    '<small>SUPPORT &amp; HELP</small>' +
                '</div>' +

                '<div class="pz-care-hero">' +
                    '<div class="pz-care-icon">🎧</div>' +
                    '<strong>Need a hand?</strong>' +
                    '<p>Chat with Winny AI for instant help, or open a ticket for our team.</p>' +
                '</div>' +

                '<div class="pz-care-actions">' +
                    '<button type="button" class="pz-care-btn pz-care-secondary" id="pz-open-chat">' +
                        '<span class="pz-care-btn-label">CHAT WITH WINNY AI</span>' +
                        '<span class="pz-care-btn-desc">Instant support — open a new conversation</span>' +
                    '</button>' +
                    '<button type="button" class="pz-care-btn pz-care-primary" id="pz-open-ticket">' +
                        '<span class="pz-care-btn-label">OPEN A TICKET</span>' +
                        '<span class="pz-care-btn-desc">Reach our support team directly</span>' +
                    '</button>' +
                    '<a class="pz-care-btn pz-care-tertiary" href="mailto:support@prizino.com">' +
                        '<span class="pz-care-btn-label">EMAIL US</span>' +
                        '<span class="pz-care-btn-desc">support@prizino.com</span>' +
                    '</a>' +
                '</div>' +

                '<div class="pz-care-footer">' +
                    '<small>Support hours: Mon–Sun, 09:00–21:00 UTC</small>' +
                '</div>' +
            '</div>';

        var chatBtn = document.getElementById("pz-open-chat");
        if (chatBtn) {
            chatBtn.addEventListener("click", function () {
                openSupportBoard({
                    mode: "chat",
                    prefill: "Hi Winny, I have a question."
                });
            });
        }

        var ticketBtn = document.getElementById("pz-open-ticket");
        if (ticketBtn) {
            ticketBtn.addEventListener("click", function () {
                openSupportBoard({
                    mode: "ticket",
                    prefill: "I would like to open a support ticket."
                });
            });
        }
    }

            /* Helper — opens the Support Board widget and drives the right flow.
       mode: "chat"   → opens Winny AI chat panel
       mode: "ticket" → opens a New Conversation
    */
    function openSupportBoard(opts) {
        opts = opts || {};
        var prefill    = opts.prefill || "";
        var wantTicket = opts.mode === "ticket";

        // ---- 1. Always click the launcher (this is what makes the panel visible) ----
        var launcher = document.querySelector(".sb-chat-btn");
        if (launcher) {
            launcher.click();
        } else {
            console.warn("[Prizino] Support Board launcher not found");
        }

        // ---- 2. Wait for the panel to render, then drive the flow ----
        setTimeout(function () {

            // If we want a ticket, click "New conversation"
            if (wantTicket) {
                var newConvBtn = document.querySelector(".sb-btn-new-conversation");
                if (newConvBtn) newConvBtn.click();
            }

            // Focus and prefill the message box
            var textarea = document.querySelector(".sb-textarea textarea")
                        || document.querySelector("textarea[placeholder='Write a message...']");

            if (textarea) {
                textarea.focus();
                if (prefill) {
                    textarea.value = prefill;
                    textarea.dispatchEvent(new Event("input",  { bubbles: true }));
                    textarea.dispatchEvent(new Event("change", { bubbles: true }));
                }
            }

        }, 500); // 500ms is safer for the panel animation
    }

    /* ---------- PRIZINO REWARDS ---------- */
    function renderRewardsScreen() {
        if (!screenContent) screenContent = document.getElementById("pz-screen-content");
        if (!screenContent) return;

        screenContent.innerHTML =
            '<div class="pz-inner-screen pz-rewards-screen">' +
                topbar("PRIZINO REWARDS") +
                '<div class="pz-section-title pz-section-title-rewards">' +
                    '<strong>PRIZINO REWARDS</strong>' +
                    '<small>REDEEM YOUR PR POINTS</small>' +
                '</div>' +

                '<div class="pz-rewards-balance" id="pz-rewards-balance">' +
                    '<span class="pz-rewards-balance-label">CURRENT PR BALANCE</span>' +
                    '<strong class="pz-rewards-balance-value" id="pz-rewards-pr">—</strong>' +
                    '<small>Earn PR by completing daily tasks, playing games, and staying active.</small>' +
                '</div>' +

                '<div class="pz-rewards-list-title">' +
                    '<strong>AVAILABLE REWARDS</strong>' +
                    '<small>Redeem directly from here — PR will be deducted instantly.</small>' +
                '</div>' +

                '<div class="pz-rewards-grid" id="pz-rewards-grid">' +
                    '<div class="pz-empty">Loading rewards…</div>' +
                '</div>' +
            '</div>';

        loadRewardsBalance();
        loadRewardsList();
    }

    function loadRewardsBalance() {
        if (!LOGGED_IN) return;
        fetch(PZ_API + 'balance', {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 'X-WP-Nonce': PZ_NONCE, 'Accept': 'application/json' }
        })
        .then(function (r) { return r.text(); })
        .then(function (text) {
            var data = null;
            try { data = JSON.parse(text); } catch (e) {}
            var el = document.getElementById("pz-rewards-pr");
            if (!el) return;

            var balances = data && (data.balances || data) || {};
            var formatted = (data && data.formatted) || balances.formatted || {};

            var pr = formatted.PR || balances.PR;
            if (pr == null) { el.textContent = '— PR'; return; }
            if (typeof pr === 'string' && isNaN(parseFloat(pr))) { el.textContent = pr; return; }
            el.textContent = fmtMoney(pr, 'PR');
        })
        .catch(function () {});
    }

    function loadRewardsList() {
        var grid = document.getElementById("pz-rewards-grid");
        if (!grid) return;
        if (!LOGGED_IN) { grid.innerHTML = '<div class="pz-empty">Please log in.</div>'; return; }

        pzFetch("rewards")
            .then(function (d) {
                var rows = d && d.rewards ? d.rewards : [];
                if (!rows.length) {
                    grid.innerHTML = '<div class="pz-empty">No rewards available right now.</div>';
                    return;
                }
                grid.innerHTML = rows.map(function (r) {
                    var cost = parseFloat(r.cost || 0);
                    var costLabel = isNaN(cost) ? "—" : cost.toLocaleString(undefined, {
                        minimumFractionDigits: 0, maximumFractionDigits: 0
                    });
                    return '<div class="pz-reward-card">' +
                        (r.image ? '<div class="pz-reward-thumb" style="background-image:url(' + esc(r.image) + ')"></div>'
                                 : '<div class="pz-reward-thumb pz-reward-thumb-fallback">★</div>') +
                        '<div class="pz-reward-body">' +
                            '<span class="pz-reward-name">' + esc(r.name || "Reward") + '</span>' +
                            (r.description ? '<span class="pz-reward-desc">' + esc(r.description) + '</span>' : '') +
                            '<div class="pz-reward-foot">' +
                                '<span class="pz-reward-cost">' + costLabel + ' PR</span>' +
                                '<button type="button" class="pz-mini-btn" data-reward-id="' + esc(r.id) + '">REDEEM</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
                }).join("");

                grid.querySelectorAll("[data-reward-id]").forEach(function (btn) {
                    btn.addEventListener("click", function () {
                        var id = btn.getAttribute("data-reward-id");
                        btn.disabled = true;
                        pzFetch("rewards/redeem", {
                            method: "POST",
                            body: JSON.stringify({ reward_id: id })
                        })
                        .then(function () {
                            loadRewardsBalance();
                            loadBalance();
                        })
                        .catch(function () {})
                        .finally(function () { btn.disabled = false; });
                    });
                });
            })
            .catch(function () {
                grid.innerHTML = '<div class="pz-empty">Could not load rewards.</div>';
            });
    }

    /* ---------- COMING SOON ---------- */
    function renderComingSoon(title) {
        if (!screenContent) screenContent = document.getElementById("pz-screen-content");
        if (!screenContent) return;
        screenContent.innerHTML =
            '<div class="pz-inner-screen pz-coming-soon">' +
                topbar(title) +
                '<div class="pz-coming-content">' +
                    '<div class="pz-coming-icon">★</div>' +
                    '<strong>' + esc(title) + '</strong>' +
                    '<span>This section is coming soon.</span>' +
                    '<button type="button" class="pz-back-main" data-screen="dashboard">BACK TO ACCOUNT</button>' +
                '</div>' +
            '</div>';
    }

    /* ---------- NAV ---------- */
    if (!window.__pzNavBound) {
        window.__pzNavBound = true;
        document.addEventListener("click", function (event) {
            var target = event.target.closest("[data-screen]");
            if (!target) return;
            event.preventDefault();
            var screen = target.getAttribute("data-screen");
            if (screen) window.prizinoShowScreen(screen);
        });
    }

    /* ---------- STAR PICK ---------- */
    // function bindStarPick() {
    //     var starBtn = document.getElementById("pz-star-pick");
    //     if (!starBtn || starBtn.dataset.pzBound === "1") return;
    //     starBtn.dataset.pzBound = "1";
    //     starBtn.addEventListener("click", function () {
    //         if (!LOGGED_IN) return;
    //         starBtn.disabled = true;
    //         pzFetch("rewards/star-pick", { method: "POST" })
    //             .then(function () { loadBalance(); })
    //             .catch(function () {})
    //             .finally(function () { starBtn.disabled = false; });
    //     });
    // }

    /* ---------- INIT ---------- */
    function pzInit() {
        var sc = document.getElementById("pz-screen-content");
        if (!sc) return false;
        if (sc.dataset.pzInit === "1") return true;
        sc.dataset.pzInit = "1";
        screenContent = sc;
        renderDashboardScreen();
        // bindStarPick();
        loadBalance();
        console.log('[Prizino] pzInit OK');
        return true;
    }

    (function boot() {
        if (pzInit()) return;
        var n = 0;
        var iv = setInterval(function () {
            if (pzInit() || ++n > 200) clearInterval(iv);
        }, 100);
    })();

    window.prizinoInit           = pzInit;
    window.prizinoRefreshBalance = loadBalance;
    window.prizinoShowScreen     = window.prizinoShowScreen;
})();