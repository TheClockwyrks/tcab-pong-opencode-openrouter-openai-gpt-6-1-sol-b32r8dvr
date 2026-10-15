import { createCanvas } from "@napi-rs/canvas";
import { ConstantClock, createEngine } from "@clockwyrks/simple-2d";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BACKGROUND, game } from "./game";
import type { CaromState, ReadState } from "./game";
import * as C from "./constants";

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  vi.restoreAllMocks();
});

async function setup(ms = 8) {
  const target = new EventTarget();
  const canvas = createCanvas(C.FIELD_W, C.FIELD_H);
  const engine = createEngine({
    canvas: canvas as unknown as HTMLCanvasElement,
    width: C.FIELD_W,
    height: C.FIELD_H,
    background: BACKGROUND,
    layout: C.LAYOUT,
    game,
    clock: new ConstantClock(ms),
    surface: {
      cssWidth: () => C.FIELD_W,
      cssHeight: () => C.FIELD_H,
      dpr: () => 1,
      events: () => target,
    },
  });
  cleanups.push(() => engine.destroy());
  await engine.initialize();
  const key = (code: string, down: boolean) =>
    target.dispatchEvent(
      Object.assign(new Event(down ? "keydown" : "keyup"), {
        code,
        repeat: false,
      }),
    );
  const tap = async (code: string) => {
    key(code, true);
    await engine.advance(1);
    key(code, false);
  };
  const pointer = (
    type: string,
    x: number,
    y: number,
    device = "mouse",
    id = 1,
  ) =>
    target.dispatchEvent(
      Object.assign(new Event(`pointer${type}`), {
        clientX: x,
        clientY: y,
        pointerId: id,
        pointerType: device,
        isPrimary: true,
        button: 0,
        buttons: type === "up" ? 0 : 1,
      }),
    );
  const pose = (fn: (s: ReadState) => CaromState) => engine.apply(fn);
  const live = () =>
    pose((s) => ({
      ...s,
      screen: "playing",
      mode: "versus",
      ball: { ...s.ball!, held: false },
      obstacles: [],
    }));
  return { engine, d: engine.debug, tap, key, pointer, pose, live };
}

