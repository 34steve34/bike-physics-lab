# Bike Physics Lab

An installable mobile browser prototype for evaluating bike handling.

Play: https://34steve34.github.io/bike-physics-lab/

## Phone controls

Use Chrome on Android. Hold landscape, charging port on the right. Tap **Ride**,
allow motion if asked, then tap **Zero tilt** while holding your neutral position.
Hold the right half of the play area for gas; hold the left half for brake.
Lower the left side of your phone to raise the front wheel. If your device reports
the opposite direction, enable **Reverse tilt direction** in Settings.

Start with **Flat / wheelies**, then try **Ramps / jumps**, **Loop**, and **Air drop**.
Regular and Acro are selectable in Settings; full lean at 30 degrees is the reference.
The meter at the bottom shows the control input. No gyro integration or automatic
drift correction is applied. Use Chrome's **Add to Home screen / Install app** for
a standalone experience. Offline files are cached after the first successful load;
reopen once online before relying on offline use.

Keyboard: Up/Space gas, Down brake, Left/Right lean, R restart. W/A/S/D also work.
Crash/finish freezes the bike. **Replay** reruns the recorded control inputs.
**Save run for feedback** downloads a JSON file locally; nothing is uploaded.

## Physics source and limits

The C core comes from Francisco Lourenço's MIT-licensed
[Bike Race Vita reconstruction](https://github.com/franciscoclou/bikerace-vita),
commit `a697be26244cddfb294f147055b7ea0eb5c04fc6` (v1.1).
The imported equations and bike constants are unmodified. See [provenance](vendor/UPSTREAM.md).
This is a test of that reconstruction, not a claim of exact fidelity to the
original Android game. This project includes no original game art, audio or tracks.
The new track geometry, renderer, browser input and adapter are separate.

Reference ticks run at 60 Hz, each subdivided into six steps below 3 ms, retaining
the upstream physics phase order and its front-contact lean gate. Display refresh
does not change the tick rate. A background tab pauses rather than catching up.
No reverse, crash debris, saved progression, track editor or variable throttle yet.

## Build and verification

GitHub Actions uses pinned Emscripten 4.0.15 to compile the C core to WebAssembly.
It runs native C rest/drive/control/stability checks and compares native and Wasm
snapshots for eight track/bike combinations, plus exact replay checks.
Only passing builds are pushed to `gh-pages`.

Locally, with Emscripten, a C99 compiler and Node installed:

```sh
npm run check
bash scripts/build.sh
npm run serve
```

Repository Settings → Pages: deploy from branch **gh-pages**, folder **/(root)**.
Build output is in `dist/` and is not committed on main.

## Credits

Copyright (c) 2026 Francisco Lourenço for the imported C core; MIT license retained
in [LICENSE](LICENSE). New prototype code is also MIT licensed.
Bike Race and associated names belong to their respective owners. This is an
independent experimental testbed.
