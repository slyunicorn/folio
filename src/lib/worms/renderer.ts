// WebGL renderer for the worms, matching worms.cpp's fixed-function setup:
// textured triangle strips, alpha blending, a mipmapped texture that repeats
// along the worm and clamps across it, and the same clear colour.

import { TEXTURE_HEIGHT, TEXTURE_WIDTH, decodeTexture, type Worm } from "./worms";

export const CLEAR_COLOR: [number, number, number] = [0.1, 0.15, 0.3];

const VERTEX_SHADER = `
attribute vec2 aPosition;
attribute vec2 aTexCoord;
uniform vec2 uScale;
varying vec2 vTexCoord;
void main() {
  vTexCoord = aTexCoord;
  gl_Position = vec4(aPosition * uScale, 0.0, 1.0);
}`;

// The texture coordinate along a worm runs up to the segment count (~110),
// so it needs highp to keep the repeated texture from banding.
const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uTexture;
varying vec2 vTexCoord;
void main() {
  gl_FragColor = texture2D(uTexture, vTexCoord);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "shader compile failed");
  }
  return shader;
}

export class WormRenderer {
  private gl: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;
  private scaleLocation!: WebGLUniformLocation;
  private vertices = new Float32Array(0);

  /** Throws if WebGL is unavailable. */
  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: true,
      preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error("WebGL is not available");
    this.gl = gl;
    this.canvas = canvas;
    this.init();
  }

  /** (Re)creates GPU resources; also used after a lost context is restored. */
  init(): void {
    const gl = this.gl;

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "program link failed");
    }
    gl.useProgram(program);
    this.scaleLocation = gl.getUniformLocation(program, "uScale")!;

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    const position = gl.getAttribLocation(program, "aPosition");
    const texCoord = gl.getAttribLocation(program, "aTexCoord");
    gl.enableVertexAttribArray(position);
    gl.enableVertexAttribArray(texCoord);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, 16, 8);

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, TEXTURE_WIDTH, TEXTURE_HEIGHT, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, decodeTexture(),
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(...CLEAR_COLOR, 1.0);
  }

  /** Matches the canvas's backing store to its CSS size. */
  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.gl.viewport(0, 0, width, height);

    // worms.cpp maps x to [-1, 1] and keeps the aspect ratio. Here the longer
    // side spans [-1, 1], so portrait screens are covered too; on landscape
    // screens this is the same as the original.
    if (width >= height) {
      this.gl.uniform2f(this.scaleLocation, 1.0, width / height);
    } else {
      this.gl.uniform2f(this.scaleLocation, height / width, 1.0);
    }
  }

  draw(worms: Worm[]): void {
    const gl = this.gl;
    if (gl.isContextLost()) return;

    const floats = worms.reduce((n, w) => n + w.vertexCount * 4, 0);
    if (this.vertices.length < floats) this.vertices = new Float32Array(floats);

    let offset = 0;
    for (const worm of worms) offset += worm.writeStrip(this.vertices, offset);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices.subarray(0, offset), gl.DYNAMIC_DRAW);

    let first = 0;
    for (const worm of worms) {
      gl.drawArrays(gl.TRIANGLE_STRIP, first, worm.vertexCount);
      first += worm.vertexCount;
    }
  }
}
