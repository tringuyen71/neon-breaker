[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/tringuyen71/neon-breaker/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/tringuyen71/neon-breaker/reward.svg)](https://make.fun/bounty/best-game-01)

# Neon Breaker

A polished neon Breakout arcade game, built for the [make.fun "Make the best game" bounty](https://make.fun/bounty/best-game-01).

Bounce the ball off the paddle, break every brick, chain the combo, and don't
drop the ball. Five hand-built levels, then endless generated ones that get
faster and denser. Power-ups drop from broken bricks: **W** wide paddle,
**M** multiball, **L** laser, **S** slow ball. Explosive bricks chain into
their neighbours; metal bricks never break.

## Play

Open `game/index.html` in a desktop browser, or serve the folder:

```sh
node serve.ts
# then open http://localhost:8080
```

- Mouse or `←` `→` / `A` `D` — move the paddle
- `Space` / click — serve the ball, fire the laser when armed
- `P` — pause, `M` — mute, `R` — restart

Everything runs offline: plain HTML, CSS-free canvas and vanilla ES modules,
no libraries, no network requests, no assets. Sound is synthesized live with
WebAudio. The simulation is deterministic — the same seed always plays the
same game — and `?shot=start|play|end&seed=N` stages a repeatable frame for
screenshots.

## Files

- `main.ts` — the program entrypoint: copies `game/` and `screenshots/` to
  the output directory and writes `dossier.json` (`MAKEFUN_OUTPUT_DIR=out node main.ts`)
- `game/index.html` — the game page
- `game/src/` — the game: `config.js`, `random.js` (seeded RNG), `levels.js`,
  `audio.js` (WebAudio synth), `input.js`, `world.js` (rules), `render.js`
  (canvas drawing), `shots.js` (screenshot scenes), `main.js` (loop)
- `screenshots/` — 4 screenshots, first by name is the cover
- `vendor/makefun-game.ts` — the make.fun dossier library (vendored from the kit)

## License

MIT — see [LICENSE](LICENSE).
