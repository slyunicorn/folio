// A port of the parts of libnoise 1.0.0 that worms.cpp uses: gradient
// coherent noise, the Perlin module, and integer value noise.
//
// libnoise is Copyright (C) 2003, 2004 Jason Bevins, LGPL-2.1.
//
// The arithmetic follows the C++ step for step, including 32-bit integer
// wraparound (via Math.imul and |0), so the results match the native library.

import { RANDOM_VECTORS } from "./vectortable";

export const PI = 3.1415926535897932385;

const X_NOISE_GEN = 1619;
const Y_NOISE_GEN = 31337;
const Z_NOISE_GEN = 6971;
const SEED_NOISE_GEN = 1013;
const SHIFT_NOISE_GEN = 8;

const linearInterp = (n0: number, n1: number, a: number) =>
  (1.0 - a) * n0 + a * n1;

const sCurve3 = (a: number) => a * a * (3.0 - 2.0 * a);

// (int)x in C++ truncates toward zero.
const toInt = (x: number) => Math.trunc(x) | 0;

function makeInt32Range(n: number): number {
  if (n >= 1073741824.0) {
    return 2.0 * (n % 1073741824.0) - 1073741824.0;
  } else if (n <= -1073741824.0) {
    return 2.0 * (n % 1073741824.0) + 1073741824.0;
  }
  return n;
}

function gradientNoise3D(
  fx: number, fy: number, fz: number,
  ix: number, iy: number, iz: number,
  seed: number,
): number {
  let vectorIndex =
    (Math.imul(X_NOISE_GEN, ix) +
      Math.imul(Y_NOISE_GEN, iy) +
      Math.imul(Z_NOISE_GEN, iz) +
      Math.imul(SEED_NOISE_GEN, seed)) | 0;
  vectorIndex ^= vectorIndex >> SHIFT_NOISE_GEN;
  vectorIndex &= 0xff;

  const xvGradient = RANDOM_VECTORS[vectorIndex << 2];
  const yvGradient = RANDOM_VECTORS[(vectorIndex << 2) + 1];
  const zvGradient = RANDOM_VECTORS[(vectorIndex << 2) + 2];

  const xvPoint = fx - ix;
  const yvPoint = fy - iy;
  const zvPoint = fz - iz;

  return (
    (xvGradient * xvPoint + yvGradient * yvPoint + zvGradient * zvPoint) * 2.12
  );
}

// QUALITY_STD (cubic s-curve) is the only quality worms.cpp uses.
function gradientCoherentNoise3D(
  x: number, y: number, z: number, seed: number,
): number {
  const x0 = x > 0.0 ? toInt(x) : toInt(x) - 1;
  const x1 = x0 + 1;
  const y0 = y > 0.0 ? toInt(y) : toInt(y) - 1;
  const y1 = y0 + 1;
  const z0 = z > 0.0 ? toInt(z) : toInt(z) - 1;
  const z1 = z0 + 1;

  const xs = sCurve3(x - x0);
  const ys = sCurve3(y - y0);
  const zs = sCurve3(z - z0);

  let n0, n1, ix0, ix1;
  n0 = gradientNoise3D(x, y, z, x0, y0, z0, seed);
  n1 = gradientNoise3D(x, y, z, x1, y0, z0, seed);
  ix0 = linearInterp(n0, n1, xs);
  n0 = gradientNoise3D(x, y, z, x0, y1, z0, seed);
  n1 = gradientNoise3D(x, y, z, x1, y1, z0, seed);
  ix1 = linearInterp(n0, n1, xs);
  const iy0 = linearInterp(ix0, ix1, ys);
  n0 = gradientNoise3D(x, y, z, x0, y0, z1, seed);
  n1 = gradientNoise3D(x, y, z, x1, y0, z1, seed);
  ix0 = linearInterp(n0, n1, xs);
  n0 = gradientNoise3D(x, y, z, x0, y1, z1, seed);
  n1 = gradientNoise3D(x, y, z, x1, y1, z1, seed);
  ix1 = linearInterp(n0, n1, xs);
  const iy1 = linearInterp(ix0, ix1, ys);

  return linearInterp(iy0, iy1, zs);
}

function intValueNoise3D(x: number, y: number, z: number, seed: number): number {
  let n =
    (Math.imul(X_NOISE_GEN, x) +
      Math.imul(Y_NOISE_GEN, y) +
      Math.imul(Z_NOISE_GEN, z) +
      Math.imul(SEED_NOISE_GEN, seed)) &
    0x7fffffff;
  n = (n >> 13) ^ n;
  const inner = (Math.imul(Math.imul(n, n), 60493) + 19990303) | 0;
  return (Math.imul(n, inner) + 1376312589) & 0x7fffffff;
}

/** noise::ValueNoise3D: a value in [-1, 1] for an integer lattice point. */
export function valueNoise3D(x: number, y: number, z: number, seed = 0): number {
  return 1.0 - intValueNoise3D(x, y, z, seed) / 1073741824.0;
}

export interface PerlinOptions {
  seed?: number;
  frequency?: number;
  lacunarity?: number;
  octaveCount?: number;
  persistence?: number;
}

/** noise::module::Perlin with QUALITY_STD. */
export class Perlin {
  seed: number;
  frequency: number;
  lacunarity: number;
  octaveCount: number;
  persistence: number;

  constructor({
    seed = 0,
    frequency = 1.0,
    lacunarity = 2.0,
    octaveCount = 6,
    persistence = 0.5,
  }: PerlinOptions = {}) {
    this.seed = seed;
    this.frequency = frequency;
    this.lacunarity = lacunarity;
    this.octaveCount = octaveCount;
    this.persistence = persistence;
  }

  getValue(x: number, y: number, z: number): number {
    let value = 0.0;
    let curPersistence = 1.0;

    x *= this.frequency;
    y *= this.frequency;
    z *= this.frequency;

    for (let curOctave = 0; curOctave < this.octaveCount; curOctave++) {
      const nx = makeInt32Range(x);
      const ny = makeInt32Range(y);
      const nz = makeInt32Range(z);

      const seed = (this.seed + curOctave) | 0;
      const signal = gradientCoherentNoise3D(nx, ny, nz, seed);
      value += signal * curPersistence;

      x *= this.lacunarity;
      y *= this.lacunarity;
      z *= this.lacunarity;
      curPersistence *= this.persistence;
    }

    return value;
  }
}
