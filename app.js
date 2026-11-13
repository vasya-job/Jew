(function () {
  "use strict";

  var STORAGE_APPS = "efir.customApps.v1";
  var STORAGE_PERF = "efir.perf.v1";
  var STORAGE_MOTION = "efir.motion.v1";

  var BUILTIN = [
    {
      id: "apple",
      name: "Apple TV",
      url: "https://tv.apple.com/",
      color: "#1c1c1e",
      glyph: "TV",
      meta: "стабильный запуск",
      builtin: true,
    },
    {
      id: "youtube",
      name: "YouTube",
      url: "https://www.youtube.com/tv",
      color: "#b31217",
      glyph: "YT",
      meta: "TV-режим",
      builtin: true,
    },
    {
      id: "netflix",
      name: "Netflix",
      url: "https://www.netflix.com/",
      color: "#831010",
      glyph: "N",
      meta: "веб",
      builtin: true,
    },
    {
      id: "kinopoisk",
      name: "Кинопоиск",
      url: "https://www.kinopoisk.ru/",
      color: "#f5c518",
      glyph: "КП",
      meta: "кино",
      builtin: true,
    },
    {
      id: "ivi",
      name: "IVI",
      url: "https://www.ivi.ru/",
      color: "#e11b22",
      glyph: "ivi",
      meta: "онлайн",
      builtin: true,
    },
    {
      id: "okko",
      name: "Okko",
      url: "https://okko.tv/",
      color: "#2b2d42",
      glyph: "Ok",
      meta: "онлайн",
      builtin: true,
    },
    {
      id: "prime",
      name: "Prime Video",
      url: "https://www.primevideo.com/",
      color: "#0f171e",
      glyph: "Pv",
      meta: "веб",
      builtin: true,
    },
    {
      id: "browser",
      name: "Браузер",
      url: "https://www.google.com/",
      color: "#3d7ea6",
      glyph: "◎",
      meta: "поиск",
      builtin: true,
    },
  ];

  var grid = document.getElementById("app-grid");
  var clockEl = document.getElementById("clock");
  var toastEl = document.getElementById("toast");
  var backdrop = document.getElementById("backdrop");
  var addForm = document.getElementById("add-form");
  var perfToggle = document.getElementById("perf-toggle");
  var motionToggle = document.getElementById("reduce-motion");
  var toastTimer = null;
  var focusables = [];
  var focusIndex = 0;
  var openPanelId = null;

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
      showToast("Не удалось сохранить на устройстве");
    }
  }

  function customApps() {
    var list = readJson(STORAGE_APPS, []);
    return Array.isArray(list) ? list : [];
  }

  function allApps() {
    return BUILTIN.concat(customApps());
  }

  function showToast(text) {
    toastEl.textContent = text;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.hidden = true;
    }, 2400);
  }

  function tickClock() {
    var now = new Date();
    var h = String(now.getHours()).padStart(2, "0");
    var m = String(now.getMinutes()).padStart(2, "0");
    clockEl.textContent = h + ":" + m;
  }

  function launch(url, name) {
    showToast("Запуск: " + name);
    window.setTimeout(function () {
      window.location.href = url;
    }, 180);
  }

  function renderApps() {
    var apps = allApps();
    grid.innerHTML = "";
    apps.forEach(function (app, index) {
      var tile = document.createElement("button");
      tile.type = "button";
      tile.className = "app-tile";
      tile.setAttribute("role", "listitem");
      tile.setAttribute("data-nav", "");
      tile.setAttribute("data-app-id", app.id);
      tile.style.setProperty("--tile", app.color);
      tile.style.animationDelay = 0.04 * index + "s";

      var glyph = document.createElement("span");
      glyph.className = "glyph";
      glyph.textContent = app.glyph || app.name.slice(0, 2).toUpperCase();

      var textWrap = document.createElement("span");
      var label = document.createElement("span");
      label.className = "label";
      label.textContent = app.name;
      var meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = app.meta || (app.builtin ? "встроено" : "ваше");
      textWrap.appendChild(label);
      textWrap.appendChild(meta);

      tile.appendChild(glyph);
      tile.appendChild(textWrap);

      if (!app.builtin) {
        var remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove";
        remove.setAttribute("aria-label", "Удалить " + app.name);
        remove.setAttribute("data-nav", "");
        remove.textContent = "×";
        remove.addEventListener("click", function (e) {
          e.stopPropagation();
          removeApp(app.id);
        });
        tile.appendChild(remove);
      }

      tile.addEventListener("click", function () {
        launch(app.url, app.name);
      });

      grid.appendChild(tile);
    });
    refreshFocusables();
  }

  function removeApp(id) {
    var next = customApps().filter(function (a) {
      return a.id !== id;
    });
    writeJson(STORAGE_APPS, next);
    renderApps();
    showToast("Ярлык удалён");
  }

  function closePanel() {
    document.querySelectorAll(".panel").forEach(function (p) {
      p.hidden = true;
    });
    backdrop.hidden = true;
    openPanelId = null;
    refreshFocusables();
  }

  function openPanel(id) {
    closePanel();
    var panel = document.getElementById("panel-" + id);
    if (!panel) return;
    panel.hidden = false;
    backdrop.hidden = false;
    openPanelId = id;
    refreshFocusables();
    var first = panel.querySelector("[data-nav]");
    if (first) setFocusOn(first);
  }

  function refreshFocusables() {
    var root = openPanelId
      ? document.getElementById("panel-" + openPanelId)
      : document;
    focusables = Array.prototype.slice.call(
      root.querySelectorAll("[data-nav]:not([disabled])")
    ).filter(function (el) {
      if (el.closest(".panel") && !openPanelId) return false;
      if (el.hidden) return false;
      var style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    });
    if (!focusables.length) return;
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
    if (typeof el.focus === "function") el.focus({ preventScroll: false });
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
      if (dx > 0 || dy > 0) focusIndex = (focusIndex + 1) % focusables.length;
      else focusIndex = (focusIndex - 1 + focusables.length) % focusables.length;
    } else {
      focusIndex = best;
    }
    applyFocusClass();
    focusables[focusIndex].focus({ preventScroll: false });
    focusables[focusIndex].scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function activateFocused() {
    var el = focusables[focusIndex];
    if (!el) return;
    if (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA") {
      el.focus();
      return;
    }
    el.click();
  }

  function onAction(action, el) {
    if (action === "launch-apple") {
      launch("https://tv.apple.com/", "Apple TV");
      return;
    }
    if (action === "open-panel") {
      openPanel(el.getAttribute("data-panel"));
      return;
    }
    if (action === "close-panel") {
      closePanel();
    }
  }

  document.addEventListener("click", function (e) {
    var target = e.target.closest("[data-action]");
    if (!target) return;
    onAction(target.getAttribute("data-action"), target);
  });

  backdrop.addEventListener("click", closePanel);

  addForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = new FormData(addForm);
    var name = String(data.get("name") || "").trim();
    var url = String(data.get("url") || "").trim();
    var color = String(data.get("color") || "#c4a35a");
    if (!name || !url) return;
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }
    try {
      new URL(url);
    } catch (err) {
      showToast("Проверьте ссылку");
      return;
    }
    var list = customApps();
    list.push({
      id: "c-" + Date.now().toString(36),
      name: name,
      url: url,
      color: color,
      glyph: name.slice(0, 2).toUpperCase(),
      meta: "ваше",
      builtin: false,
    });
    writeJson(STORAGE_APPS, list);
    addForm.reset();
    closePanel();
    renderApps();
    showToast("Установлено: " + name);
  });

  function applyPrefs() {
    var perf = localStorage.getItem(STORAGE_PERF) === "1";
    var motion = localStorage.getItem(STORAGE_MOTION) === "1";
    document.body.classList.toggle("perf", perf);
    document.body.classList.toggle("reduce-motion", motion);
    perfToggle.checked = perf;
    motionToggle.checked = motion;
  }

  perfToggle.addEventListener("change", function () {
    localStorage.setItem(STORAGE_PERF, perfToggle.checked ? "1" : "0");
    applyPrefs();
    showToast(perfToggle.checked ? "Лёгкий режим включён" : "Полный режим");
  });

  motionToggle.addEventListener("change", function () {
    localStorage.setItem(STORAGE_MOTION, motionToggle.checked ? "1" : "0");
    applyPrefs();
  });

  document.addEventListener("keydown", function (e) {
    var key = e.key;
    if (key === "Escape") {
      if (openPanelId) {
        e.preventDefault();
        closePanel();
      }
      return;
    }

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
      activateFocused();
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

  // Default: light mode on for TV SoCs
  if (localStorage.getItem(STORAGE_PERF) === null) {
    localStorage.setItem(STORAGE_PERF, "1");
  }

  applyPrefs();
  tickClock();
  setInterval(tickClock, 15000);
  renderApps();
  refreshFocusables();
  if (focusables[0]) setFocusOn(focusables[0]);
})();
