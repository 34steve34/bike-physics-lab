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
The imported source files and equations are unmodified. Adapter tuning is
described below. See [provenance](vendor/UPSTREAM.md).
This is a test of that reconstruction, not a claim of exact fidelity to the
original Android game. This project includes no original game art or audio. Hills / video is an
approximate numeric track reconstruction from a user-supplied recording.
The new track geometry, renderer, browser input and adapter are separate.

Reference ticks run at 60 Hz, each subdivided into six steps below 3 ms, retaining
the upstream physics phase order and its front-contact lean gate. Display refresh
does not change the tick rate. A background tab pauses rather than catching up.
No reverse, crash debris, saved progression, track editor or variable throttle yet.

## Agility tuning and retained best runs (v0.1.13)

Regular lean response is now 0.9, ten percent below the previous Regular.
Acro is 1.1, ten percent above the previous Regular (previous Acro was 1.5).
Engine, suspension and crash rules are unchanged. New physics groups keep old
times separate. The five fastest distinct finishes now retain their control
recordings in this browser. Open Times and tap Replay beside a saved time, even
after reopening the app. Repeated controls are compressed without rounding lean.
Existing time-only records cannot recover missing controls. Storage is local,
not synced; blocked/full storage falls back to the current visit with a notice.

## Crash dissolve and personal-best celebration (v0.1.12)

The app opens on Hills / video with its eight-unit view.

A crash freezes the C simulation, briefly separates/fades the existing bike
drawing over 0.65 seconds, then shows Retry. Restart skips the effect. A new
fastest live finish gets a small confetti burst and a highlighted result card;
replays, ties and slower finishes do not celebrate. Reduced-motion preference
shows results immediately without these animations. Physics, timing, crash
rules and saved records are unchanged.

## Longer vertical Hills entry (v0.1.11)

The bend below the Hills loop now reaches vertical sooner, followed by 0.85
units of straight vertical track before the approach ends. The loop entrance,
approach endpoint and exit platform remain aligned at x=15.2; the loop itself
has not moved. This follows the user-annotated reference, providing a straight
section for the bike to settle before jumping across the gap to the upper lip.
The approach is a smooth monotonic curve with a vertical tangent at the join.
Engine, springs, gravity and original crash rules remain unchanged. Hills has
a new map ID for its own times; other maps retain their existing records.

## Another 10% engine reduction (v0.1.10)

Both bikes now use 90% of v0.1.9 engine pull: drive 15.2 becomes 13.68,
and high-speed power 41.8 becomes 37.62. That is 85.5% of the imported
defaults. Gravity, suspension, braking and crash rules stay the same. Native
checks compare the new tuning directly against the preceding 95% settings.
A new rules ID starts separate fast-time lists; older records remain stored
and are not mixed with this slower tuning.

## Restored crash rules and saved fast times (v0.1.9)

The adapter again calls the imported `br_bike_head_hits` rule. Track crossing
an upper-to-front or upper-to-rear connection crashes the bike, as does proximity
to the upper point. Wheel-to-wheel crossing alone still is not a rider crash.
This restores the reconstruction's original rules, not a newly inferred rule
for the commercial game. Start lock, finish rules and the 95% drive tuning stay.

**Times** shows the five fastest distinct finishes for the selected map and bike;
the HUD shows the best. Successful live rides count; crashes and replays do not.
Times persist locally in this browser, across reloads and app updates. They do
not sync between phones/browsers and clearing site data removes them. If storage
is blocked or full, a notice explains that times last only for the current visit.
Stable map and rules IDs separate records; future geometry/physics changes should
use a new ID so incomparable times do not mix. Earlier runs were not recorded.

## Gentler drive and clearer scenery (v0.1.8)

Regular and Acro now use 95% of the previous low-speed drive and high-speed
power settings: drive 16 becomes 15.2, and drive cap 44 becomes 41.8. These are
applied to a fresh private definition on every restart; vendor data remains
unchanged. Drive cap tapers acceleration at higher wheel speeds, rather than
clamping the bike to a fixed maximum speed. This is a small reduction in engine
pull, not a guarantee of exactly 5% lower speed in every situation. Native
checks compare early acceleration and sustained flat-ground pull with the
original settings and verify the reduction does not compound on restart.

