import test from "node:test";
import assert from "node:assert/strict";
import { TickerEngine, TICKER_STATE } from "../engine/ticker-engine.mjs";

const event = (overrides = {}) => ({
  ts: 1_000,
  seq: 1,
  kind: "possession",
  participant: 1,
  action: "possession",
  ...overrides,
});

test("starts steady at the baseline heart rate", () => {
  const engine = new TickerEngine({ team: 1 });
  assert.deepEqual(engine.snapshot(), {
    state: TICKER_STATE.IDLE,
    heartRate: 70,
    heartbreaks: 0,
    revives: 0,
    calms: 0,
  });
});

test("a confirmed opponent goal breaks the supported heart", () => {
  const engine = new TickerEngine({ team: 1 });
  const snapshot = engine.update(event({ kind: "goal", participant: 2, confirmed: true }));
  assert.equal(snapshot.state, TICKER_STATE.FAINTED);
  assert.equal(snapshot.heartbreaks, 1);
});

test("a confirmed goal for the supported team triggers euphoria", () => {
  const engine = new TickerEngine({ team: 1 });
  const snapshot = engine.update(event({ kind: "goal", participant: 1, confirmed: true }));
  assert.equal(snapshot.state, TICKER_STATE.EUPHORIA);
  assert.equal(snapshot.heartbreaks, 0);
});

test("VAR limbo freezes the heart until an amendment resolves it", () => {
  const engine = new TickerEngine({ team: 1 });
  engine.update(event({ kind: "goal", participant: 2, confirmed: false }));
  assert.equal(engine.snapshot().state, TICKER_STATE.DREAD);
  const snapshot = engine.update(event({ ts: 2_000, seq: 2, kind: "amend", action: "action_discarded" }));
  assert.equal(snapshot.state, TICKER_STATE.EUPHORIA);
});

test("revive only succeeds after heartbreak", () => {
  const engine = new TickerEngine({ team: 1 });
  assert.equal(engine.revive(1_000), false);
  engine.update(event({ kind: "goal", participant: 2, confirmed: true }));
  assert.equal(engine.revive(2_000), true);
  assert.equal(engine.snapshot().state, TICKER_STATE.NERVOUS);
  assert.equal(engine.snapshot().revives, 1);
});

test("calm lowers a racing heart and enforces its cooldown", () => {
  const engine = new TickerEngine({ team: 1 });
  engine.state = TICKER_STATE.PANIC;
  engine.heartRate = 154;
  engine.hrTarget = 170;
  assert.equal(engine.calm(30_000), true);
  assert.equal(engine.snapshot().state, TICKER_STATE.NERVOUS);
  assert.equal(engine.snapshot().heartRate, 132);
  assert.equal(engine.calm(35_000), "cooldown");
});
