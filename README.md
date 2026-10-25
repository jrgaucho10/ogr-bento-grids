# OGR Bento Grids

A bento layout generator for **Adobe Illustrator** — generate bento grids from a rectangle, tune with live sliders, shuffle for new arrangements, and finalise to plain editable shapes.

Built as a CEP panel (HTML/CSS/JS) with an ExtendScript host. Layout math is a small, dependency-free library shared with a browser preview and Node tests.

## Install (macOS)

1. Make sure Illustrator is **quit**.
2. Double-click **`install.command`** (or run `./install.command` in Terminal).
3. Reopen Illustrator.
4. Open **Window → Extensions → OGR Bento Grids**.

To remove it, double-click **`uninstall.command`**.

## Install (Windows)

1. Extract the zip.
2. Make sure Illustrator is completely closed.
3. Open the extracted folder and double-click **`install.bat`**.
4. Reopen Illustrator.
5. Open **Window → Extensions → OGR Bento Grids**.

To uninstall, quit Illustrator and run **`uninstall.bat`**.

## Requirements

- Adobe Illustrator 2021 (25.x) or newer.
- macOS or Windows.
- CEP 9+.
- No network access, no external dependencies, no build step.

## Using the panel

- Draw a rectangle in Illustrator, select it.
- Pick a style: Simple, Centered, Brick, Random.
- Tune sections (tile count), corners (radius), gutter (spacing).
- Click **Generate grid** (or ⌘↵) to draw the grid as rectangles on an `OGR Bento / Grid` layer.
- **Shuffle** for a new arrangement with the same settings.
- **Finalise** flattens/renames to `OGR Bento / Final`.
- **Clear** removes all OGR Bento layers.
- **Guides** converts the last grid's paths into Illustrator guides.

Settings persist across sessions via `localStorage`.

## Development

```bash
node test/geometry.test.mjs
python3 -m http.server 4175 --bind 127.0.0.1
```

## License

MIT