describe("screens and input through the engine", () => {
  it("initializes the whole title state, registers diagnostics, and freezes menu furniture", async () => {
    const { engine, d } = await setup();
    const before = d.snapshot(engine.state);
    expect(before).toMatchObject({
      version: C.CAROM_DEBUG_VERSION,
      screen: "title",
      score: { p1: 0, p2: 0 },
      receiver: "left",
      ball: {
        held: true,
        holdTimer: C.HOLD_TIME,
        x: C.FIELD_CX,
        y: C.FIELD_CY,
      },
      obstacleClock: 0,
    });
    await engine.advance(10);
    expect(engine.state.simTime).toBeCloseTo(0.08);
    const { speed: _speed, ...openingBall } = before.ball!;
    expect(engine.state.ball).toEqual(openingBall);
    expect(engine.state.obstacleClock).toBe(0);
    expect(engine.diagnostics().every((r) => r.error === undefined)).toBe(true);
    expect(engine.diagnostics().length).toBeGreaterThanOrEqual(10);
  });
  it("navigates menus with edge priority and remembers the title selection", async () => {
    const { engine, tap, key } = await setup();
    await tap("ArrowUp");
    expect(engine.state.menuIndex).toBe(2);
    key("ArrowDown", true);
    key("Enter", true);
    await engine.advance(1);
    expect(engine.state.screen).toBe("title");
    expect(engine.state.menuIndex).toBe(0);
    key("ArrowDown", false);
    key("Enter", false);
    await tap("ArrowUp");
    await tap("Enter");
    expect(engine.state.screen).toBe("howto");
    expect(engine.state.titleIndex).toBe(2);
    await tap("Escape");
    expect(engine.state.screen).toBe("title");
    expect(engine.state.menuIndex).toBe(2);
  });
  it("starts, pauses and resumes once per Escape, freezing every physical value", async () => {
    const { engine, tap } = await setup();
    await tap("Enter");
    expect(engine.state.screen).toBe("countdown");
    await tap("Escape");
    expect(engine.state.screen).toBe("paused");
    const frozen = engine.state;
    await engine.advance(30);
    expect(engine.state.ball).toEqual(frozen.ball);
    expect(engine.state.paddles).toEqual(frozen.paddles);
    expect(engine.state.obstacleClock).toBe(frozen.obstacleClock);
    await tap("Escape");
    expect(engine.state.screen).toBe("countdown");
    await engine.advance(130);
    expect(engine.state.screen).toBe("playing");
    await tap("KeyP");
    await tap("ArrowDown");
    await tap("Enter");
    expect(engine.state.score).toEqual({ p1: 0, p2: 0 });
    expect(engine.state.screen).toBe("countdown");
  });
  it("requires matching pointer press and release regions across frames", async () => {
    const { engine, pointer, d } = await setup();
    const solo = d.menuItemRect(engine.state, 0)!;
    const versus = d.menuItemRect(engine.state, 1)!;
    pointer("down", solo.x + 10, solo.y + 10);
    await engine.advance(1);
    pointer("up", versus.x + 10, versus.y + 10);
    await engine.advance(1);
    expect(engine.state.screen).toBe("title");
    expect(engine.state.menuIndex).toBe(1);
    pointer("down", versus.x + 10, versus.y + 10);
    await engine.advance(1);
    pointer("up", versus.x + 10, versus.y + 10);
    await engine.advance(1);
    expect(engine.state.mode).toBe("versus");
    expect(engine.state.screen).toBe("countdown");
    expect(d.menuItemRect(engine.state, 0)).toBeNull();
  });
  it("accepts a touch tap with both edges in one frame and honors keyboard confirm priority", async () => {
    const { engine, pointer, d, pose, key } = await setup();
    const howto = d.menuItemRect(engine.state, 2)!;
    pointer("down", howto.x + 30, howto.y + 20, "touch");
    pointer("up", howto.x + 30, howto.y + 20, "touch");
    await engine.advance(1);
    expect(engine.state.screen).toBe("howto");
    pose((s) => d.reset(s));
    key("Enter", true);
    pointer("down", howto.x + 30, howto.y + 20);
    pointer("up", howto.x + 30, howto.y + 20);
    await engine.advance(1);
    expect(engine.state.screen).toBe("countdown");
  });
  it("moves both human paddles independently and combines Solo controls", async () => {
    const { engine, live, key, pose, d } = await setup();
    live();
    key("KeyW", true);
    key("ArrowDown", true);
    await engine.advance(10);
    expect(engine.state.paddles.left.cy).toBeCloseTo(
      C.FIELD_CY - C.PADDLE_SPEED * 0.08,
    );
    expect(engine.state.paddles.right.cy).toBeCloseTo(
      C.FIELD_CY + C.PADDLE_SPEED * 0.08,
    );
    pose((s) => d.setMode(s, "solo"));
    await engine.advance(1);
    expect(engine.state.paddles.left.vy).toBe(0);
    key("KeyW", false);
    await engine.advance(1);
    expect(engine.state.paddles.left.vy).toBe(C.PADDLE_SPEED);
  });
  it("mutes cues from any screen without changing play", async () => {
    const { engine, tap, live, pose, d } = await setup();
    await tap("KeyM");
    expect(engine.state.muted).toBe(true);
    live();
    const cues: { cue: string; gain: number }[] = [];
    engine.events.on("cue:played", (e) => cues.push(e));
    pose((s) => d.setBallPosition(s, C.FIELD_CX, C.BALL_R + 1));
    pose((s) => d.setBallVelocity(s, 0, -C.SERVE_SPEED));
    await engine.advance(1);
    expect(cues).toEqual([
      expect.objectContaining({ cue: C.CUES.wallBounce, gain: 0 }),
    ]);
  });
});

