import type { UpdateApi } from "@clockwyrks/simple-2d";
import {
  ACTIONS,
  MATCHOVER_ITEMS,
  PAUSE_ITEMS,
  TITLE_ITEMS,
} from "./constants";
import type { CaromState, MenuRect, ReadState } from "./game";
import { initialState, startMatch } from "./simulation";

export function menuItems(s: ReadState): readonly string[] {
  switch (s.screen) {
    case "title":
      return TITLE_ITEMS;
    case "howto":
      return ["BACK TO MENU"];
    case "paused":
      return PAUSE_ITEMS;
    case "matchover":
      return MATCHOVER_ITEMS;
    default:
      return [];
  }
}
export function menuItemRect(s: ReadState, index: number): MenuRect | null {
  if (!Number.isInteger(index) || index < 0 || index >= menuItems(s).length)
    return null;
  if (s.screen === "title")
    return { x: 100, y: 366 + index * 70, w: 368, h: 58 };
  if (s.screen === "howto") return { x: 100, y: 576, w: 310, h: 58 };
  return { x: 450, y: 355 + index * 70, w: 380, h: 58 };
}
function hit(s: ReadState, x: number, y: number): number {
  return menuItems(s).findIndex((_, index) => {
    const r = menuItemRect(s, index);
    return (
      r !== null && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
    );
  });
}
export function returnTitle(s: ReadState): CaromState {
  return {
    ...initialState(s.muted),
    simTime: s.simTime,
    titleIndex: s.titleIndex,
    menuIndex: s.titleIndex,
  };
}
function confirm(s: ReadState): CaromState {
  if (s.screen === "title") {
    const next = { ...s, titleIndex: s.menuIndex, menuPresses: {} };
    if (s.menuIndex === 2) return { ...next, screen: "howto", menuIndex: 0 };
    return startMatch(next, s.menuIndex === 1 ? "versus" : "solo");
  }
  if (s.screen === "howto") return returnTitle(s);
  if (s.screen === "paused") {
    if (s.menuIndex === 0)
      return { ...s, screen: s.resumeScreen, menuPresses: {} };
    if (s.menuIndex === 1) return startMatch(s, s.mode);
    return returnTitle(s);
  }
  if (s.screen === "matchover")
    return s.menuIndex === 0 ? startMatch(s, s.mode) : returnTitle(s);
  return s;
}

export function readControls(state: ReadState, api: UpdateApi): CaromState {
  // Read all edges once. Their meaning is decided by the screen we began on.
  const edges = Object.fromEntries(
    ACTIONS.map((a) => [a, api.input.pressed(a)]),
  );
  const samples = api.input.pointerSamples();
  const contacts = api.input.pointerContacts();
  let s: CaromState = {
    ...state,
    muted: edges.mute ? !state.muted : state.muted,
  };
  if (state.screen === "countdown" || state.screen === "playing") {
    if (edges.pause)
      s = {
        ...s,
        resumeScreen: state.screen,
        screen: "paused",
        menuIndex: 0,
        menuPresses: {},
      };
    return s;
  }
  if (state.screen === "paused" && (edges.pause || edges.back))
    return { ...s, screen: s.resumeScreen, menuPresses: {} };
  if ((state.screen === "howto" || state.screen === "matchover") && edges.back)
    return returnTitle(s);
  const count = menuItems(s).length;
  const up = edges["p1-up"] || edges["p2-up"];
  const down = edges["p1-down"] || edges["p2-down"];
  const keyboardConfirm = !up && !down && edges.confirm;
  if (up) s = { ...s, menuIndex: (s.menuIndex + count - 1) % count };
  else if (down) s = { ...s, menuIndex: (s.menuIndex + 1) % count };
  // A keyboard confirmation wins over pointer confirmations in the same frame.
  if (keyboardConfirm) return confirm(s);
  const presses = { ...s.menuPresses };
  let pointerConfirm = false;
  for (const sample of samples) {
    const index = hit(s, sample.x, sample.y);
    if (index >= 0) s = { ...s, menuIndex: index };
    if (sample.type === "down" && sample.button === "primary")
      presses[sample.id] = index;
    if (sample.type === "up") {
      if (index >= 0 && presses[sample.id] === index) pointerConfirm = true;
      delete presses[sample.id];
    }
  }
  for (const contact of contacts) {
    const index = hit(s, contact.x, contact.y);
    if (index >= 0) s = { ...s, menuIndex: index };
  }
  s = { ...s, menuPresses: presses };
  return pointerConfirm ? confirm(s) : s;
}
