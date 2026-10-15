import type { UpdateApi } from "@clockwyrks/simple-2d";
import * as C from "./constants";
import type {
  BallState,
  CaromState,
  Mode,
  ObstacleState,
  PaddleState,
  ReadState,
  Side,
} from "./game";
import { flyBall } from "./physics";
import { clamp } from "./math";

export const drawSign = (): 1 | -1 => (Math.random() < 0.5 ? -1 : 1);
export function parkedBall(): BallState {
  return {
    x: C.FIELD_CX,
    y: C.FIELD_CY,
    vx: 0,
    vy: 0,
    spin: 0,
    held: true,
    holdTimer: C.HOLD_TIME,
    serveSign: drawSign(),
    trail: [],
  };
}
export function obstaclePose(index: number, t: number): ObstacleState {
  const base = C.OBSTACLE_CENTERS[index];
  if (!base) throw new RangeError(`Unknown obstacle: ${index}`);
  return {
    index,
    cx: base.x,
    cy:
      base.y +
      (index === 0 ? 1 : -1) *
        C.OBSTACLE_SWAY_AMP *
        Math.sin((2 * Math.PI * t) / C.OBSTACLE_SWAY_PERIOD),
    theta: C.OBSTACLE_SPIN_RATE * t,
  };
}
export function initialState(muted: boolean): CaromState {
  const paddle: PaddleState = {
    cy: C.FIELD_CY,
    vy: 0,
    driven: false,
    drivenVy: 0,
  };
  return {
    screen: "title",
    mode: "solo",
    menuIndex: 0,
    titleIndex: 0,
    resumeScreen: "playing",
    score: { p1: 0, p2: 0 },
    winner: null,
    paddles: { left: { ...paddle }, right: { ...paddle } },
    ai: { tracking: true, movement: true },
    receiver: "left",
    ball: parkedBall(),
    obstacles: C.OBSTACLE_CENTERS.map((_, i) => obstaclePose(i, 0)),
    obstacleClock: 0,
    obstacleClockRunning: true,
    simTime: 0,
    muted,
    menuPresses: {},
  };
}
export function startMatch(s: ReadState, mode: Mode): CaromState {
  return {
    ...s,
    mode,
    screen: "countdown",
    resumeScreen: "playing",
    menuIndex: 0,
    score: { p1: 0, p2: 0 },
    winner: null,
    receiver: "left",
    ball: parkedBall(),
    paddles: {
      left: { ...s.paddles.left, cy: C.FIELD_CY, vy: 0 },
      right: { ...s.paddles.right, cy: C.FIELD_CY, vy: 0 },
    },
    obstacleClock: 0,
    obstacleClockRunning: true,
    obstacles: s.obstacles.map((o) => obstaclePose(o.index, 0)),
    menuPresses: {},
  };
}
function movePaddle(p: PaddleState, vy: number, dt: number): PaddleState {
  const raw = p.cy + vy * dt;
  const cy = clamp(raw, C.PADDLE_MIN_CY, C.PADDLE_MAX_CY);
  return { ...p, cy, vy: raw !== cy && dt > 0 ? (cy - p.cy) / dt : vy };
}
function paddleVelocity(
  s: ReadState,
  side: Side,
  api: UpdateApi,
  dt: number,
): number {
  const p = s.paddles[side];
  if (p.driven) return p.drivenVy;
  if (side === "right" && s.mode === "solo") {
    if (!s.ai.movement) return 0;
    const tracking =
      s.ai.tracking &&
      s.screen === "playing" &&
      s.ball !== null &&
      s.ball.vx > 0;
    const target =
      tracking && s.ball ? s.ball.y - s.ball.vy * C.AI_REACT : C.AI_HOME_Y;
    const diff = target - p.cy;
    return Math.abs(diff) <= (tracking ? C.AI_DEADZONE : C.AI_HOME_DEADZONE) ||
      dt <= 0
      ? 0
      : Math.sign(diff) * Math.min(C.AI_SPEED, Math.abs(diff) / dt);
  }
  const prefix = side === "left" ? "p1" : "p2";
  const up =
    api.input.value(`${prefix}-up`) > 0 ||
    (s.mode === "solo" && api.input.value("p2-up") > 0);
  const down =
    api.input.value(`${prefix}-down`) > 0 ||
    (s.mode === "solo" && api.input.value("p2-down") > 0);
  return (Number(down) - Number(up)) * C.PADDLE_SPEED;
}
export function advanceWorld(
  s: ReadState,
  api: UpdateApi,
  dt: number,
): CaromState {
  if (s.screen !== "countdown" && s.screen !== "playing") return s;
  const paddles = {
    left: movePaddle(s.paddles.left, paddleVelocity(s, "left", api, dt), dt),
    right: movePaddle(s.paddles.right, paddleVelocity(s, "right", api, dt), dt),
  };
  let next: CaromState = { ...s, paddles };
  let ball = s.ball;
  const cues = new Set<C.CueName>();
  if (ball) {
    if (s.screen === "countdown") {
      const holdTimer = ball.holdTimer - dt;
      ball = { ...ball, holdTimer };
      if (holdTimer <= 0) {
        ball = {
          ...ball,
          held: false,
          holdTimer: 0,
          trail: [],
          vx:
            (s.receiver === "left" ? -1 : 1) *
            C.SERVE_SPEED *
            Math.cos(C.SERVE_ANGLE),
          vy: ball.serveSign * C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE),
        };
        next = { ...next, screen: "playing" };
      }
    } else if (!ball.held) ball = flyBall(ball, paddles, s.obstacles, dt, cues);
    ball = {
      ...ball,
      trail: [
        ...ball.trail.filter((p) => s.simTime - p.t <= C.TRAIL_TIME),
        { x: ball.x, y: ball.y, t: s.simTime },
      ],
    };
    next = { ...next, ball };
    if (
      s.screen === "playing" &&
      !ball.held &&
      (ball.x - C.BALL_R > C.FIELD_W || ball.x + C.BALL_R < 0)
    ) {
      const leftScored = ball.x > C.FIELD_W;
      const score = {
        p1: s.score.p1 + Number(leftScored),
        p2: s.score.p2 + Number(!leftScored),
      };
      const won =
        Math.max(score.p1, score.p2) >= C.WIN_SCORE &&
        Math.abs(score.p1 - score.p2) >= C.WIN_LEAD;
      next = {
        ...next,
        score,
        ...(won
          ? {
              winner: leftScored ? ("left" as const) : ("right" as const),
              screen: "matchover" as const,
              menuIndex: 0,
            }
          : {
              receiver: leftScored ? ("right" as const) : ("left" as const),
              ball: parkedBall(),
              screen: "countdown" as const,
            }),
      };
      cues.add(C.CUES.score);
    }
  }
  const obstacleClock = s.obstacleClock + (s.obstacleClockRunning ? dt : 0);
  next = {
    ...next,
    obstacleClock,
    obstacles: s.obstacles.map((o) => obstaclePose(o.index, obstacleClock)),
  };
  for (const cue of cues) api.audio.play(cue);
  return next;
}