describe("simulation and physics", () => {
  it("serves on the elapsed hold frame without moving the ball", async () => {
    const { engine, d, pose } = await setup();
    pose((s) => d.setScreen(s, "countdown"));
    pose((s) => d.setBallServeSign(s, -1));
    pose((s) => d.setBallHoldTimer(s, 0));
    await engine.advance(1);
    expect(engine.state.ball).toMatchObject({
      x: C.FIELD_CX,
      y: C.FIELD_CY,
      held: false,
      holdTimer: 0,
      serveSign: -1,
    });
    expect(engine.state.ball!.vx).toBeCloseTo(
      -C.SERVE_SPEED * Math.cos(C.SERVE_ANGLE),
    );
    expect(engine.state.ball!.vy).toBeCloseTo(
      -C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE),
    );
  });
  it.each(["left", "right"] as const)(
    "applies %s paddle angle, acceleration, and motion spin",
    async (side) => {
      const { engine, d, pose, live } = await setup();
      live();
      pose((s) => d.setPaddleDriven(s, side, true));
      pose((s) => d.setPaddleVy(s, side, 100));
      pose((s) =>
        d.setBallPosition(
          s,
          side === "left" ? C.P1_X1 + C.BALL_R + 1 : C.P2_X0 - C.BALL_R - 1,
          C.FIELD_CY + 15,
        ),
      );
      pose((s) =>
        d.setBallVelocity(
          s,
          side === "left" ? -C.SERVE_SPEED : C.SERVE_SPEED,
          0,
        ),
      );
      const before = engine.state;
      await engine.advance(1);
      const b = engine.state.ball!;
      expect(Math.sign(b.vx)).toBe(side === "left" ? 1 : -1);
      expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(C.SERVE_SPEED * C.SPEED_MULT);
      expect(b.spin).toBeGreaterThan(80);
      expect(b.vy).toBeGreaterThan(0);
      expect(before.ball!.spin).toBe(0);
    },
  );
  it("clamps driven paddles and uses actual velocity when pinned", async () => {
    const { engine, d, pose, live } = await setup();
    live();
    pose((s) => d.setPaddleDriven(s, "left", true));
    pose((s) => d.setPaddleVy(s, "left", C.PADDLE_SPEED));
    pose((s) => d.setPaddleCy(s, "left", C.PADDLE_MAX_CY - 1));
    await engine.advance(1);
    expect(engine.state.paddles.left.cy).toBe(C.PADDLE_MAX_CY);
    expect(engine.state.paddles.left.vy).toBeCloseTo(125);
    await engine.advance(1);
    expect(engine.state.paddles.left.vy).toBe(0);
    expect(engine.state.paddles.left.drivenVy).toBe(C.PADDLE_SPEED);
  });
  it("reflects end caps without adding speed or spin", async () => {
    const { engine, d, pose, live } = await setup();
    live();
    pose((s) =>
      d.setBallPosition(
        s,
        (C.P1_X0 + C.P1_X1) / 2,
        C.FIELD_CY - C.PADDLE_HALF - C.BALL_R - 1,
      ),
    );
    pose((s) => d.setBallVelocity(s, 0, C.SERVE_SPEED));
    await engine.advance(1);
    expect(engine.state.ball!.vy).toBe(-C.SERVE_SPEED);
    expect(engine.state.ball!.spin).toBe(0);
  });
  it("turns velocity without changing speed and decays spin by its half-life", async () => {
    const { engine, d, pose, live } = await setup();
    live();
    pose((s) => d.setBallPosition(s, 300, 250));
    pose((s) => d.setBallVelocity(s, 200, 0));
    pose((s) => d.setBallSpin(s, 100));
    await engine.advance(100);
    expect(engine.state.ball!.spin).toBeCloseTo(50, 7);
    expect(
      Math.hypot(engine.state.ball!.vx, engine.state.ball!.vy),
    ).toBeCloseTo(200);
    expect(engine.state.ball!.y).toBeGreaterThan(250);
    expect(
      engine.state.ball!.trail.every(
        (p) => engine.state.simTime - p.t <= C.TRAIL_TIME,
      ),
    ).toBe(true);
  });
  it.each([0, 0.75])(
    "reflects oriented obstacle faces at clock %s, preserving speed",
    async (clock) => {
      const { engine, d, pose, live } = await setup();
      live();
      pose((s) => d.setObstacleClock(s, clock));
      pose((s) => d.setObstacleClockRunning(s, false));
      pose((s) => d.spawnObstacle(s, 0));
      const o = engine.state.obstacles[0],
        nx = Math.cos(o.theta),
        ny = Math.sin(o.theta);
      pose((s) =>
        d.setBallPosition(
          s,
          o.cx + nx * (C.OBSTACLE_HW + C.BALL_R + 1),
          o.cy + ny * (C.OBSTACLE_HW + C.BALL_R + 1),
        ),
      );
      pose((s) =>
        d.setBallVelocity(s, -nx * C.SERVE_SPEED, -ny * C.SERVE_SPEED),
      );
      await engine.advance(1);
      expect(engine.state.ball!.vx).toBeCloseTo(nx * C.SERVE_SPEED, 5);
      expect(engine.state.ball!.vy).toBeCloseTo(ny * C.SERVE_SPEED, 5);
      expect(engine.state.obstacleClock).toBe(clock);
    },
  );
  it("keeps the sway point-symmetric and advances the obstacle clock after physics", async () => {
    const { engine, d, pose } = await setup();
    pose((s) => d.setScreen(s, "countdown"));
    await engine.advance(25);
    const [a, b] = engine.state.obstacles;
    expect(a.cy + b.cy).toBeCloseTo(C.FIELD_H);
    expect(a.theta).toBeCloseTo(C.OBSTACLE_SPIN_RATE * 0.2);
    expect(a.cy).toBeCloseTo(
      C.OBSTACLE_CENTERS[0].y +
        C.OBSTACLE_SWAY_AMP *
          Math.sin((2 * Math.PI * 0.2) / C.OBSTACLE_SWAY_PERIOD),
    );
  });
  it("scores only a fully crossed goal and requires a two-point lead", async () => {
    const { engine, d, pose, live } = await setup();
    live();
    pose((s) => d.setScore(s, 10, 10));
    pose((s) => d.setBallPosition(s, C.FIELD_W + C.BALL_R - 1, 200));
    pose((s) => d.setBallVelocity(s, C.SERVE_SPEED, 0));
    await engine.advance(1);
    expect(engine.state.score).toEqual({ p1: 11, p2: 10 });
    expect(engine.state.screen).toBe("countdown");
    expect(engine.state.receiver).toBe("right");
    pose((s) => d.setScreen(s, "playing"));
    pose((s) => d.setBallHeld(s, false));
    pose((s) => d.setBallPosition(s, C.FIELD_W + C.BALL_R + 1, 200));
    await engine.advance(1);
    expect(engine.state.winner).toBe("left");
    expect(engine.state.screen).toBe("matchover");
  });
  it("AI tracking and movement can be gated independently", async () => {
    const { engine, d, pose, live } = await setup();
    live();
    pose((s) => d.setMode(s, "solo"));
    pose((s) => d.setBallPosition(s, 900, 150));
    pose((s) => d.setBallVelocity(s, C.SERVE_SPEED, 0));
    await engine.advance(1);
    expect(engine.state.paddles.right.vy).toBe(-C.AI_SPEED);
    pose((s) => d.setAiMovement(s, false));
    await engine.advance(1);
    expect(engine.state.paddles.right.vy).toBe(0);
    pose((s) => d.setPaddleCy(s, "right", 150));
    pose((s) => d.setAiMovement(s, true));
    pose((s) => d.setAiTracking(s, false));
    await engine.advance(1);
    expect(engine.state.paddles.right.vy).toBe(C.AI_SPEED);
  });
  it("agrees across 2ms and 16ms steps through a paddle contact and a wall bounce", async () => {
    const results = [];
    for (const ms of [2, 16]) {
      const { engine, d, pose, live } = await setup(ms);
      live();
      pose((s) => d.setBallPosition(s, 200, C.FIELD_CY + 38));
      pose((s) => d.setBallVelocity(s, -C.SERVE_SPEED, 0));
      await engine.advance(1600 / ms);
      results.push(d.snapshot(engine.state));
    }
    expect(results[0].score).toEqual(results[1].score);
    expect(results[0].ball!.speed).toBeCloseTo(results[1].ball!.speed, 4);
    expect(Math.sign(results[0].ball!.vx)).toBe(Math.sign(results[1].ball!.vx));
    expect(Math.sign(results[0].ball!.vy)).toBe(Math.sign(results[1].ball!.vy));
  });
});

