# bun-matrix

Matrix-style “rain” TUI (like in the movie). Runs in the terminal with green falling characters.

## Features

- **Katakana** (Unicode block U+30A0–U+30FF) as the main character set
- **Numbers + ASCII symbols** mixed in
- **Per-column brightness**: each column uses a dim, normal, or bright green shade
- **One leading bright glyph** per column (the head of each drop)
- **Slight random character mutation** each frame so the stream isn’t static

## Install

```bash
bun install
```

## Run

```bash
bun run index.ts
# or
bun run start
```

From another project (after linking or publishing):

```bash
bunx bun-matrix
```

## Usage

- Run in a terminal (TTY). Non-TTY environments will exit with an error.
- **Ctrl+C** exits and restores the cursor.
- Resize the terminal; columns and drops will re-initialize on resize.
- For best effect, use a **bold or heavy monospace** font (e.g. JetBrains Mono Bold, Fira Code Bold, or a pixel/bitmap font) so the characters look chunky; the app uses bold SGR and screenshot-style greens.

## Tech

- Pure TypeScript, no extra TUI deps
- ANSI escape codes for cursor, colors, and 256-color green shades
- Built for [Bun](https://bun.sh)
