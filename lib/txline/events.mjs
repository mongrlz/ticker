// Normalize raw TxLINE score events (PascalCase) into a stable shape all three
// products consume. Classification is intentionally coarse — game/agent logic
// interprets kinds; the adapter never embeds product rules.

export const KIND = {
  GOAL: "goal", SHOT: "shot", CORNER: "corner", CARD: "card", PENALTY: "penalty",
  VAR: "var", SUB: "substitution", DANGER: "danger", POSSESSION: "possession",
  POSSIBLE: "possible", SETPIECE: "setpiece", AMEND: "amend", STATUS: "status",
  LINEUP: "lineup", CLOCK: "clock", BREAK: "break", META: "meta",
};

const ACTION_KIND = {
  goal: KIND.GOAL,
  shot: KIND.SHOT,
  corner: KIND.CORNER,
  yellow_card: KIND.CARD,
  red_card: KIND.CARD,
  penalty: KIND.PENALTY,
  penalty_outcome: KIND.PENALTY,
  var: KIND.VAR,
  var_end: KIND.VAR,
  substitution: KIND.SUB,
  danger_possession: KIND.DANGER,
  high_danger_possession: KIND.DANGER,
  attack_possession: KIND.POSSESSION,
  possession: KIND.POSSESSION,
  safe_possession: KIND.POSSESSION,
  possible: KIND.POSSIBLE,
  free_kick: KIND.SETPIECE,
  goal_kick: KIND.SETPIECE,
  throw_in: KIND.SETPIECE,
  action_amend: KIND.AMEND,
  action_discarded: KIND.AMEND,
  status: KIND.STATUS,
  standby: KIND.STATUS,
  kickoff: KIND.STATUS,
  kickoff_team: KIND.STATUS,
  halftime_finalised: KIND.BREAK,
  additional_time: KIND.BREAK,
  game_finalised: KIND.BREAK,
  lineups: KIND.LINEUP,
  clock_adjustment: KIND.CLOCK,
};

// Stat map keys (reverse-engineered, verified vs Belgium-Senegal finals):
// 1 P1_Goals · 2 P2_Goals · 3 P1_Yellows · 4 P2_Yellows · 5 P1_Reds · 6 P2_Reds · 7 P1_Corners · 8 P2_Corners
// +1000-blocks repeat the 8 per period.
export const STAT = {
  P1_GOALS: 1, P2_GOALS: 2, P1_YELLOWS: 3, P2_YELLOWS: 4,
  P1_REDS: 5, P2_REDS: 6, P1_CORNERS: 7, P2_CORNERS: 8,
};

export function normalizeEvent(raw) {
  if (!raw || typeof raw !== "object" || raw.FixtureId === undefined) return null;
  const action = raw.Action ?? null;
  return {
    fixtureId: raw.FixtureId,
    seq: raw.Seq,
    id: raw.Id,
    ts: raw.Ts,
    action,
    kind: ACTION_KIND[action] ?? KIND.META,
    confirmed: raw.Confirmed,          // goals arrive false first, then amend/confirm
    participant: raw.Participant ?? raw.Data?.Participant ?? null, // 1 | 2 | null
    statusId: raw.StatusId ?? null,
    clock: raw.Clock ? { running: raw.Clock.Running, seconds: raw.Clock.Seconds } : null,
    score: raw.Score ?? null,          // sparse per-period {Participant1:{H1,HT,H2,ET1,ET2,ETTotal,PE,Total}}
    stats: raw.Stats ?? null,          // numeric statKey map (see STAT)
    data: raw.Data ?? null,
    raw,
  };
}

// Convenience: per-team totals from a sparse Score object.
export function scoreTotals(score) {
  const t = (p) => score?.[p]?.Total ?? {};
  return {
    p1: { goals: t("Participant1").Goals ?? 0, yellows: t("Participant1").YellowCards ?? 0, reds: t("Participant1").RedCards ?? 0, corners: t("Participant1").Corners ?? 0 },
    p2: { goals: t("Participant2").Goals ?? 0, yellows: t("Participant2").YellowCards ?? 0, reds: t("Participant2").RedCards ?? 0, corners: t("Participant2").Corners ?? 0 },
  };
}
