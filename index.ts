#!/usr/bin/env bun
/**
 * Matrix-style rain TUI
 * - Halfwidth Katakana + numbers + ASCII (single-cell, no jitter)
 * - Screenshot colors: dim trail, bright lime rain, pale luminous leader at bottom
 * - Bold for chunkier look; use a heavy/bold monospace font in terminal for best effect
 * - Tight vertical columns; symbols stay fixed as they fall (position only changes)
 */

const ESC = "\x1b";
const RESET = `${ESC}[0m`;
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;
const CLEAR = `${ESC}[2J`;
const HOME = `${ESC}[H`;

// Halfwidth Katakana (U+FF66–U+FF9F) = 1 column wide, no left/right jitter
const HALFWIDTH_KATAKANA_START = 0xff66;
const HALFWIDTH_KATAKANA_END = 0xff9f;
const halfwidthKatakana: string[] = [];
for (let cp = HALFWIDTH_KATAKANA_START; cp <= HALFWIDTH_KATAKANA_END; cp++) {
  halfwidthKatakana.push(String.fromCodePoint(cp));
}

const NUMBERS = "0123456789";
const SYMBOLS = "@#$%&*+-=";
const ASCII_EXTRA = NUMBERS + SYMBOLS;

const POOL: string[] = [...halfwidthKatakana];
for (const c of ASCII_EXTRA) POOL.push(c);

// True color from screenshot: black bg, dim trail #006600, main rain #00FF40, leader #E0FFE0
const rgb = (r: number, g: number, b: number) => `${ESC}[1;38;2;${r};${g};${b}m`;
const GREEN_DIM = rgb(0, 64, 0);       // #004000 (darker than #006600 for trail top)
const GREEN_MID = rgb(0, 102, 0);     // #006600 dim green
const GREEN_MAIN = rgb(0, 224, 0);    // #00E000 bright lime
const GREEN_LEAD = rgb(224, 255, 224); // #E0FFE0 pale luminous (leader at bottom)

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function pickFromPool(): string {
  return POOL[randomInt(POOL.length)]!;
}

interface Column {
  y: number;       // bottom of drop (head position in row units)
  length: number;
  speed: number;
  remainder: number;
  chars: string[];
}

/** Bright leader at bottom of column; trail fades from dim (top) to main green toward bottom. */
function greenSgr(distFromBottom: number, trailLength: number, isLead: boolean): string {
  if (isLead) return GREEN_LEAD; // leader at bottom = pale luminous
  const t = trailLength > 1 ? distFromBottom / (trailLength - 1) : 0;
  if (t >= 0.5) return GREEN_MAIN;
  if (t >= 0.2) return GREEN_MID;
  return GREEN_DIM;
}

function run(): void {
  const stdout = process.stdout;
  if (!stdout.isTTY) {
    console.error("Not a TTY. Run in a terminal.");
    process.exit(1);
  }

  let cols = stdout.columns;
  let rows = stdout.rows;
  const columns: Column[] = [];

  function initColumns(): void {
    columns.length = 0;
    for (let x = 0; x < cols; x++) {
      const len = 5 + randomInt(rows);
      columns.push({
        y: -randomInt(rows * 2) - 5,
        length: len,
        speed: 0.15 + Math.random() * 0.45,
        remainder: 0,
        chars: Array.from({ length: len + 5 }, () => pickFromPool()),
      });
    }
  }

  initColumns();

  process.on("resize", () => {
    cols = stdout.columns;
    rows = stdout.rows;
    initColumns();
  });

  // Raw mode: no echo, catch Ctrl+C
  const tty = stdout as NodeJS.WriteStream & { setRawMode?: (mode: boolean) => void };
  if (typeof tty.setRawMode === "function") {
    tty.setRawMode(true);
  }

  process.on("SIGINT", exit);
  process.on("SIGTERM", exit);
  function exit(): void {
    if (typeof tty.setRawMode === "function") tty.setRawMode(false);
    stdout.write(SHOW_CURSOR + RESET + "\n");
    process.exit(0);
  }

  stdout.write(HIDE_CURSOR + CLEAR + HOME);

  const screen: string[][] = [];
  for (let r = 0; r < rows; r++) {
    screen[r] = [];
    for (let c = 0; c < cols; c++) screen[r]![c] = " ";
  }

  const tick = (): void => {
    // Clear cells that will be redrawn (per-column trails)
    for (let x = 0; x < cols; x++) {
      const col = columns[x]!;
      const trailEnd = Math.min(col.y + 1, rows);
      const trailStart = Math.max(0, col.y - col.length);
      for (let r = trailStart; r < trailEnd; r++) {
        if (r >= 0 && r < rows) screen[r]![x] = " ";
      }
    }

    for (let x = 0; x < cols; x++) {
      const col = columns[x]!;
      col.remainder += col.speed;
      const dy = Math.floor(col.remainder);
      col.remainder -= dy;
      col.y += dy;

      // Respawn column when it falls off the bottom (new fixed symbols for the trail)
      if (col.y > rows + col.length + 2) {
        col.y = -randomInt(rows) - 2;
        col.length = 5 + randomInt(rows);
        col.chars = Array.from({ length: col.length + 5 }, () => pickFromPool());
      }

      const headRow = Math.floor(col.y);
      const topOfDrop = headRow - col.length;
      for (let r = Math.max(0, topOfDrop); r <= Math.min(rows - 1, headRow); r++) {
        const dist = headRow - r; // 0 at bottom of drop, col.length at top
        const isLead = dist === 0; // bright leader at bottom of column
        const charIndex = dist % col.chars.length;
        const ch = col.chars[charIndex] ?? pickFromPool();
        const sgr = greenSgr(dist, col.length, isLead);
        if (r >= 0 && r < rows) {
          screen[r]![x] = sgr + ch + RESET;
        }
      }
    }

    let buf = HOME;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = screen[r]![c];
        buf += cell === " " ? " " : cell;
      }
      if (r < rows - 1) buf += "\n";
    }
    stdout.write(buf);
  };

  setInterval(tick, 50);
}

run();
