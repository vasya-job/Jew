(function () {
  "use strict";

  var STORAGE_INSTALLED = "efir.installed.v2";
  var STORAGE_PERF = "efir.perf.v1";

  var CATALOG = [
    { id: "apple", name: "Apple TV", url: "https://tv.apple.com/", color: "#1c1c1e", glyph: "TV", meta: "фильмы и сериалы" },
    { id: "youtube", name: "YouTube", url: "https://www.youtube.com/tv", color: "#b31217", glyph: "YT", meta: "TV-режим" },
    { id: "netflix", name: "Netflix", url: "https://www.netflix.com/", color: "#831010", glyph: "N", meta: "сериалы" },
    { id: "kinopoisk", name: "Кинопоиск", url: "https://www.kinopoisk.ru/", color: "#c9a227", glyph: "КП", meta: "кино" },
    { id: "ivi", name: "IVI", url: "https://www.ivi.ru/", color: "#e11b22", glyph: "ivi", meta: "онлайн" },
    { id: "okko", name: "Okko", url: "https://okko.tv/", color: "#2b2d42", glyph: "Ok", meta: "онлайн" },
    { id: "prime", name: "Prime Video", url: "https://www.primevideo.com/", color: "#0f171e", glyph: "Pv", meta: "видео" },
    { id: "wink", name: "Wink", url: "https://wink.ru/", color: "#0e7490", glyph: "W", meta: "ТВ и кино" },
    { id: "premier", name: "Premier", url: "https://premier.one/", color: "#111827", glyph: "Pr", meta: "сериалы" },
    { id: "browser", name: "Браузер", url: "https://www.google.com/", color: "#3d7ea6", glyph: "◎", meta: "поиск" },
  ];

  var DEFAULT_INSTALLED = ["apple", "youtube", "netflix", "kinopoisk"];

  var homeGrid = document.getElementById("home-grid");
  var storeGrid = document.getElementById("store-grid");
  var clockEl = document.getElementById("clock");
  var toastEl = document.getElementById("toast");
  var addForm = document.getElementById("add-form");
  var heroLede = document.getElementById("hero-lede");
  var toastTimer = null;
  var focusables = [];
  var focusIndex = 0;
  var currentTab = "home";

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      showToast("Не удалось сохранить");
    }
  }

  function installedList() {
    var list = readJson(STORAGE_INSTALLED, null);
    if (!list) {
      list = DEFAULT_INSTALLED.map(function (id) {
        var app = CATALOG.find(function (c) { return c.id === id; });
        return app ? Object.assign({}, app, { builtin: true }) : null;
      }).filter(Boolean);
      writeJson(STORAGE_INSTALLED, list);
    }
    return Array.isArray(list) ? list : [];
  }

  function saveInstalled(list) {
    writeJson(STORAGE_INSTALLED, list);
  }

  function showToast(text) {
    toastEl.textContent = text;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.hidden = true;
    }, 2200);
  }

  function tickClock() {
    var now = new Date();
    clockEl.textContent =
      String(now.getHours()).padStart(2, "0") +
      ":" +
      String(now.getMinutes()).padStart(2, "0");
  }

  function launch(url, name) {
    showToast("Запуск: " + name);
    setTimeout(function () {
      window.location.href = url;
    }, 160);
  }

  function isInstalled(id) {
    return installedList().some(function (a) { return a.id === id; });
  }

  function installApp(app) {
    var list = installedList();
    if (list.some(function (a) { return a.id === app.id; })) {
      showToast("Уже установлено");
      return;
    }
    list.push({
      id: app.id,
      name: app.name,
      url: app.url,
      color: app.color,
      glyph: app.glyph || app.name.slice(0, 2).toUpperCase(),
      meta: app.meta || "установлено",
      builtin: !!app.builtin,
    });
    saveInstalled(list);
    renderAll();
    showToast("Установлено: " + app.name);
  }

  function uninstallApp(id) {
    var next = installedList().filter(function (a) { return a.id !== id; });
    saveInstalled(next);
    renderAll();
    showToast("Удалено");
  }

  function makeTile(app, mode) {
    var tile = document.createElement("div");
    tile.className = "app-tile";
    tile.setAttribute("role", "listitem");
    tile.style.setProperty("--tile", app.color);

    var glyph = document.createElement("span");
    glyph.className = "glyph";
    glyph.textContent = app.glyph || app.name.slice(0, 2).toUpperCase();

    var text = document.createElement("span");
    var label = document.createElement("span");
    label.className = "label";
    label.textContent = app.name;
    var meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = app.meta || "";
    text.appendChild(label);
    text.appendChild(meta);

    tile.appendChild(glyph);
    tile.appendChild(text);

    if (mode === "home") {
      var openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "tile-btn";
      openBtn.setAttribute("data-nav", "");
      openBtn.textContent = "Открыть";
      openBtn.addEventListener("click", function () {
        launch(app.url, app.name);
      });
      tile.appendChild(openBtn);

      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove";
      remove.setAttribute("data-nav", "");
      remove.setAttribute("aria-label", "Удалить " + app.name);
      remove.textContent = "×";
      remove.addEventListener("click", function (e) {
        e.stopPropagation();
        uninstallApp(app.id);
      });
      tile.appendChild(remove);
    } else {
      var installed = isInstalled(app.id);
      var action = document.createElement("button");
      action.type = "button";
      action.className = "tile-btn" + (installed ? " is-done" : "");
      action.setAttribute("data-nav", "");
      action.textContent = installed ? "Установлено" : "Установить";
      action.disabled = installed;
      action.addEventListener("click", function () {
        installApp(app);
      });
      tile.appendChild(action);
    }

    return tile;
  }

  function renderHome() {
    homeGrid.innerHTML = "";
    installedList().forEach(function (app) {
      homeGrid.appendChild(makeTile(app, "home"));
    });
  }

  function renderStore() {
    storeGrid.innerHTML = "";
    CATALOG.forEach(function (app) {
      storeGrid.appendChild(makeTile(app, "store"));
    });
  }

  function renderAll() {
    renderHome();
    renderStore();
    refreshFocusables();
  }

  function setTab(tab) {
    currentTab = tab;
    document.querySelectorAll(".tab").forEach(function (el) {
      el.classList.toggle("is-active", el.getAttribute("data-tab") === tab);
    });
    document.getElementById("view-home").hidden = tab !== "home";
    document.getElementById("view-store").hidden = tab !== "store";
    document.getElementById("view-dns").hidden = tab !== "dns";

    if (tab === "home") {
      heroLede.textContent = "Ваши установленные приложения. Реклама Hisense режется через DNS на Mac.";
    } else if (tab === "store") {
      heroLede.textContent = "Каталог: нажмите «Установить» — приложение появится на главном экране Эфира.";
    } else {
      heroLede.textContent = "Схема как у «смены DNS»: Mac = DNS-сервер, ТВ ходит через него в магазин.";
    }
    refreshFocusables();
  }

  function refreshFocusables() {
    var root = document;
    focusables = Array.prototype.slice
      .call(root.querySelectorAll("[data-nav]:not([disabled])"))
      .filter(function (el) {
        if (el.hidden) return false;
        var view = el.closest("section.apps");
        if (view && view.hidden) return false;
        var style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden";
      });
    if (focusIndex >= focusables.length) focusIndex = 0;
    applyFocusClass();
  }

  function applyFocusClass() {
    focusables.forEach(function (el, i) {
      el.classList.toggle("is-focused", i === focusIndex);
    });
  }

  function setFocusOn(el) {
    var idx = focusables.indexOf(el);
    if (idx < 0) return;
    focusIndex = idx;
    applyFocusClass();
    el.focus({ preventScroll: false });
  }

  function moveFocus(dx, dy) {
    if (!focusables.length) return;
    var current = focusables[focusIndex];
    var cur = current.getBoundingClientRect();
    var cx = cur.left + cur.width / 2;
    var cy = cur.top + cur.height / 2;
    var best = null;
    var bestScore = Infinity;

    focusables.forEach(function (el, i) {
      if (i === focusIndex) return;
      var r = el.getBoundingClientRect();
      var ex = r.left + r.width / 2;
      var ey = r.top + r.height / 2;
      var vx = ex - cx;
      var vy = ey - cy;
      if (dx !== 0 && Math.sign(vx) !== dx) return;
      if (dy !== 0 && Math.sign(vy) !== dy) return;
      var primary = dx !== 0 ? Math.abs(vx) : Math.abs(vy);
      var secondary = dx !== 0 ? Math.abs(vy) : Math.abs(vx);
      var score = primary + secondary * 2.2;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    });

    if (best === null) {
      focusIndex =
        dx > 0 || dy > 0
          ? (focusIndex + 1) % focusables.length
          : (focusIndex - 1 + focusables.length) % focusables.length;
    } else {
      focusIndex = best;
    }
    applyFocusClass();
    focusables[focusIndex].focus({ preventScroll: false });
    focusables[focusIndex].scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  document.addEventListener("click", function (e) {
    var tabEl = e.target.closest("[data-tab]");
    if (tabEl && tabEl.getAttribute("data-tab")) {
      setTab(tabEl.getAttribute("data-tab"));
      return;
    }
    var actionEl = e.target.closest("[data-action]");
    if (actionEl && actionEl.getAttribute("data-action") === "launch-apple") {
      launch("https://tv.apple.com/", "Apple TV");
    }
  });

  addForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = new FormData(addForm);
    var name = String(data.get("name") || "").trim();
    var url = String(data.get("url") || "").trim();
    var color = String(data.get("color") || "#c4a35a");
    if (!name || !url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    try {
      new URL(url);
    } catch (err) {
      showToast("Проверьте ссылку");
      return;
    }
    installApp({
      id: "c-" + Date.now().toString(36),
      name: name,
      url: url,
      color: color,
      glyph: name.slice(0, 2).toUpperCase(),
      meta: "ваше",
    });
    addForm.reset();
    setTab("home");
  });

  document.addEventListener("keydown", function (e) {
    var key = e.key;
    var tag = (e.target && e.target.tagName) || "";
    var typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

    if (key === "ArrowRight") {
      e.preventDefault();
      moveFocus(1, 0);
    } else if (key === "ArrowLeft") {
      e.preventDefault();
      moveFocus(-1, 0);
    } else if (key === "ArrowDown") {
      if (typing) return;
      e.preventDefault();
      moveFocus(0, 1);
    } else if (key === "ArrowUp") {
      if (typing) return;
      e.preventDefault();
      moveFocus(0, -1);
    } else if (key === "Enter") {
      if (typing && tag !== "SELECT") return;
      e.preventDefault();
      var el = focusables[focusIndex];
      if (el) el.click();
    }
  });

  document.addEventListener("focusin", function (e) {
    var el = e.target.closest("[data-nav]");
    if (!el) return;
    var idx = focusables.indexOf(el);
    if (idx >= 0) {
      focusIndex = idx;
      applyFocusClass();
    }
  });

  if (localStorage.getItem(STORAGE_PERF) === null) {
    localStorage.setItem(STORAGE_PERF, "1");
  }
  document.body.classList.toggle("perf", localStorage.getItem(STORAGE_PERF) === "1");

  tickClock();
  setInterval(tickClock, 15000);
  renderAll();
  setTab("home");
  if (focusables[0]) setFocusOn(focusables[0]);
})();
