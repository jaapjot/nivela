/* Nivelá · interfaz. Usa NivelaLogic (logic.js) para todo lo que es cálculo. */
(function () {
  "use strict";
  var L = window.NivelaLogic;
  var KEY = "nivela.v1";
  var $ = function (s) { return document.querySelector(s); };
  var uid = function () { return Math.random().toString(36).slice(2, 9); };
  var esc = L.esc, fmt = L.fmt, dkey = L.dkey, parseKey = L.parseKey;

  function load() { try { var r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin almacenamiento: la sesión sigue en memoria */ } }

  var S = load() || L.seed(dkey(new Date()), uid);
  var viewDate = dkey(new Date());
  var selected = null;
  var tab = "hoy";
  var resetArmed = false;

  function subj(id) { return S.subjects.find(function (s) { return s.id === id; }) || S.subjects[S.subjects.length - 1]; }
  function dayTasks() { return S.tasks.filter(function (t) { return t.date === viewDate; }).sort(function (a, b) { return a.start - b.start; }); }
  function nowMin() { var n = new Date(); return n.getHours() * 60 + n.getMinutes(); }

  /* ---------- aviso ---------- */
  var toastT;
  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 2200);
  }

  /* ---------- cabecera: nivel, XP y monedas ---------- */
  function renderHeader() {
    var xp = L.earned(S.tasks), lv = L.level(xp);
    $("#lvl").textContent = "Nv " + lv.nivel;
    $("#xptxt").textContent = lv.enNivel + " / " + lv.paraSubir;
    $("#xpbar").style.width = lv.enNivel + "%";
    $("#coins").textContent = L.coins(S) + " 🪙";
  }

  /* ---------- reloj de 24 h ---------- */
  function renderRing() {
    var ts = dayTasks(), ln = L.carriles(ts), isToday = viewDate === dkey(new Date());
    var s = '<svg viewBox="0 0 340 340" role="img" aria-label="Plan del día en un reloj de 24 horas">';
    s += '<circle class="track" cx="170" cy="170" r="130" stroke-width="24"/>';
    s += '<circle class="track" cx="170" cy="170" r="104" stroke-width="20" opacity=".5"/>';
    for (var h = 0; h < 24; h++) {
      var a = h * 15;
      if (h % 3 === 0) { var p = L.punto(158, a); s += '<text class="lab" x="' + p[0].toFixed(1) + '" y="' + p[1].toFixed(1) + '">' + L.z(h) + "</text>"; }
      else { var q = L.punto(152, a); s += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="1.6" fill="var(--muted)" opacity=".6"/>'; }
    }
    ts.forEach(function (t) {
      var lane = ln[t.id], r = lane ? 104 : 130, w = lane ? 20 : 24;
      var ang = L.angulosBloque(t), d = L.arco(r, ang[0], ang[1]), sel = selected === t.id;
      if (sel) s += '<path class="halo" d="' + d + '" stroke-width="' + (w + 6) + '"/>';
      s += '<path class="blk' + (t.done ? " done" : "") + (sel ? " sel" : "") + '" data-id="' + t.id + '" d="' + d + '" stroke="' + subj(t.subject).color + '" stroke-width="' + w + '"><title>' + esc(t.title) + "</title></path>";
    });
    if (isToday) {
      var g = nowMin() / 4, n0 = L.punto(82, g), n1 = L.punto(146, g);
      s += '<line class="needle" x1="' + n0[0].toFixed(1) + '" y1="' + n0[1].toFixed(1) + '" x2="' + n1[0].toFixed(1) + '" y2="' + n1[1].toFixed(1) + '"/>';
      s += '<circle cx="' + n1[0].toFixed(1) + '" cy="' + n1[1].toFixed(1) + '" r="5" fill="var(--text)"/>';
    }
    s += "</svg>";
    $("#ringSvg").innerHTML = s;

    var c = $("#ctr"), sel2 = ts.find(function (t) { return t.id === selected; });
    if (sel2) {
      c.innerHTML = '<div class="ctr-title">' + esc(sel2.title) + '</div><div class="ctr-sub">' + fmt(sel2.start) + " – " + fmt(Math.min(1440, sel2.start + sel2.dur)) + "<br>" + esc(subj(sel2.subject).name) + "</div>";
    } else if (isToday) {
      var nm = nowMin(), next = ts.find(function (t) { return !t.done && t.start + t.dur > nm; });
      var sub = !ts.length ? "Sin bloques hoy" : (next ? (next.start <= nm ? "En curso: " + esc(next.title) : "Sigue: " + esc(next.title) + " · " + fmt(next.start)) : "Todo hecho por hoy");
      c.innerHTML = '<div class="clock">' + fmt(nm) + '</div><div class="ctr-sub">' + sub + "</div>";
    } else {
      var done = ts.filter(function (t) { return t.done; }).length;
      c.innerHTML = '<div class="clock">' + done + "/" + ts.length + '</div><div class="ctr-sub">bloques hechos</div>';
    }
  }

  /* ---------- lista del día ---------- */
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="#17112E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>';
  function renderToday() {
    var d = parseKey(viewDate);
    $("#dateLabel").textContent = d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
    $("#todayLink").hidden = viewDate === dkey(new Date());
    var ts = dayTasks(), ul = $("#taskList");
    if (!ts.length) ul.innerHTML = '<li class="empty">Todavía no armaste este día. Agregá un bloque y ganá XP al completarlo.</li>';
    else ul.innerHTML = ts.map(function (t) {
      var sb = subj(t.subject);
      return '<li class="row' + (t.done ? " done" : "") + (selected === t.id ? " sel" : "") + '" style="--c:' + sb.color + '">' +
        '<button class="chk" data-act="toggle" data-id="' + t.id + '" aria-pressed="' + t.done + '" aria-label="Marcar ' + esc(t.title) + ' como hecho">' + CHECK + "</button>" +
        '<button class="rtxt" data-act="select" data-id="' + t.id + '"><div class="rt">' + esc(t.title) + '</div><div class="rs">' + fmt(t.start) + "–" + fmt(Math.min(1440, t.start + t.dur)) + " · " + esc(sb.name) + "</div></button>" +
        '<span class="xpb">+' + L.taskXp(t) + "</span>" +
        '<button class="x" data-act="delTask" data-id="' + t.id + '" aria-label="Eliminar ' + esc(t.title) + '">×</button></li>';
    }).join("");
    renderRing();
  }

  /* ---------- tienda ---------- */
  function renderShop() {
    var c = L.coins(S);
    $("#coinsBig").textContent = c;
    $("#shopGrid").innerHTML = S.rewards.map(function (r) {
      return '<div class="card"><button class="del" data-act="delReward" data-id="' + r.id + '" aria-label="Quitar ' + esc(r.name) + '">×</button>' +
        '<div class="emo" aria-hidden="true">' + esc(r.emoji) + '</div><div class="rn">' + esc(r.name) + "</div>" +
        '<button class="buy" data-act="buy" data-id="' + r.id + '" aria-disabled="' + (c < r.cost) + '">' + r.cost + " 🪙</button></div>";
    }).join("") + '<button class="card new" data-act="openReward"><span class="emo" aria-hidden="true">＋</span>Nueva recompensa</button>';
    var open = S.inventory.filter(function (i) { return !i.used; }), used = S.inventory.length - open.length;
    var h = open.length ? open.map(function (i) {
      return '<div class="inv"><span class="emo" aria-hidden="true">' + esc(i.emoji) + '</span><div class="rt">' + esc(i.name) + '</div><button class="use" data-act="use" data-id="' + i.id + '">Usar</button></div>';
    }).join("") : '<div class="empty">Cuando canjees una recompensa aparece acá, lista para usar.</div>';
    if (used) h += '<p class="rs" style="text-align:center">Ya disfrutaste ' + used + (used === 1 ? " recompensa" : " recompensas") + ".</p>";
    $("#invList").innerHTML = h;
  }

  /* ---------- progreso ---------- */
  function renderProgress() {
    var done = S.tasks.filter(function (t) { return t.done; });
    var mins = done.reduce(function (a, t) { return a + t.dur; }, 0);
    var st = L.streak(S.tasks, new Date());
    $("#stats").innerHTML =
      '<div class="stat"><b>' + done.length + "</b><span>bloques hechos</span></div>" +
      '<div class="stat"><b>' + L.horas(mins) + "</b><span>horas de estudio</span></div>" +
      '<div class="stat"><b>' + st + "</b><span>" + (st === 1 ? "día de racha" : "días de racha") + "</span></div>";
    var by = L.minutosPorMateria(S.tasks);
    var max = Math.max.apply(null, S.subjects.map(function (s) { return by[s.id] || 0; }).concat([60]));
    $("#subjList").innerHTML = S.subjects.map(function (s) {
      var m = by[s.id] || 0;
      return '<div class="subj" style="--c:' + s.color + '"><div class="top2"><span>' + esc(s.name) + "</span><span>" + L.horas(m) + ' h</span></div><div class="bar"><i style="width:' + (m / max * 100) + '%"></i></div></div>';
    }).join("");
    $("#resetBtn").textContent = resetArmed ? "Tocá de nuevo para confirmar" : "Borrar todo y empezar de cero";
  }

  function renderAll() {
    renderHeader();
    if (tab === "hoy") renderToday();
    if (tab === "tienda") renderShop();
    if (tab === "progreso") renderProgress();
  }
  function setTab(t) {
    tab = t;
    ["hoy", "tienda", "progreso"].forEach(function (n) { $("#v-" + n).hidden = n !== t; });
    document.querySelectorAll("nav button").forEach(function (b) {
      if (b.dataset.tab === t) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    resetArmed = false;
    renderAll();
    window.scrollTo(0, 0);
  }

  /* ---------- formularios ---------- */
  function openSheet(id) {
    $("#scrim").hidden = false; $(id).hidden = false;
    var f = $(id).querySelector("input"); if (f) setTimeout(function () { f.focus(); }, 50);
  }
  function closeSheets() { $("#scrim").hidden = true; $("#sheetTask").hidden = true; $("#sheetReward").hidden = true; }
  function openTask() {
    $("#tSubj").innerHTML = S.subjects.map(function (s) { return '<option value="' + s.id + '">' + esc(s.name) + "</option>"; }).join("");
    var m = viewDate === dkey(new Date()) ? Math.min(1380, Math.ceil((nowMin() + 1) / 30) * 30) : 540;
    $("#tStart").value = fmt(m); $("#tTitle").value = "";
    openSheet("#sheetTask");
  }
  function saveTask() {
    var title = $("#tTitle").value.trim();
    if (!title) { toast("Ponele un nombre al bloque"); $("#tTitle").focus(); return; }
    var tm = ($("#tStart").value || "09:00").split(":"), start = (+tm[0]) * 60 + (+tm[1]);
    var dur = Math.min(+$("#tDur").value, 1440 - start);
    if (dur < 5) { toast("El bloque tiene que empezar antes de las 23:55"); return; }
    S.tasks.push({ id: uid(), title: title, subject: $("#tSubj").value, date: viewDate, start: start, dur: dur, done: false });
    save(); closeSheets(); renderAll(); toast("Bloque agregado");
  }
  function saveReward() {
    var name = $("#rName").value.trim(), cost = Math.round(+$("#rCost").value);
    if (!name) { toast("Ponele un nombre a la recompensa"); $("#rName").focus(); return; }
    if (!(cost >= 5)) { toast("El costo mínimo es 5 monedas"); return; }
    S.rewards.push({ id: uid(), name: name, emoji: $("#rEmo").value.trim() || "🎁", cost: cost });
    $("#rName").value = ""; save(); closeSheets(); renderAll(); toast("Recompensa agregada");
  }

  /* ---------- acciones ---------- */
  function burst(xp) {
    var el = document.createElement("div"); el.className = "burst"; el.textContent = "+" + xp + " XP  +" + xp + " 🪙";
    $("#ringWrap").appendChild(el); setTimeout(function () { el.remove(); }, 1400);
  }
  function toggle(id) {
    var t = S.tasks.find(function (x) { return x.id === id; }); if (!t) return;
    if (t.done) {
      if (!L.puedeQuitarHecho(S, t)) { toast("Ya gastaste esas monedas en la tienda"); return; }
      t.done = false; save(); renderAll();
    } else {
      var before = L.level(L.earned(S.tasks)).nivel;
      t.done = true; save(); renderAll(); burst(L.taskXp(t));
      var after = L.level(L.earned(S.tasks)).nivel;
      if (after > before) setTimeout(function () { toast("¡Subiste al nivel " + after + "!"); }, 700);
    }
  }
  function buy(id) {
    var r = S.rewards.find(function (x) { return x.id === id; }); if (!r) return;
    if (L.coins(S) < r.cost) { toast("Te faltan " + (r.cost - L.coins(S)) + " monedas"); return; }
    S.inventory.push({ id: uid(), name: r.name, emoji: r.emoji, cost: r.cost, used: false });
    save(); renderAll(); toast("Canjeado: " + r.name);
  }

  document.addEventListener("click", function (e) {
    var ring = e.target.closest(".blk");
    if (ring) { var rid = ring.getAttribute("data-id"); selected = selected === rid ? null : rid; renderToday(); return; }
    var b = e.target.closest("[data-act]"); if (!b) return;
    var a = b.dataset.act, id = b.dataset.id;
    if (a !== "reset" && resetArmed) { resetArmed = false; if (tab === "progreso") renderProgress(); }
    switch (a) {
      case "tab": setTab(b.dataset.tab); break;
      case "prevDay": case "nextDay": {
        var d = parseKey(viewDate); d.setDate(d.getDate() + (a === "nextDay" ? 1 : -1));
        viewDate = dkey(d); selected = null; renderToday(); break;
      }
      case "goToday": viewDate = dkey(new Date()); selected = null; renderToday(); break;
      case "openTask": openTask(); break;
      case "openReward": openSheet("#sheetReward"); break;
      case "close": closeSheets(); break;
      case "saveTask": saveTask(); break;
      case "saveReward": saveReward(); break;
      case "select": selected = selected === id ? null : id; renderToday(); break;
      case "toggle": toggle(id); break;
      case "delTask": {
        var t = S.tasks.find(function (x) { return x.id === id; }); if (!t) break;
        if (!L.puedeQuitarHecho(S, t)) { toast("Ya gastaste esas monedas en la tienda"); break; }
        S.tasks = S.tasks.filter(function (x) { return x.id !== id; }); if (selected === id) selected = null;
        save(); renderAll(); toast("Bloque eliminado"); break;
      }
      case "buy": buy(id); break;
      case "delReward": S.rewards = S.rewards.filter(function (r) { return r.id !== id; }); save(); renderAll(); break;
      case "use": { var i = S.inventory.find(function (x) { return x.id === id; }); if (i) { i.used = true; save(); renderAll(); toast("¡A disfrutar: " + i.name + "!"); } break; }
      case "addSubj": {
        var inp = $("#sName"), name = inp.value.trim();
        if (!name) { toast("Escribí el nombre de la materia"); break; }
        var other = S.subjects.pop();   // "Otro" siempre queda última
        S.subjects.push({ id: uid(), name: name, color: L.PALETTE[S.subjects.length % 7] });
        S.subjects.push(other); inp.value = ""; save(); renderAll(); break;
      }
      case "reset":
        if (!resetArmed) { resetArmed = true; renderProgress(); break; }
        S = L.seed(dkey(new Date()), uid); resetArmed = false; selected = null; save(); renderAll(); toast("Todo reiniciado"); break;
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeSheets();
    if (e.key === "Enter") {
      if (e.target.id === "tTitle") saveTask();
      if (e.target.id === "rName" || e.target.id === "rCost") saveReward();
      if (e.target.id === "sName") document.querySelector('[data-act="addSubj"]').click();
    }
  });

  setInterval(function () { if (tab === "hoy" && viewDate === dkey(new Date())) renderRing(); }, 30000);
  renderAll();
})();
