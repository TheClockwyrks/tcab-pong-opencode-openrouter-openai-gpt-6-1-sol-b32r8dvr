import { CAROM_DEBUG_VERSION } from "./constants";
import type {
  BallState,
  CaromDebugApi,
  CaromState,
  PaddleState,
  ReadState,
  Side,
} from "./game";
import { menuItemRect } from "./menus";
import { drawSign, initialState, obstaclePose, parkedBall } from "./simulation";

function ballPatch(s: ReadState, patch: Partial<BallState>): CaromState {
  if (!s.ball) throw new Error("Carom: no ball on the field");
  return { ...s, ball: { ...s.ball, ...patch } };
}
function paddlePatch(
  s: ReadState,
  side: Side,
  patch: Partial<PaddleState>,
): CaromState {
  return {
    ...s,
    paddles: { ...s.paddles, [side]: { ...s.paddles[side], ...patch } },
  };
}
export function createDebug(): CaromDebugApi {
  return {
    version: CAROM_DEBUG_VERSION,
    clearWorld: (s) => ({ ...s, ball: null, obstacles: [] }),
    spawnBall: (s) => ({ ...s, ball: parkedBall() }),
    spawnObstacle: (s, index) => {
      const pose = obstaclePose(index, s.obstacleClock);
      return {
        ...s,
        obstacles: [...s.obstacles.filter((o) => o.index !== index), pose].sort(
          (a, b) => a.index - b.index,
        ),
      };
    },
    reset: (s) => initialState(s.muted),
    reconcile: (s) => ({
      ...s,
      obstacles: s.obstacles.map((o) => obstaclePose(o.index, s.obstacleClock)),
    }),
    setScreen: (s, screen) => ({ ...s, screen }),
    setMode: (s, mode) => ({ ...s, mode }),
    setMenuIndex: (s, menuIndex) => ({ ...s, menuIndex }),
    setTitleIndex: (s, titleIndex) => ({ ...s, titleIndex }),
    setResumeScreen: (s, resumeScreen) => ({ ...s, resumeScreen }),
    setScore: (s, p1, p2) => ({ ...s, score: { p1, p2 } }),
    setWinner: (s, winner) => ({ ...s, winner }),
    setReceiver: (s, receiver) => ({ ...s, receiver }),
    setPaddleCy: (s, side, cy) => paddlePatch(s, side, { cy }),
    setPaddleVy: (s, side, drivenVy) => paddlePatch(s, side, { drivenVy }),
    setPaddleDriven: (s, side, driven) => paddlePatch(s, side, { driven }),
    setBallPosition: (s, x, y) => ballPatch(s, { x, y }),
    setBallVelocity: (s, vx, vy) => ballPatch(s, { vx, vy }),
    setBallSpin: (s, spin) => ballPatch(s, { spin }),
    setBallHeld: (s, held) => ballPatch(s, { held }),
    setBallHoldTimer: (s, holdTimer) => ballPatch(s, { holdTimer }),
    setBallServeSign: (s, serveSign) => ballPatch(s, { serveSign }),
    drawBallServeSign: (s) => ballPatch(s, { serveSign: drawSign() }),
    setAiTracking: (s, tracking) => ({ ...s, ai: { ...s.ai, tracking } }),
    setAiMovement: (s, movement) => ({ ...s, ai: { ...s.ai, movement } }),
    setMuted: (s, muted) => ({ ...s, muted }),
    setObstacleClock: (s, obstacleClock) => ({
      ...s,
      obstacleClock,
      obstacles: s.obstacles.map((o) => obstaclePose(o.index, obstacleClock)),
    }),
    setObstacleClockRunning: (s, obstacleClockRunning) => ({
      ...s,
      obstacleClockRunning,
    }),
    snapshot: (s) => {
      const { menuPresses: _presses, ...declared } = s;
      return structuredClone({
        ...declared,
        version: CAROM_DEBUG_VERSION,
        ball: s.ball
          ? { ...s.ball, speed: Math.hypot(s.ball.vx, s.ball.vy) }
          : null,
      });
    },
    menuItemRect,
  };
}
