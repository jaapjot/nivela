// Pruebas de la lógica de Nivelá.  Se corren con:  node test.js
const assert = require("node:assert");
const L = require("./logic.js");

let n = 0, fallas = 0;
function test(nombre, fn) {
  n++;
  try { fn(); console.log("  ok  " + nombre); }
  catch (e) { fallas++; console.log("FALLA " + nombre + "\n      " + e.message); }
}
const tarea = (o) => Object.assign({ id: "x" + Math.random(), subject: "am", date: "2026-10-01", start: 540, dur: 60, done: false }, o);
let c = 0; const uid = () => "id" + (++c);

test("un bloque da 1 XP cada 3 minutos", () => {
  assert.strictEqual(L.taskXp(tarea({ dur: 60 })), 20);
  assert.strictEqual(L.taskXp(tarea({ dur: 90 })), 30);
});
test("un bloque muy corto da al menos 5 XP", () => {
  assert.strictEqual(L.taskXp(tarea({ dur: 15 })), 5);
  assert.strictEqual(L.taskXp(tarea({ dur: 5 })), 5);
});
test("solo los bloques hechos suman XP", () => {
  const ts = [tarea({ dur: 60, done: true }), tarea({ dur: 90 })];
  assert.strictEqual(L.earned(ts), 20);
});
test("nivel: cada 100 XP se sube uno", () => {
  assert.deepStrictEqual(L.level(0), { nivel: 1, enNivel: 0, paraSubir: 100 });
  assert.deepStrictEqual(L.level(99), { nivel: 1, enNivel: 99, paraSubir: 100 });
  assert.deepStrictEqual(L.level(100), { nivel: 2, enNivel: 0, paraSubir: 100 });
  assert.deepStrictEqual(L.level(250), { nivel: 3, enNivel: 50, paraSubir: 100 });
});
test("monedas = ganado - gastado", () => {
  const st = { tasks: [tarea({ dur: 90, done: true }), tarea({ dur: 60, done: true })], inventory: [{ cost: 20 }] };
  assert.strictEqual(L.coins(st), 30);
});
test("no se puede desmarcar un bloque si las monedas ya se gastaron", () => {
  const t = tarea({ dur: 60, done: true });          // dio 20
  assert.strictEqual(L.puedeQuitarHecho({ tasks: [t], inventory: [{ cost: 20 }] }, t), false);
  assert.strictEqual(L.puedeQuitarHecho({ tasks: [t], inventory: [{ cost: 5 }] }, t), false);
  assert.strictEqual(L.puedeQuitarHecho({ tasks: [t], inventory: [] }, t), true);
});
test("un bloque pendiente siempre se puede quitar", () => {
  const t = tarea({ done: false });
  assert.strictEqual(L.puedeQuitarHecho({ tasks: [t], inventory: [{ cost: 999 }] }, t), true);
});
test("racha: cuenta días seguidos hasta hoy", () => {
  const ts = ["2026-10-01", "2026-10-02", "2026-10-03"].map((d) => tarea({ date: d, done: true }));
  assert.strictEqual(L.streak(ts, new Date(2026, 9, 3)), 3);
});
test("racha: si hoy todavía no hay nada hecho, no se corta", () => {
  const ts = ["2026-10-01", "2026-10-02"].map((d) => tarea({ date: d, done: true }));
  assert.strictEqual(L.streak(ts, new Date(2026, 9, 3)), 2);
});
test("racha: un día sin estudiar la corta", () => {
  const ts = ["2026-10-01", "2026-10-03"].map((d) => tarea({ date: d, done: true }));
  assert.strictEqual(L.streak(ts, new Date(2026, 9, 3)), 1);
});
test("racha: sin nada hecho es 0", () => {
  assert.strictEqual(L.streak([tarea()], new Date(2026, 9, 3)), 0);
});
test("racha: cruza el cambio de mes", () => {
  const ts = ["2026-09-30", "2026-10-01"].map((d) => tarea({ date: d, done: true }));
  assert.strictEqual(L.streak(ts, new Date(2026, 9, 1)), 2);
});
test("minutos por materia solo cuentan lo hecho", () => {
  const ts = [tarea({ subject: "am", dur: 60, done: true }), tarea({ subject: "am", dur: 30, done: true }),
              tarea({ subject: "fi", dur: 45, done: false })];
  assert.deepStrictEqual(L.minutosPorMateria(ts), { am: 90 });
});
test("horas se redondea a un decimal", () => {
  assert.strictEqual(L.horas(90), 1.5);
  assert.strictEqual(L.horas(100), 1.7);
});
test("fmt y dkey/parseKey", () => {
  assert.strictEqual(L.fmt(540), "09:00");
  assert.strictEqual(L.fmt(1439), "23:59");
  assert.strictEqual(L.dkey(L.parseKey("2026-03-07")), "2026-03-07");
});
test("reloj: 6 h cae a la derecha del centro, 12 h abajo y 0 h arriba", () => {
  const [x0, y0] = L.punto(100, 0), [x6, y6] = L.punto(100, 90), [x12, y12] = L.punto(100, 180);
  assert.ok(Math.abs(x0 - 170) < 1e-9 && Math.abs(y0 - 70) < 1e-9);
  assert.ok(Math.abs(x6 - 270) < 1e-9 && Math.abs(y6 - 170) < 1e-9);
  assert.ok(Math.abs(x12 - 170) < 1e-9 && Math.abs(y12 - 270) < 1e-9);
});
test("arco: marca de arco grande solo si supera 180°", () => {
  assert.ok(/ 0 0 1 /.test(L.arco(100, 0, 90)));
  assert.ok(/ 0 1 1 /.test(L.arco(100, 0, 200)));
});
test("bloques que no se pisan comparten el anillo externo", () => {
  const ts = [tarea({ id: "a", start: 540, dur: 60 }), tarea({ id: "b", start: 600, dur: 60 })];
  assert.deepStrictEqual(L.carriles(ts), { a: 0, b: 0 });
});
test("bloques que se pisan: el segundo va al anillo interno", () => {
  const ts = [tarea({ id: "a", start: 540, dur: 90 }), tarea({ id: "b", start: 600, dur: 60 })];
  assert.deepStrictEqual(L.carriles(ts), { a: 0, b: 1 });
});
test("nunca hay más de dos carriles", () => {
  const ts = [tarea({ id: "a", start: 540, dur: 120 }), tarea({ id: "b", start: 550, dur: 120 }), tarea({ id: "c", start: 560, dur: 120 })];
  assert.ok(Object.values(L.carriles(ts)).every((l) => l <= 1));
});
test("ángulos: un bloque de 1 hora (15°) deja un hueco a cada lado", () => {
  const [a0, a1] = L.angulosBloque(tarea({ start: 540, dur: 60 }));
  assert.ok(Math.abs(a0 - 136.2) < 1e-9 && Math.abs(a1 - 148.8) < 1e-9);
});
test("ángulos: un bloque cortísimo sigue siendo visible", () => {
  const [a0, a1] = L.angulosBloque(tarea({ start: 540, dur: 5 }));
  assert.ok(a1 - a0 >= 3);
});
test("esc neutraliza HTML", () => {
  assert.strictEqual(L.esc('<img src=x onerror="a">'), "&lt;img src=x onerror=&quot;a&quot;&gt;");
});
test("datos iniciales: 8 materias (la última es 'Otro'), 3 bloques de hoy y 5 recompensas", () => {
  const s = L.seed("2026-10-05", uid);
  assert.strictEqual(s.subjects.length, 8);
  assert.strictEqual(s.subjects[7].id, "ot");
  assert.ok(s.tasks.every((t) => t.date === "2026-10-05" && !t.done));
  assert.strictEqual(s.rewards.length, 5);
  assert.deepStrictEqual(s.inventory, []);
});
test("datos iniciales: los ids no se repiten", () => {
  const s = L.seed("2026-10-05", uid);
  const ids = [...s.tasks, ...s.rewards].map((x) => x.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

console.log(`\n${n - fallas}/${n} pruebas pasaron`);
process.exit(fallas ? 1 : 0);
