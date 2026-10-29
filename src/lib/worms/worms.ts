// Perlin worms: a port of the libnoise example worms.cpp.
//
// Copyright (C) 2004, 2005 Jason Bevins. GPL-2.0-or-later.
//
// Each worm's shape comes from Perlin noise sampled along a line in noise
// space: every segment turns by an angle taken from the noise value at its
// position. Each frame the sample line shifts slightly, which makes the worm
// slither, and the head moves in the direction the noise points.

import { PI, Perlin, valueNoise3D } from "./noise";

export const WORM_LATERAL_SPEED = 2.0 / 8192.0;
export const WORM_SEGMENT_LENGTH = 1.0 / 64.0;
export const WORM_SEGMENT_COUNT = 112;
export const WORM_SPEED = 3.0 / 2048.0;
export const WORM_THICKNESS = 4.0 / 256.0;
export const WORM_TWISTINESS = 4.0 / 256.0;
export const DEFAULT_WORM_COUNT = 32;

const clamp = (value: number, lo: number, hi: number) =>
  value < lo ? lo : value > hi ? hi : value;

export class Worm {
  headScreenX: number;
  headScreenY: number;
  lateralSpeed = WORM_LATERAL_SPEED;
  segmentCount = WORM_SEGMENT_COUNT;
  segmentLength = WORM_SEGMENT_LENGTH;
  speed = WORM_SPEED;
  thickness = WORM_THICKNESS;
  twistiness = WORM_TWISTINESS;

  private headNoiseX = 7.0 / 2048.0;
  private headNoiseY = 1163.0 / 2048.0;
  private headNoiseZ = 409.0 / 2048.0;
  private noise: Perlin;

  constructor(seed: number, headScreenX: number, headScreenY: number) {
    this.noise = new Perlin({
      seed,
      frequency: 1.0,
      lacunarity: 2.375,
      octaveCount: 3,
      persistence: 0.5,
    });
    this.headScreenX = headScreenX;
    this.headScreenY = headScreenY;
  }

  taperAmount(segment: number): number {
    const halfSegmentCount = this.segmentCount / 2.0;
    const baseTaperAmount = 1.0 - Math.abs(segment / halfSegmentCount - 1.0);
    return Math.sqrt(baseTaperAmount);
  }

  /** Worm::Update: advances the worm by one frame. */
  update(): void {
    const noiseValue = this.noise.getValue(
      this.headNoiseX,
      this.headNoiseY,
      this.headNoiseZ,
    );
    this.headScreenX -= Math.cos(noiseValue * 2.0 * PI) * this.speed;
    this.headScreenY -= Math.sin(noiseValue * 2.0 * PI) * this.speed;

    // Shifting x propagates earlier noise values down the body (slithering);
    // y and z change the shape slightly.
    this.headNoiseX -= this.speed * 2.0;
    this.headNoiseY += this.lateralSpeed;
    this.headNoiseZ += this.lateralSpeed;

    this.headScreenX = clamp(this.headScreenX, -1.0, 1.0);
    this.headScreenY = clamp(this.headScreenY, -1.0, 1.0);
  }

  /** Number of vertices writeStrip emits. */
  get vertexCount(): number {
    return 2 * Math.ceil(this.segmentCount / 2);
  }

  /**
   * Worm::Draw: writes the worm's triangle strip into `out` as
   * (x, y, s, t) per vertex, and returns the number of floats written.
   */
  writeStrip(out: Float32Array, offset: number): number {
    let x = this.headScreenX;
    let y = this.headScreenY;
    let o = offset;

    for (let segment = 0; segment < this.segmentCount; segment++) {
      const noiseValue = this.noise.getValue(
        this.headNoiseX + segment * this.twistiness,
        this.headNoiseY,
        this.headNoiseZ,
      );
      const taper = this.taperAmount(segment) * this.thickness;

      let offsetX = Math.cos(noiseValue * 2.0 * PI);
      let offsetY = Math.sin(noiseValue * 2.0 * PI);
      const normalX = -offsetY * taper;
      const normalY = offsetX * taper;
      offsetX *= this.segmentLength;
      offsetY *= this.segmentLength;

      out[o++] = x + normalX;
      out[o++] = y + normalY;
      out[o++] = segment;
      out[o++] = 0;
      out[o++] = x - normalX;
      out[o++] = y - normalY;
      out[o++] = segment;
      out[o++] = 1;

      // Worm::Draw advances the segment a second time here, so only every
      // other segment becomes a vertex pair. Kept to match the original look.
      ++segment;
      x += offsetX;
      y += offsetY;
    }

    return o - offset;
  }
}

