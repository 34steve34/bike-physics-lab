# Physics provenance

Source: https://github.com/franciscoclou/bikerace-vita

Commit: a697be26244cddfb294f147055b7ea0eb5c04fc6 (v1.1)

Author: Francisco Lourenço. The upstream MIT license is included at repository root.
Files under `vendor/bikerace-vita/` are copied byte-for-byte from that commit.
They implement the point masses, springs, geometry, bike constants, collisions,
drive/brake and angular-momentum lean response. No original game assets are included.

`src/lab.c` is a new browser adapter, not a copy of the entire Vita application.
It follows the upstream game's physics phase order and its 3 ms substep ceiling.
It runs the 60 Hz reference cadence independent of display refresh rate.
Original test tracks are searched conservatively rather than using the upstream
level-loader/broad-phase index; crash states freeze rather than animating debris;
braking does not auto-engage reverse. The original level geometry, graphics,
menus, sounds, replays and progression have not been ported.

This evaluates the published reconstruction, not a verified exact replica of
any particular Android release. Matching BR's feel remains a hands-on check.
