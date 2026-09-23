# Route Wrecker

An original Paperboy style, 3/4 isometric arcade destruction vertical slice. A bicycle crosses a designed suburban block, throws newspapers and bowling balls, and earns arcade score separately from fictional property claims. A falling bin can make a driver swerve into a hydrant, whose water slips a resident into a rolling cart, fence, and ornament. Every consequence keeps the original throw's chain ID.

## Run

Requires Node.js 20 or newer. No packages or build step are required.

```sh
npm run dev
```

Open `http://localhost:8080` in a desktop browser. To play on Android, serve on your local network (`PORT=8080 npm run dev`) and open `http://YOUR_COMPUTER_LAN_IP:8080` on the phone or Retroid Pocket 5. For gamepad access, some Android browsers require a secure origin (HTTPS) or a button press on the connected controller. Fullscreen and orientation locking are browser dependent. You can also host these static files with any HTTPS static host; `server.js` is just a development server.

## Controls

| Action | Desktop | Controller | Touch |
| --- | --- | --- | --- |
| Steer / pedal | WASD or arrows | Left stick / D-pad | Left virtual stick |
| Aim independently | Mouse or I J K L | Right stick | Right virtual stick |
| Throw | Left click or Space | Right trigger | Release right virtual stick |
| Brake / skid | Shift | Left trigger | BRAKE |
| Pedal burst | F | A / south face button | BURST |
| Switch paper / bowling ball | Q / E | Y / north face button or shoulders | SWITCH |
| Pause | Esc / P | Start | Pause button |

The bike maintains forward speed without holding a direction. Ride off the road across sidewalks and driveways and into yards; houses can cause wipeouts. Crashes cost a little time and recover automatically. The route ends after about 2–3 minutes or when the timer expires. Aim at the bin by the first parked car to discover a long chain.

## Structure

- `src/data.js`: authored route and data definitions for 12 object types, two weapons, people and heat thresholds.
- `src/systems.js`: movement, collisions, chain credit, reactive debris, vehicles, water, residents, dogs, scoring and reports.
- `src/render.js`: crisp canvas scene with isometric ground, houses, rider, residents, cars, props and visible broken states. Original temporary art is drawn in code and can be replaced with a sprite atlas.
- `src/game.js`: browser UI, touch sticks, mouse and keyboard, Gamepad API, orientation and fullscreen requests.
- `tests/world.test.js`: deterministic route, movement, causality, scoring and recovery tests.

Run `npm run check` for syntax checks and simulation tests. No external runtime packages are needed.

## Current limitations

This is a web vertical slice, not an Android APK. Pixel art is detailed programmer art, with a fixed set of house variants and no sprite atlas or animation frames yet. Audio, persistence, multiple levels, a real police behavior tree, and device-specific RP5 input calibration remain future work. The browser may decline orientation lock or Gamepad API input on an insecure LAN address; HTTPS hosting is recommended for hardware testing.
