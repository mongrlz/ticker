// Ticker's brain: live match events -> heart state.
// Pure logic, no I/O. Consumes normalized events from lib/txline/events.mjs.
// Perspective: the fan supports ONE team (participant 1 or 2); the same match
// feels opposite depending on side.

export const TICKER_STATE = {
  IDLE: "idle",           // steady beat
  NERVOUS: "nervous",     // opponent building play / mild tension
  PANIC: "panic",         // high danger against us (or penalty/VAR chaos)
  HYPE: "hype",           // WE are the ones attacking
  DREAD: "dread",         // a goal is UNCONFIRMED (VAR limbo) — the beat stops
  FAINTED: "fainted",     // we conceded — heartbreak (needs revive or cooldown)
  EUPHORIA: "euphoria",   // we scored (confirmed)
  SLEEPY: "sleepy",       // nothing has happened for a while
};

const BASELINE_HR = 70;
const HR_MAX = 185;
const HR_MIN = 45;

export class TickerEngine {
  constructor({ team = 1, reviveCooldownMs = 10 * 60_000 } = {}) {
    this.team = team;                 // 1 or 2 — which participant the fan supports
    this.reviveCooldownMs = reviveCooldownMs;
    this.state = TICKER_STATE.IDLE;
    this.heartRate = BASELINE_HR;
    this.hrTarget = BASELINE_HR;
    this.heartbreaks = 0;             // times fainted this match (stitches!)
    this.revives = 0;
    this.calms = 0;                   // calming moves (the care verb)
    this.faintedAt = null;
    this.lastActionTs = null;
    this.pendingGoal = null;          // {seq, ours} while a goal is unconfirmed
    this.log = [];
  }

  // side helpers: event.participant is 1|2 (whose action it is)
  #ours(ev) { return ev.participant === this.team; }
  #theirs(ev) { return ev.participant != null && ev.participant !== this.team; }

