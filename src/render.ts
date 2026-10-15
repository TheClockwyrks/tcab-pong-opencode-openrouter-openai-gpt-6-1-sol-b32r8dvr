import type { RenderApi } from "@clockwyrks/simple-2d";
import * as C from "./constants";
import type { ReadState } from "./game";
import { menuItemRect, menuItems } from "./menus";

const P = {
  bg: "#0b1118",
  ink: "#edf4ed",
  muted: "#82939e",
  faint: "#25333e",
  mint: "#a8f5ce",
  coral: "#ff8d7b",
  amber: "#edc47d",
};
const FONT = '"Arial", "Helvetica Neue", sans-serif';
const MONO = '"Courier New", monospace';
type Context = CanvasRenderingContext2D;

function text(
  ctx: Context,
  copy: string,
  x: number,
  y: number,
  size = 14,
  color = P.ink,
  weight = 400,
  align: CanvasTextAlign = "left",
  mono = false,
): void {
  ctx.font = `${weight} ${size}px ${mono ? MONO : FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(copy, x, y);
}
function line(
  ctx: Context,
  x: number,
  y: number,
  x2: number,
  y2: number,
  color = P.faint,
  width = 1,
): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}
function round(
  ctx: Context,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}
function circle(
  ctx: Context,
  x: number,
  y: number,
  r: number,
  color: string | CanvasGradient,
): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}
function arrow(ctx: Context, x: number, y: number, color: string): void {
  line(ctx, x - 15, y, x, y, color, 1.5);
  line(ctx, x - 5, y - 5, x, y, color, 1.5);
  line(ctx, x - 5, y + 5, x, y, color, 1.5);
}
function brand(ctx: Context, muted: boolean): void {
  round(ctx, 40, 34, 5, 21, 2, P.mint);
  round(ctx, 54, 34, 5, 21, 2, P.coral);
  circle(ctx, 50, 28, 3, P.ink);
  text(ctx, C.TITLE_TEXT, 72, 45, 15, P.ink, 700);
  text(ctx, "PADDLE DUEL / 001", 204, 45, 11, P.muted, 400, "left", true);
  circle(ctx, 1090, 44, 3, muted ? P.muted : P.mint);
  text(
    ctx,
    muted ? "SOUND OFF" : "SOUND ON",
    1103,
    45,
    11,
    P.muted,
    400,
    "left",
    true,
  );
  round(ctx, 1200, 33, 26, 24, 4, "#1b2832");
  text(ctx, "M", 1213, 46, 11, P.ink, 400, "center", true);
  line(ctx, 40, 76, C.FIELD_W - 40, 76);
}
function footer(
  ctx: Context,
  left = "W S / ↑ ↓   SELECT",
  right = "ENTER   CONFIRM",
): void {
  line(ctx, 40, 652, C.FIELD_W - 40, 652);
  text(ctx, left, 100, 682, 11, P.muted, 400, "left", true);
  text(ctx, right, C.FIELD_W - 100, 682, 11, P.muted, 400, "right", true);
}
function menus(ctx: Context, s: ReadState): void {
  menuItems(s).forEach((label, i) => {
    const r = menuItemRect(s, i);
    if (!r) return;
    const selected = i === s.menuIndex;
    if (selected) round(ctx, r.x, r.y, r.w, r.h, 4, P.mint);
    else {
      ctx.strokeStyle = P.faint;
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    }
    text(
      ctx,
      `0${i + 1}`,
      r.x + 20,
      r.y + r.h / 2,
      11,
      selected ? "#3c6257" : P.muted,
      400,
      "left",
      true,
    );
    text(ctx, label, r.x + 58, r.y + r.h / 2, 15, selected ? P.bg : P.ink, 700);
    arrow(ctx, r.x + r.w - 23, r.y + r.h / 2, selected ? P.bg : P.muted);
  });
}
function titleIllustration(ctx: Context): void {
  // A deliberately diagrammatic bank shot: the title's visual identity.
  ctx.save();
  const x = 610,
    y = 133,
    w = 570,
    h = 435;
  round(ctx, x, y, w, h, 12, "#101b24");
  ctx.strokeStyle = "#2c3b46";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.stroke();
  for (let gx = x + 30; gx < x + w; gx += 30)
    for (let gy = y + 25; gy < y + h; gy += 30)
      circle(ctx, gx, gy, 0.8, "#293843");
  ctx.setLineDash([5, 9]);
  line(ctx, 895, y + 20, 895, y + h - 20, "#30424d");
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(895, 350, 58, 0, Math.PI * 2);
  ctx.strokeStyle = "#263843";
  ctx.stroke();
  round(ctx, 640, 366, 10, 76, 5, P.mint);
  round(ctx, 1140, 230, 10, 76, 5, P.coral);
  ctx.save();
  ctx.translate(806, 275);
  ctx.rotate(-0.38);
  round(ctx, -7, -49, 14, 98, 5, P.amber);
  ctx.restore();
  ctx.save();
  ctx.translate(988, 432);
  ctx.rotate(-0.38);
  round(ctx, -7, -49, 14, 98, 5, P.amber);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(654, 398);
  ctx.bezierCurveTo(742, 384, 814, 376, 868, 298);
  ctx.bezierCurveTo(905, 244, 930, 173, 972, 157);
  ctx.strokeStyle = "#a8f5ce55";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 7]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(972, 157);
  ctx.bezierCurveTo(1002, 200, 1034, 258, 1077, 278);
  ctx.strokeStyle = "#a8f5ce";
  ctx.lineWidth = 2;
  ctx.stroke();
  const g = ctx.createRadialGradient(1077, 278, 2, 1077, 278, 43);
  g.addColorStop(0, "#a8f5ce30");
  g.addColorStop(1, "#a8f5ce00");
  circle(ctx, 1077, 278, 43, g);
  circle(ctx, 1077, 278, C.BALL_R, P.ink);
  text(ctx, "+ SPIN", 700, 463, 10, P.mint, 400, "left", true);
  text(ctx, "FIND YOUR ANGLE.", 895, 530, 11, P.muted, 400, "center", true);
  text(ctx, "01 / THE COURT", 612, 604, 10, P.muted, 400, "left", true);
  text(ctx, "REFLEXES × GEOMETRY", 1180, 604, 10, P.muted, 400, "right", true);
  ctx.restore();
}
function title(ctx: Context, s: ReadState): void {
  brand(ctx, s.muted);
  text(ctx, "A GAME OF ANGLES", 102, 144, 12, P.mint, 400, "left", true);
  text(ctx, C.TITLE_TEXT, 94, 228, 108, P.ink, 900);
  text(ctx, "A little motion. A different trajectory.", 103, 310, 19, P.muted);
  menus(ctx, s);
  text(
    ctx,
    s.menuIndex === 0
      ? "YOU VS. THE MACHINE"
      : s.menuIndex === 1
        ? "TWO PLAYERS. ONE KEYBOARD."
        : "LEARN TO BEND THE RALLY",
    103,
    604,
    11,
    P.muted,
    400,
    "left",
    true,
  );
  titleIllustration(ctx);
  footer(ctx);
}
function field(ctx: Context, s: ReadState): void {
  // Quiet court markings let the actual ball and collision bodies dominate.
  for (let x = 96; x < C.FIELD_W; x += 48)
    for (let y = 120; y < C.FIELD_H - 60; y += 48)
      circle(ctx, x, y, 0.65, "#1e2b35");
  ctx.setLineDash([5, 13]);
  line(ctx, C.NET_X, 116, C.NET_X, C.FIELD_H - 50, "#2b3a44");
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(C.FIELD_CX, C.FIELD_CY, 67, 0, Math.PI * 2);
  ctx.strokeStyle = "#1f2e38";
  ctx.lineWidth = 1;
  ctx.stroke();
  line(ctx, 24, 1, C.FIELD_W - 24, 1, "#495750", 2);
  line(ctx, 24, C.FIELD_H - 1, C.FIELD_W - 24, C.FIELD_H - 1, "#495750", 2);
  for (const o of s.obstacles) {
    ctx.save();
    ctx.translate(o.cx, o.cy);
    ctx.rotate(o.theta);
    ctx.shadowColor = "#edc47d30";
    ctx.shadowBlur = 22;
    round(
      ctx,
      -C.OBSTACLE_HW,
      -C.OBSTACLE_HH,
      C.OBSTACLE_W,
      C.OBSTACLE_H,
      7,
      P.amber,
    );
    ctx.shadowBlur = 0;
    circle(ctx, 0, 0, 3, "#9d7d48");
    ctx.restore();
  }
  for (const side of ["left", "right"] as const) {
    const p = s.paddles[side];
    const color = side === "left" ? P.mint : P.coral;
    ctx.save();
    ctx.shadowColor = color + "66";
    ctx.shadowBlur = 22;
    round(
      ctx,
      side === "left" ? C.P1_X0 : C.P2_X0,
      p.cy - C.PADDLE_HALF,
      C.PADDLE_W,
      C.PADDLE_H,
      7,
      color,
    );
    ctx.restore();
  }
  if (s.ball) {
    const b = s.ball;
    for (let i = 1; i < b.trail.length; i++) {
      const a = b.trail[i - 1],
        z = b.trail[i];
      const age = Math.max(0, 1 - (s.simTime - z.t) / C.TRAIL_TIME);
      ctx.globalAlpha = age * 0.42;
      ctx.lineCap = "round";
      line(ctx, a.x, a.y, z.x, z.y, P.mint, 3 + age * 12);
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.shadowColor = "#d9ffe9";
    ctx.shadowBlur = 20;
    circle(ctx, b.x, b.y, C.BALL_R, P.ink);
    ctx.restore();
  }
  text(ctx, "PLAYER 01", 465, 32, 10, P.mint, 400, "center", true);
  text(
    ctx,
    s.mode === "solo" ? "MACHINE" : "PLAYER 02",
    815,
    32,
    10,
    P.coral,
    400,
    "center",
    true,
  );
  text(
    ctx,
    String(s.score.p1).padStart(2, "0"),
    465,
    77,
    52,
    P.ink,
    700,
    "center",
  );
  text(
    ctx,
    String(s.score.p2).padStart(2, "0"),
    815,
    77,
    52,
    P.ink,
    700,
    "center",
  );
  text(
    ctx,
    s.mode === "solo" ? "SOLO DUEL" : "LOCAL VERSUS",
    C.FIELD_CX,
    34,
    10,
    P.muted,
    400,
    "center",
    true,
  );
  text(
    ctx,
    `FIRST TO ${C.WIN_SCORE} / WIN BY ${C.WIN_LEAD}`,
    C.FIELD_CX,
    62,
    9,
    P.muted,
    400,
    "center",
    true,
  );
  text(ctx, C.TITLE_TEXT, 40, 36, 14, P.ink, 700);
  text(
    ctx,
    "P / ESC   PAUSE",
    C.FIELD_W - 40,
    36,
    10,
    P.muted,
    400,
    "right",
    true,
  );
  text(
    ctx,
    s.mode === "solo" ? "W S / ↑ ↓   MOVE" : "W S   PLAYER 01",
    100,
    691,
    10,
    P.muted,
    400,
    "left",
    true,
  );
  text(
    ctx,
    s.mode === "solo" ? "MOVE THROUGH THE HIT TO ADD SPIN" : "↑ ↓   PLAYER 02",
    C.FIELD_W - 100,
    691,
    10,
    P.muted,
    400,
    "right",
    true,
  );
  if (s.screen === "countdown" && s.ball) {
    text(
      ctx,
      "GET READY",
      C.FIELD_CX,
      C.FIELD_CY - 70,
      12,
      P.mint,
      700,
      "center",
      true,
    );
    text(
      ctx,
      `SERVING ${s.receiver === "left" ? "←" : "→"}`,
      C.FIELD_CX,
      C.FIELD_CY + 49,
      10,
      P.muted,
      400,
      "center",
      true,
    );
    const width = 100 * Math.max(0, s.ball.holdTimer / C.HOLD_TIME);
    round(ctx, C.FIELD_CX - 50, C.FIELD_CY + 74, 100, 3, 1, P.faint);
    if (width > 0)
      round(ctx, C.FIELD_CX - 50, C.FIELD_CY + 74, width, 3, 1, P.mint);
  }
}
function howto(ctx: Context, s: ReadState): void {
  brand(ctx, s.muted);
  text(ctx, "THE SHORT VERSION", 100, 133, 12, P.mint, 400, "left", true);
  text(ctx, "Make your move.", 96, 198, 61, P.ink, 700);
  const columns = [100, 490, 880];
  const headings = [
    "01   MEET THE BALL",
    "02   BEND THE FLIGHT",
    "03   PLAY THE ANGLES",
  ];
  const bodies = [
    [
      "Keep the rally alive. Send the ball",
      "past the other paddle to score.",
      `First to ${C.WIN_SCORE}, with a ${C.WIN_LEAD}-point lead.`,
    ],
    [
      "Move your paddle as you strike.",
      "Upward motion adds upward spin;",
      "downward motion bends it down.",
    ],
    [
      "The amber bars sway and rotate.",
      "Bank a shot off a tilted face.",
      "Turn a rebound into an opening.",
    ],
  ];
  columns.forEach((x, i) => {
    line(ctx, x, 267, x + 300, 267);
    text(
      ctx,
      headings[i],
      x,
      305,
      12,
      i === 2 ? P.amber : P.mint,
      700,
      "left",
      true,
    );
    bodies[i].forEach((copy, j) =>
      text(ctx, copy, x, 347 + j * 26, 16, P.muted),
    );
  });
  round(ctx, 100, 451, 1080, 88, 5, "#121f29");
  text(ctx, "SOLO", 124, 477, 11, P.mint, 700, "left", true);
  text(ctx, "W / S  or  ↑ / ↓", 124, 509, 17, P.ink, 400, "left", true);
  text(ctx, "VERSUS", 485, 477, 11, P.coral, 700, "left", true);
  text(ctx, "P1  W / S     P2  ↑ / ↓", 485, 509, 17, P.ink, 400, "left", true);
  text(ctx, "TAKE A BREATHER", 904, 477, 11, P.amber, 700, "left", true);
  text(ctx, "P / ESC  pause", 904, 509, 17, P.ink, 400, "left", true);
  menus(ctx, s);
  footer(ctx, "TOUCH   USE THE SIDE SLIDERS", "ENTER / ESC   BACK");
}
export function render(s: ReadState, api: RenderApi): void {
  const ctx = api.ctx;
  if (s.screen === "title") {
    title(ctx, s);
    return;
  }
  if (s.screen === "howto") {
    howto(ctx, s);
    return;
  }
  field(ctx, s);
  if (s.screen !== "paused" && s.screen !== "matchover") return;
  ctx.fillStyle = "#0b1118e8";
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  text(
    ctx,
    s.screen === "paused" ? "TAKE YOUR TIME" : "THE FINAL ANGLE",
    C.FIELD_CX,
    171,
    12,
    P.mint,
    400,
    "center",
    true,
  );
  const winner =
    s.winner === "left"
      ? "PLAYER 01 WINS"
      : s.mode === "solo"
        ? "MACHINE WINS"
        : "PLAYER 02 WINS";
  text(
    ctx,
    s.screen === "paused" ? "On a break." : winner,
    C.FIELD_CX,
    239,
    s.screen === "paused" ? 64 : 51,
    P.ink,
    700,
    "center",
  );
  text(
    ctx,
    s.screen === "paused"
      ? "Your next move can wait."
      : `${s.score.p1}  —  ${s.score.p2}`,
    C.FIELD_CX,
    304,
    19,
    P.muted,
    400,
    "center",
  );
  menus(ctx, s);
  footer(ctx);
}