describe("debug surface", () => {
  it("advances an empty field safely and reports absent entities in diagnostics", async () => {
    const { engine, d, pose } = await setup();
    pose((s) => d.clearWorld(s));
    pose((s) => d.setScreen(s, "playing"));
    await engine.advance(5);
    expect(engine.state.ball).toBeNull();
    expect(engine.state.obstacles).toEqual([]);
    expect(engine.state.score).toEqual({ p1: 0, p2: 0 });
    expect(
      engine.diagnostics().find((r) => r.name === "ball speed")?.value,
    ).toBe("absent");
  });
  it("caps high-speed paddle returns and resolves an inside-obstacle pose without extra energy", async () => {
    const { engine, d, pose, live } = await setup();
    live();
    pose((s) => d.setBallPosition(s, C.P1_X1 + C.BALL_R + 1, C.FIELD_CY));
    pose((s) => d.setBallVelocity(s, -C.SPEED_CAP, 0));
    await engine.advance(1);
    expect(d.snapshot(engine.state).ball!.speed).toBeCloseTo(C.SPEED_CAP);
    pose((s) => d.spawnObstacle(s, 0));
    pose((s) => d.setObstacleClockRunning(s, false));
    const o = engine.state.obstacles[0];
    pose((s) => d.setBallPosition(s, o.cx, o.cy));
    pose((s) => d.setBallVelocity(s, 0, 0));
    await engine.advance(1);
    expect(
      Math.hypot(engine.state.ball!.x - o.cx, engine.state.ball!.y - o.cy),
    ).toBeGreaterThanOrEqual(C.OBSTACLE_HW + C.BALL_R - 1e-6);
    expect(d.snapshot(engine.state).ball!.speed).toBe(0);
  });
  it("finishes a right-side win, replays, and restores the remembered title on quit", async () => {
    const { engine, d, pose, live, tap } = await setup();
    live();
    pose((s) => d.setTitleIndex(s, 1));
    pose((s) => d.setScore(s, 9, 10));
    pose((s) => d.setBallPosition(s, -C.BALL_R - 1, 200));
    await engine.advance(1);
    expect(engine.state.winner).toBe("right");
    await tap("Enter");
    expect(engine.state.screen).toBe("countdown");
    expect(engine.state.score).toEqual({ p1: 0, p2: 0 });
    await tap("Escape");
    await tap("ArrowUp");
    await tap("Enter");
    expect(engine.state.screen).toBe("title");
    expect(engine.state.menuIndex).toBe(1);
    expect(engine.state.titleIndex).toBe(1);
  });
  it("clears, spawns, rejects absent entities and resets without retaining hidden state", async () => {
    const { engine, d, pose } = await setup();
    pose((s) => d.clearWorld(s));
    expect(d.snapshot(engine.state)).toMatchObject({
      ball: null,
      obstacles: [],
    });
    expect(() => d.setBallSpin(engine.state, 10)).toThrow("no ball");
    expect(() => d.spawnObstacle(engine.state, 5)).toThrow();
    pose((s) => d.spawnBall(s));
    pose((s) => d.spawnObstacle(s, 1));
    pose((s) => d.setBallSpin(s, 250));
    pose((s) => d.setMuted(s, true));
    const before = d.snapshot(engine.state);
    pose((s) => d.reconcile(s));
    pose((s) => d.reconcile(s));
    expect(d.snapshot(engine.state)).toEqual(before);
    pose((s) => d.reset(s));
    expect(engine.state).toMatchObject({
      screen: "title",
      simTime: 0,
      muted: true,
      ai: { tracking: true, movement: true },
    });
    expect(engine.state.obstacles).toHaveLength(2);
  });
  it("poses only named fields and snapshots are detached from the state", async () => {
    const { engine, d, pose } = await setup();
    pose((s) => d.setPaddleVy(s, "left", 300));
    expect(engine.state.paddles.left.vy).toBe(0);
    pose((s) => d.setWinner(s, "right"));
    pose((s) => d.setReceiver(s, "right"));
    pose((s) => d.setResumeScreen(s, "countdown"));
    pose((s) => d.setTitleIndex(s, 2));
    pose((s) => d.setMenuIndex(s, 1));
    pose((s) => d.setBallPosition(s, 123, 456));
    pose((s) => d.setBallVelocity(s, 300, 400));
    const snap = d.snapshot(engine.state);
    expect(snap.ball!.speed).toBe(500);
    expect(snap).toMatchObject({
      winner: "right",
      receiver: "right",
      resumeScreen: "countdown",
      titleIndex: 2,
      menuIndex: 1,
    });
    expect(snap.ball).not.toBe(engine.state.ball);
    expect(d.menuItemRect(engine.state, -1)).toBeNull();
  });
  it("draws both serve signs when parking, and a posed sign survives serving", async () => {
    const { engine, d, pose } = await setup();
    vi.spyOn(Math, "random").mockReturnValueOnce(0.1).mockReturnValueOnce(0.9);
    pose((s) => d.drawBallServeSign(s));
    expect(engine.state.ball!.serveSign).toBe(-1);
    pose((s) => d.spawnBall(s));
    expect(engine.state.ball!.serveSign).toBe(1);
  });
});