/** The worms as main() sets them up: worm i has seed i and a noise-placed head. */
export function createWorms(count = DEFAULT_WORM_COUNT): Worm[] {
  const worms: Worm[] = [];
  for (let i = 0; i < count; i++) {
    worms.push(
      new Worm(
        i,
        valueNoise3D(i + 1000, i + 2000, i + 3000),
        valueNoise3D(i + 1001, i + 2001, i + 3001),
      ),
    );
  }
  return worms;
}

export const TEXTURE_WIDTH = 16;
export const TEXTURE_HEIGHT = 16;

// 16x16 RGB worm texture in GIMP's C header format, copied from worms.cpp.
const TEXTURE_DATA =
  "?VE`8U)K13Y:1C];2$%:5DQA>'&!@WB*:UQR9EET9%ES8UAP9UMZ>&%[A6Z$>6-Z" +
  "S[6XR[*PIH2\"IXN0HY2>DWR#VL;+TL3,LYZ<QZVNUL\"_L)..NJJXN:>[V<#)R;\"Y" +
  "W\\G,Y-/4P9^3SZ^KZ-K>RJN?S:VMY=/4U[NPW<+![-GCV<\"UX,C&Y-7BZ=K>V\\2^" +
  "W\\F^XL[!R*.6UK:PYM7/RZB:U[R^V;^POY:)SZ^:Y]#/Y=')SZ^:Y]#/Y=')UKBH" +
  "OY*%O9*%K()WPYF+Q)Z+JGUVU[RUO9.\"HW=MN9)\\R)N)MXQVM9!WRIN+QIJ+L8-W" +
  "GG9FJGYNIGMMJ'YMK()PHWIKN9J+HX)GGGI?L8YQL8US@653F7EBJGYJJGUIEVU@" +
  "GGY:F7E9E'18G'I9G'M:E'1;CW->C')6AVE3E'==F7ED<UQ5@6M4EWE5F7Y6DG92" +
  "C'!6AVI5@613AVQ5B6U5@6=6?FA8?F96>V)5@6E6AVY<:UE6:UM1>V90@6E0@6A0" +
  "<U]7=E]7<UE6<%M7=F!7<%M5:5=4:5M7;EI6:UM2;EY29%138E53:UA1:5A0<%]2" +
  "9%E6<%U:;EE;;EA::UE79E548E%39%15:5957U)29E=58E-69EA6<%Y6<%Y6:5E5" +
  "6U)3:UY<=F5A<U]?=F1>:UI:9EA7:5E78E158E-6;EQ89E=69%54:5M6<V189%E6" +
  "4$I/7556;F->;F!?;EY>:UI=;EY=<&%=9%588E-59%55<&!;:5A96TY25DY/5D]0" +
  "/SQ*03],1D-/2$523$)44$-65DI76TY86TQ674Y674Y49EA::5E;64Y2/SQ(/CQ(" +
  ",#%'+C!',#))-#-,-S--.3-./#9//#9./#1-0SM02D%013U,/SA*-S-(+BY%,3!&" +
  "(R-%&Q]$&A]%'B)'(R1()\"5((B-(*2=(*\"9)+\"E)+2M))21%(\"%#'!Y#(\"%$(B)%" +
  "\"A)\"\"A)\"\"1-\"\"A-\"\"A1\"\"A-\"\"Q-\"#!5\"#A5\"#A5\"#Q9\"$AA" +
  "\"&QU$%QM#\"Q-\"\"A-\"" +
  "";

/**
 * Decodes the texture to RGBA, as worms.cpp does with GIMP's HEADER_PIXEL.
 * The top and bottom rows (the worm's edges) are partly transparent, which
 * with mipmapping gives nearly free antialiasing.
 */
export function decodeTexture(): Uint8Array {
  const pixels = new Uint8Array(TEXTURE_WIDTH * TEXTURE_HEIGHT * 4);
  let src = 0;
  let dest = 0;
  const next = () => TEXTURE_DATA.charCodeAt(src++) - 33;

  for (let y = 0; y < TEXTURE_HEIGHT; y++) {
    for (let x = 0; x < TEXTURE_WIDTH; x++) {
      const d0 = next();
      const d1 = next();
      const d2 = next();
      const d3 = next();
      pixels[dest++] = (d0 << 2) | (d1 >> 4);
      pixels[dest++] = ((d1 & 0xf) << 4) | (d2 >> 2);
      pixels[dest++] = ((d2 & 0x3) << 6) | d3;
      pixels[dest++] = y === 0 || y === TEXTURE_HEIGHT - 1 ? 0x40 : 0xff;
    }
  }

  return pixels;
}
