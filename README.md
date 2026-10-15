# Carom

A game of angles. **Carom** is a top-down paddle duel with curved shots, rotating
obstacles, and a quiet, midnight-blue court. Play against the machine in **Solo**
or share a keyboard in **Versus**.

Move through a paddle hit to add spin. Bank shots off the swaying amber obstacles,
defend your goal, and reach 11 points with a two-point lead.

## Run locally

Requires a current Node.js release supported by Vite (Node 22.12+ recommended).

```sh
npm ci
npm run dev
```

Open the local URL Vite prints. Everything is drawn and synthesized in code;
playing requires no account, network service, or downloaded assets.

## Production build

```sh
npm ci
npm run build
```

Serve `dist/` from the root of any static web server. To inspect the production
build locally, run `npm run preview`.

## Controls

| Input | Action |
| --- | --- |
| W / S | Move the left paddle |
| ↑ / ↓ | Move the right paddle in Versus; also move the left paddle in Solo |
| W / S or ↑ / ↓ | Select a menu item |
| Enter / Space | Confirm |
| P / Escape | Pause or resume |
| Escape | Return from instructions or the match result |
| M | Toggle sound |
| Backtick | Toggle engine diagnostics |

Menus also support clicking and tapping. On a touchscreen, the engine displays
two side sliders and menu controls. Audio unlocks on the first interaction.

## Development

```sh
npm run typecheck
npm run lint
npm run format
npm test
```

The Simple 2D engine owns the clock, input, audio, canvas fit, diagnostics, and
draw-command recording. The game's immutable state, simulation, and typed debug
surface are exported from `src/game.ts`. Tests run the actual engine over a Node
canvas and advance counted frames using a constant clock.

Implementation modules:

- `src/simulation.ts`: serving, paddle movement, AI, obstacles, and scoring.
- `src/physics.ts`: sub-stepped spin and collision resolution.
- `src/menus.ts`: keyboard, mouse, and multi-contact menu input and layout.
- `src/debug.ts`: state poses and detached snapshots.
- `src/render.ts`: the complete canvas presentation.

The player-facing description, screenshots, and an engine-recorded rally are in
[`showcase/`](showcase/showcase.md).
