/* Nivelá · lógica pura (sin DOM). Se puede probar con Node: node test.js
   Convierte el estudio en un juego: cada bloque terminado da XP y monedas;
   las monedas se canjean por recompensas que uno mismo define. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NivelaLogic = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PALETTE = ["#A58BFF", "#5ED6A5", "#FF8A5B", "#F2B84B", "#58B7FF", "#FF6F9C", "#C6D86A", "#9AA3B2"];
  var XP_POR_NIVEL = 100;

  /* ---------- fechas y horas ---------- */
  function z(n) { return String(n).padStart(2, "0"); }
  function dkey(d) { return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()); }
  function parseKey(k) { var p = k.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function fmt(min) { return z(Math.floor(min / 60)) + ":" + z(min % 60); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- economía del juego ---------- */
  // Un bloque da 1 XP (y 1 moneda) cada 3 minutos, con un mínimo de 5.
  function taskXp(task) { return Math.max(5, Math.round(task.dur / 3)); }
  function earned(tasks) {
    return tasks.filter(function (t) { return t.done; }).reduce(function (a, t) { return a + taskXp(t); }, 0);
  }
  function spent(inventory) { return inventory.reduce(function (a, i) { return a + i.cost; }, 0); }
  function coins(state) { return earned(state.tasks) - spent(state.inventory); }
  function level(xp) {
    return { nivel: Math.floor(xp / XP_POR_NIVEL) + 1, enNivel: xp % XP_POR_NIVEL, paraSubir: XP_POR_NIVEL };
  }
  // Desmarcar o borrar un bloque hecho resta monedas: no se permite si ya se gastaron.
  function puedeQuitarHecho(state, task) {
    return !task.done || coins(state) - taskXp(task) >= 0;
  }

  /* ---------- progreso ---------- */
  // Días seguidos con al menos un bloque hecho. Si hoy todavía no hay ninguno, la racha no se corta: cuenta desde ayer.
  function streak(tasks, hoy) {
    var days = {};
    tasks.forEach(function (t) { if (t.done) days[t.date] = 1; });
    var n = 0, d = new Date(hoy.getTime());
    if (!days[dkey(d)]) d.setDate(d.getDate() - 1);
    while (days[dkey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function minutosPorMateria(tasks) {
    var by = {};
    tasks.forEach(function (t) { if (t.done) by[t.subject] = (by[t.subject] || 0) + t.dur; });
    return by;
  }
  function horas(min) { return Math.round(min / 6) / 10; }

  /* ---------- reloj de 24 h ---------- */
  // Cada hora son 15°. El ángulo 0 es medianoche, arriba.
  function punto(r, grados) {
    var rad = (grados - 90) * Math.PI / 180;
    return [170 + r * Math.cos(rad), 170 + r * Math.sin(rad)];
  }
  function arco(r, a0, a1) {
    var p0 = punto(r, a0), p1 = punto(r, a1);
    return "M" + p0[0].toFixed(2) + " " + p0[1].toFixed(2) + " A" + r + " " + r + " 0 " + ((a1 - a0) > 180 ? 1 : 0) + " 1 " + p1[0].toFixed(2) + " " + p1[1].toFixed(2);
  }
  // Los bloques que se pisan van al anillo interno (carril 1); nunca más de dos carriles.
  function carriles(tasksOrdenadas) {
    var ends = [], map = {};
    tasksOrdenadas.forEach(function (t) {
      var l = ends.findIndex(function (e) { return e <= t.start; });
      if (l === -1) { l = ends.length; ends.push(0); }
      ends[l] = t.start + t.dur;
      map[t.id] = Math.min(l, 1);
    });
    return map;
  }
  // Ángulos de un bloque con un pequeño hueco para que se distingan los vecinos.
  function angulosBloque(t) {
    var a0 = t.start / 4, a1 = (t.start + t.dur) / 4;
    if (a1 - a0 > 6) { a0 += 1.2; a1 -= 1.2; }
    if (a1 - a0 < 3) a1 = a0 + 3;
    if (a1 - a0 > 359) a1 = a0 + 359;
    return [a0, a1];
  }

  /* ---------- datos iniciales ---------- */
  function seed(hoyKey, uid) {
    return {
      subjects: [
        { id: "am", name: "Análisis Matemático", color: PALETTE[0] },
        { id: "ag", name: "Álgebra y Geometría", color: PALETTE[1] },
        { id: "fi", name: "Física", color: PALETTE[2] },
        { id: "lo", name: "Lógica y Estructuras Discretas", color: PALETTE[3] },
        { id: "al", name: "Algoritmos", color: PALETTE[4] },
        { id: "in", name: "Inglés", color: PALETTE[5] },
        { id: "is", name: "Ingeniería y Sociedad", color: PALETTE[6] },
        { id: "ot", name: "Otro", color: PALETTE[7] }
      ],
      tasks: [
        { id: uid(), title: "Práctica de límites", subject: "am", date: hoyKey, start: 540, dur: 90, done: false },
        { id: uid(), title: "Ejercicios de bucles", subject: "al", date: hoyKey, start: 660, dur: 60, done: false },
        { id: uid(), title: "Guía de cinemática", subject: "fi", date: hoyKey, start: 960, dur: 90, done: false }
      ],
      rewards: [
        { id: uid(), name: "Capítulo de la serie", emoji: "📺", cost: 60 },
        { id: uid(), name: "Postre favorito", emoji: "🍰", cost: 120 },
        { id: uid(), name: "Tarde de videojuegos", emoji: "🎮", cost: 200 },
        { id: uid(), name: "Salida con amigxs", emoji: "🍻", cost: 300 },
        { id: uid(), name: "Sábado libre", emoji: "🛌", cost: 400 }
      ],
      inventory: []
    };
  }

  return {
    PALETTE: PALETTE, XP_POR_NIVEL: XP_POR_NIVEL,
    z: z, dkey: dkey, parseKey: parseKey, fmt: fmt, esc: esc,
    taskXp: taskXp, earned: earned, spent: spent, coins: coins, level: level, puedeQuitarHecho: puedeQuitarHecho,
    streak: streak, minutosPorMateria: minutosPorMateria, horas: horas,
    punto: punto, arco: arco, carriles: carriles, angulosBloque: angulosBloque,
    seed: seed
  };
});