  #set(state, hrTarget, ev, note) {
    const changed = state !== this.state;
    this.state = state;
    if (hrTarget != null) this.hrTarget = Math.max(HR_MIN, Math.min(HR_MAX, hrTarget));
    if (changed) this.log.push({ ts: ev?.ts ?? null, seq: ev?.seq ?? null, state, note });
    return changed;
  }

  // decay heart rate toward target between events (call with each event's ts)
  #tick(ts) {
    if (this.lastActionTs != null && ts > this.lastActionTs) {
      const dtMin = (ts - this.lastActionTs) / 60_000;
      // relax toward baseline ~12 bpm per quiet minute; snap toward spikes fast
      const toward = this.state === TICKER_STATE.IDLE || this.state === TICKER_STATE.SLEEPY ? BASELINE_HR : this.hrTarget;
      const rate = this.heartRate < toward ? 60 : 12; // spikes hit fast, calm comes slow
      const step = Math.min(Math.abs(toward - this.heartRate), rate * dtMin);
      this.heartRate += Math.sign(toward - this.heartRate) * step;
      // fall asleep after 5 quiet in-feed minutes (unless fainted/dread)
      if (
        dtMin >= 5 &&
        ![TICKER_STATE.FAINTED, TICKER_STATE.DREAD].includes(this.state)
      ) {
        this.#set(TICKER_STATE.SLEEPY, 55, { ts }, "nothing happening…");
      }
      // CARDIAC OVERLOAD: a heart pegged >=150 for 2+ match-minutes faints on
      // its own — unless the player calms it (the care loop's core stake)
      if (this.heartRate >= 150 && this.state !== TICKER_STATE.FAINTED) {
        this.overloadSince ??= ts;
        if (ts - this.overloadSince >= 2 * 60_000) {
          this.heartbreaks++;
          this.faintedAt = ts;
          this.overloadSince = null;
          this.#set(TICKER_STATE.FAINTED, HR_MIN, { ts }, "CARDIAC OVERLOAD — it gave out…");
        }
      } else if (this.heartRate < 150) {
        this.overloadSince = null;
      }
    }
  }

  revive(ts = Date.now()) {
    if (this.state !== TICKER_STATE.FAINTED) return false;
    this.revives++;
    this.overloadSince = null;
    this.#set(TICKER_STATE.NERVOUS, 110, { ts }, `revived (energy drink #${this.revives}) — stitched up`);
    return true;
  }

  // the care verb: soothe a racing heart. Only works when it's actually racing,
  // and no more than once per 15s — spamming A cannot make the heart immortal.
  calm(ts = Date.now()) {
    const S = TICKER_STATE;
    if (![S.PANIC, S.NERVOUS, S.HYPE].includes(this.state) || this.heartRate < 110) return false;
    if (this.lastCalmAt != null && ts - this.lastCalmAt < 15_000) return "cooldown";
    this.lastCalmAt = ts;
    this.calms++;
    this.hrTarget = Math.max(88, this.hrTarget - 35);
    this.heartRate = Math.max(95, this.heartRate - 22);
    this.overloadSince = null;
    if (this.state === S.PANIC) this.#set(S.NERVOUS, this.hrTarget, { ts }, "you calmed it down… breathe…");
    else this.log.push({ ts, seq: null, state: this.state, note: "soothed… breathe…" });
    return true;
  }

  /** Feed one normalized event; returns snapshot {state, heartRate, ...}. */
  update(ev) {
    if (!ev || ev.ts == null) return this.snapshot();
    this.#tick(ev.ts);

    const S = TICKER_STATE;
    const dead = this.state === S.FAINTED;
    const inDread = this.state === S.DREAD;

    switch (ev.kind) {
      case "goal": {
        const ours = this.#ours(ev);
        if (ev.confirmed === false) {
          // VAR limbo: the heart STOPS.
          this.pendingGoal = { seq: ev.seq, ours };
          this.#set(S.DREAD, 30, ev, ours ? "our goal… is it given?!" : "they scored… VAR checking…");
        } else {
          this.pendingGoal = null;
          if (ours) this.#set(S.EUPHORIA, 165, ev, "GOOOAL!!! ");
          else { this.heartbreaks++; this.faintedAt = ev.ts; this.#set(S.FAINTED, HR_MIN, ev, "conceded </3 (heartbreak)"); }
        }
        break;
      }
      case "amend": {
        // amendment resolves a pending unconfirmed goal
        if (inDread && this.pendingGoal) {
          const { ours } = this.pendingGoal;
          const discarded = ev.action === "action_discarded";
          if (discarded) {
            this.#set(ours ? S.NERVOUS : S.EUPHORIA, ours ? 100 : 150, ev, ours ? "disallowed… gutted" : "DISALLOWED! we live!");
          } else {
            if (ours) this.#set(S.EUPHORIA, 165, ev, "IT STANDS!");
            else { this.heartbreaks++; this.faintedAt = ev.ts; this.#set(S.FAINTED, HR_MIN, ev, "it stands… </3"); }
          }
          this.pendingGoal = null;
        }
        break;
      }
      case "danger": {
        if (dead || inDread) break;
        const high = ev.action === "high_danger_possession";
        if (this.#theirs(ev)) this.#set(high ? S.PANIC : S.NERVOUS, high ? 150 : 115, ev, high ? "THEY'RE THROUGH—" : "they're building…");
        else if (this.#ours(ev)) this.#set(high ? S.HYPE : S.NERVOUS, high ? 140 : 110, ev, high ? "WE'RE IN ON GOAL—" : "we're building…");
        break;
      }
      case "penalty": {
        if (dead) break;
        this.#set(S.PANIC, 170, ev, this.#theirs(ev) ? "PENALTY AGAINST US" : "PENALTY TO US");
        break;
      }
      case "var": {
        if (dead) break;
        if (ev.action === "var") this.#set(S.DREAD, 35, ev, "VAR review…");
        else if (this.state === S.DREAD && !this.pendingGoal) this.#set(S.NERVOUS, 100, ev, "VAR over");
        break;
      }
      case "card": {
        if (dead || inDread) break;
        const red = ev.action === "red_card";
        if (this.#ours(ev)) this.#set(red ? S.PANIC : S.NERVOUS, red ? 155 : 105, ev, red ? "we're down to ten!!" : "booked…");
        else this.#set(S.NERVOUS, 100, ev, red ? "they're down to ten!" : "their booking");
        break;
      }
      case "shot": {
        if (dead || inDread) break;
        if (this.#theirs(ev)) this.#set(S.NERVOUS, Math.max(this.hrTarget, 120), ev, "shot at us…");
        else this.#set(S.HYPE, Math.max(this.hrTarget, 118), ev, "we shoot!");
        break;
      }
      case "corner": {
        if (dead || inDread) break;
        this.#set(this.#theirs(ev) ? S.NERVOUS : S.HYPE, 112, ev, this.#theirs(ev) ? "corner against us" : "corner for us");
        break;
      }
      case "break": {
        if (ev.action === "halftime_finalised") this.#set(S.IDLE, 80, ev, "halftime breather");
        if (ev.action === "game_finalised") {
          const note = dead ? "full time — it died of heartbreak" : "full time — it survived";
          this.#set(dead ? S.FAINTED : S.IDLE, 75, ev, note);
        }
        break;
      }
      default: {
        // possession/setpiece/meta gently relax the heart; auto-wake from sleepy
        if (this.state === S.SLEEPY && ["possession", "setpiece", "possible"].includes(ev.kind)) {
          this.#set(S.IDLE, BASELINE_HR, ev, "stirring…");
        }
        // auto-recover from faint after cooldown (unrevived = scarred but alive)
        if (dead && this.faintedAt != null && ev.ts - this.faintedAt >= this.reviveCooldownMs) {
          this.#set(S.NERVOUS, 95, ev, "came to on its own… barely");
        }
      }
    }

    this.lastActionTs = ev.ts;
    return this.snapshot();
  }

  snapshot() {
    return {
      state: this.state,
      heartRate: Math.round(this.heartRate),
      heartbreaks: this.heartbreaks,
      revives: this.revives,
      calms: this.calms,
    };
  }
}
