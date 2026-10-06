#!/usr/bin/env node
// Check for the pen-tip filter. OneEuro must reject landmark jitter when the
// hand is still (the "pen wobbles on the page" symptom) without adding visible
// lag when the hand moves fast (the "pen trails my finger" symptom). A fixed
// moving average fails the second half; raw landmarks fail the first.
//
//   node scripts/one-euro.mjs

import { OneEuro } from '../src/lib/oneEuro.ts';

const DT = 33.3; // ms, ~30fps MediaPipe frame
const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exit(1);
  }
  console.log('ok - ' + msg);
};
const sd = (a) => {
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length);
};
// Deterministic ±2px noise so the run is reproducible.
const noise = () => {
  let seed = 42;
  return () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5) * 4;
};

// Still hand: output must be markedly steadier than the raw landmarks.
{
  const rand = noise();
  const raw = Array.from({ length: 200 }, () => 100 + rand());
  const f = new OneEuro();
  const out = raw.map((r) => f.filter(r, DT));
  const jitRaw = sd(raw.slice(100));
  const jitOut = sd(out.slice(100));
  assert(
    jitOut < jitRaw * 0.5,
    `still hand: jitter ${jitRaw.toFixed(2)}px -> ${jitOut.toFixed(2)}px (at least halved)`
  );
}

// Fast sweep (20px per frame = 600px/s): the filtered tip must stay within
// ~1.5 frames of the raw tip, i.e. no visible trailing.
{
  const f = new OneEuro();
  let lag = 0;
  for (let i = 0; i < 200; i++) {
    const r = 100 + i * 20;
    lag = Math.abs(f.filter(r, DT) - r);
  }
  assert(lag / 20 < 1.5, `fast sweep: lag ${(lag / 20).toFixed(2)} frames < 1.5 frames`);
}

// reset() must drop history so a new stroke starts on the raw tip.
{
  const f = new OneEuro();
  for (let i = 0; i < 30; i++) f.filter(500, DT);
  f.reset();
  assert(f.filter(100, DT) === 100, 'after reset the first sample passes through unchanged');
}

// Degenerate dt (a stalled tab) must not produce NaN/Infinity.
{
  const f = new OneEuro();
  f.filter(100, DT);
  assert(Number.isFinite(f.filter(140, 0)), 'dt=0 yields a finite value');
}