The background has a brighter sky and two clearly separated ridges. The nearer
ridge moves four times faster than the distant one. Ridge points are anchored
to world positions, so crossing a repeat boundary does not change their shape.

## Point contacts and start lock (v0.1.7; crash change reverted in v0.1.9)

The two wheels and upper physics mass define three contact points with their
existing contact radii. Terrain may cross their connecting lines and pass
through the visible artwork without causing a crash. The browser adapter now
uses only proximity to the upper point for rider crashes, removing the imported
core's additional upper-to-wheel edge intersection tests. Wheel contact forces,
springs, damping and the upper-point kill distance remain unchanged. Imported
vendor files remain byte-for-byte copies; this rule lives in the adapter.

Before the first gas or brake press, lean is ignored and the clock stays at
zero. The first press enables lean and timing together; Restart relocks both.
Native tests cover lines crossing the bike between masses, upper-point crashes,
separate wheel contacts, hard front-wheel-first impacts that crash through
upper-point contact, the start lock and first gas/brake activation. Browser
tests compare pre-start full lean in either direction against a neutral pose.

## Race clock and finish (v0.1.6)

The race clock stays at zero until the first gas or brake input. Releasing both
controls keeps the clock running; Restart clears it. Tilt alone does not start
it or move the bike. Waiting still allows the physical bike to settle.

A race finishes when the upper physics point is both right of the flag and
above the finish ground. Either condition may become true first: passing below
the flag then rising on the far side counts. Each course uses its actual finish
ground height. The visible helmet and wheel positions do not determine the
finish. Crashes show a retry without a finishing time.

## Video reconstruction (v0.1.4)

Select **Hills / video** for the first full course reconstructed from a recorded
run: steep launch, twenty descending steps, valley, open three-quarter loop,
second launch, landing platform, bowl and final jump. The loop has a genuine
lower-right opening; all its boards use the same ordinary collision rules.
There is no lane switch on this course. The short unseen start and long straight
lengths obscured by camera motion are estimates, so this is a playable first
pass rather than an exact map export. The reference recording is not published.

Physics constants and equations are unchanged. Native C and browser Wasm both
verify a scripted full ride, including inverted inside-loop contact, the left
wall, loop exit, bowl contact and finish. The script supplies gas and tilt only;
there is no assistance in ordinary play. Use tilt to settle the staircase and
prepare for landings. The finish flag now uses each course's actual height.

## Body drawing and larger drop (v0.1.3)

The frame and rider now follow the upper physics mass, while wheel hubs remain
at their own masses. This reveals suspension movement that the former drawing
hid. The visible helmet sits above the actual upper crash point; enable the
three-point overlay to inspect it. Spring, damping, gravity and controls are
unchanged.

Air drop now has a 3.6-unit platform, twice the previous height, with a long flat
landing and a wider default view. This creates a stronger landing for evaluating
suspension and one-wheel impacts.

## Loop course (v0.1.2)

The loop is an open spiral with a nominal radius of 1.8, increased from 0.65.
Its exit is 0.8 units below its entrance, leaving room for the rider. The return
crosses the approach as a bridge: the rider uses the underpass on approach and
the upper lane during the lap. Collision selection follows that lane, without
altering gravity, velocity, lean, springs or bike position. The foreground bridge
occludes an approaching rider so the crossing is visible.

Both Regular and Acro are tested from spawn with gas held and neutral tilt.
Passing requires an approach under the bridge, inverted wheel contact on the
ceiling, wheel contact on the left wall, a full turn, and a finish on the lower
exit. The same run is checked in native C and WebAssembly. Crashing does not
count as completing the loop.

Both bikes retain upstream gravity of -4 game units per second squared. There
is no separate microgravity mode or added track-attraction force. The upstream
wheel-contact spring/damping response is retained.

## Build and verification

GitHub Actions uses pinned Emscripten 4.0.15 to compile the C core to WebAssembly.
It runs native C rest/drive/control/stability checks and compares native and Wasm
snapshots for ten track/bike combinations, plus exact replay checks.
Loop comparisons cover a complete ride through the entrance, ceiling and exit.
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
