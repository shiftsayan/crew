import { hexToRgbUnit, type HalftoneConfig } from "./halftone";

const VERTEX_SHADER = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_pixel_ratio;
uniform float u_time;
uniform vec3 u_background;
uniform vec3 u_color_a;
uniform vec3 u_color_b;
uniform float u_dot_density;
uniform float u_pattern_angle;
uniform float u_color_balance;
uniform float u_swirl_detail;

const float PI = 3.141592653589793;

mat2 rotate2d(float angle) {
  float sine = sin(angle);
  float cosine = cos(angle);
  return mat2(cosine, -sine, sine, cosine);
}

float hash21(vec2 point) {
  point = fract(point * vec2(123.34, 345.45));
  point += dot(point, point + 34.345);
  return fract(point.x * point.y);
}

float value_noise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  vec2 curve = local * local * (3.0 - 2.0 * local);
  float bottom = mix(
    hash21(cell),
    hash21(cell + vec2(1.0, 0.0)),
    curve.x
  );
  float top = mix(
    hash21(cell + vec2(0.0, 1.0)),
    hash21(cell + vec2(1.0, 1.0)),
    curve.x
  );
  return mix(bottom, top, curve.y);
}

vec2 octave_step(vec2 point) {
  return mat2(1.6, 1.2, -1.2, 1.6) * point + vec2(7.17, 3.91);
}

float fbm(vec2 point, float detail) {
  float value = 0.5 * value_noise(point);
  float normalization = 0.5;
  point = octave_step(point);
  value += 0.25 * value_noise(point);
  normalization += 0.25;

  point = octave_step(point);
  float octave_three = smoothstep(0.0, 1.0, detail);
  value += 0.125 * octave_three * value_noise(point);
  normalization += 0.125 * octave_three;

  point = octave_step(point);
  float octave_four = smoothstep(1.0, 3.0, detail);
  value += 0.0625 * octave_four * value_noise(point);
  normalization += 0.0625 * octave_four;

  point = octave_step(point);
  float octave_five = smoothstep(3.0, 5.0, detail);
  value += 0.03125 * octave_five * value_noise(point);
  normalization += 0.03125 * octave_five;
  return value / normalization;
}

void main() {
  vec2 point = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
  float detail = clamp(u_swirl_detail, 0.0, 5.0);
  float flow_time = u_time * 0.15;
  vec2 flow_point = point * (0.56 + 0.035 * detail);
  vec2 first_warp = 2.0 * vec2(
    fbm(flow_point + vec2(0.0, flow_time), detail),
    fbm(flow_point + vec2(5.2, -0.73 * flow_time), detail)
  ) - 1.0;
  vec2 second_warp = 2.0 * vec2(
    fbm(
      flow_point + 1.25 * first_warp + vec2(1.7, -0.42 * flow_time),
      detail
    ),
    fbm(
      flow_point + 1.25 * first_warp + vec2(8.3, 0.36 * flow_time),
      detail
    )
  ) - 1.0;
  float warped_noise = fbm(
    flow_point + 1.7 * second_warp + 0.7 * first_warp +
      vec2(-0.35 * flow_time, 0.18 * flow_time),
    detail
  );
  float flowing_wave = 0.5 + 0.5 * sin(
    0.55 * flow_point.x -
    0.35 * flow_point.y +
    3.6 * warped_noise +
    0.8 * first_warp.x -
    0.82 * flow_time
  );
  float raw_field = mix(warped_noise, flowing_wave, 0.32);
  float balance_offset = (u_color_balance - 0.5) * 0.65;
  float field = smoothstep(
    0.10 + balance_offset,
    0.90 + balance_offset,
    raw_field
  );

  vec2 css_pixel = gl_FragCoord.xy / u_pixel_ratio;
  float css_minimum = min(u_resolution.x, u_resolution.y) / u_pixel_ratio;
  float cell_size = css_minimum / u_dot_density;
  vec2 grid = rotate2d(u_pattern_angle) * css_pixel / cell_size;
  float distance_to_center = length(fract(grid) - 0.5);
  float dot_radius = mix(0.05, 0.34, pow(field, 0.92));
  float antialias = max(0.012, 0.82 / max(cell_size, 1.0));
  float dot_mask = 1.0 - smoothstep(
    dot_radius - antialias,
    dot_radius + antialias,
    distance_to_center
  );

  vec3 ink = mix(u_color_b, u_color_a, field);
  vec3 color = mix(u_background, ink, dot_mask);
  gl_FragColor = vec4(color, 1.0);
}
`;

type RenderOptions = {
  width: number;
  height: number;
  time: number;
  config: HalftoneConfig;
};

export type HalftoneWebGLRenderer = {
  render: (options: RenderOptions) => boolean;
  destroy: () => void;
};

export function createHalftoneWebGLRenderer(
  canvas: HTMLCanvasElement,
): HalftoneWebGLRenderer | null {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }
  if (!gl) return null;
  const context = gl;

  const vertexShader = compileShader(
    context,
    context.VERTEX_SHADER,
    VERTEX_SHADER,
  );
  const fragmentShader = compileShader(
    context,
    context.FRAGMENT_SHADER,
    FRAGMENT_SHADER,
  );
  if (!vertexShader || !fragmentShader) {
    if (vertexShader) context.deleteShader(vertexShader);
    if (fragmentShader) context.deleteShader(fragmentShader);
    return null;
  }

  const program = context.createProgram();
  const positionBuffer = context.createBuffer();
  if (!program || !positionBuffer) {
    if (program) context.deleteProgram(program);
    if (positionBuffer) context.deleteBuffer(positionBuffer);
    context.deleteShader(vertexShader);
    context.deleteShader(fragmentShader);
    return null;
  }

  context.attachShader(program, vertexShader);
  context.attachShader(program, fragmentShader);
  context.linkProgram(program);
  context.deleteShader(vertexShader);
  context.deleteShader(fragmentShader);
  if (!context.getProgramParameter(program, context.LINK_STATUS)) {
    context.deleteBuffer(positionBuffer);
    context.deleteProgram(program);
    return null;
  }

  context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
  context.bufferData(
    context.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    context.STATIC_DRAW,
  );
  context.useProgram(program);
  const position = context.getAttribLocation(program, "a_position");
  context.enableVertexAttribArray(position);
  context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0);

  const uniforms = {
    resolution: context.getUniformLocation(program, "u_resolution"),
    pixelRatio: context.getUniformLocation(program, "u_pixel_ratio"),
    time: context.getUniformLocation(program, "u_time"),
    background: context.getUniformLocation(program, "u_background"),
    colorA: context.getUniformLocation(program, "u_color_a"),
    colorB: context.getUniformLocation(program, "u_color_b"),
    dotDensity: context.getUniformLocation(program, "u_dot_density"),
    patternAngle: context.getUniformLocation(program, "u_pattern_angle"),
    colorBalance: context.getUniformLocation(program, "u_color_balance"),
    swirlDetail: context.getUniformLocation(program, "u_swirl_detail"),
  };

  function render({ width, height, time, config }: RenderOptions) {
    try {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.max(1, Math.round(width * pixelRatio));
      const pixelHeight = Math.max(1, Math.round(height * pixelRatio));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      context.viewport(0, 0, pixelWidth, pixelHeight);
      context.useProgram(program);
      context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
      context.uniform2f(uniforms.resolution, pixelWidth, pixelHeight);
      context.uniform1f(uniforms.pixelRatio, pixelRatio);
      context.uniform1f(uniforms.time, time);
      context.uniform3fv(uniforms.background, hexToRgbUnit(config.background));
      context.uniform3fv(uniforms.colorA, hexToRgbUnit(config.colorA));
      context.uniform3fv(uniforms.colorB, hexToRgbUnit(config.colorB));
      context.uniform1f(uniforms.dotDensity, config.dotDensity);
      context.uniform1f(
        uniforms.patternAngle,
        (config.patternAngle * Math.PI) / 180,
      );
      context.uniform1f(uniforms.colorBalance, config.colorBalance / 100);
      context.uniform1f(uniforms.swirlDetail, config.swirlDetail);
      context.drawArrays(context.TRIANGLES, 0, 6);
      return context.getError() === context.NO_ERROR;
    } catch {
      return false;
    }
  }

  return {
    render,
    destroy() {
      context.deleteBuffer(positionBuffer);
      context.deleteProgram(program);
    },
  };
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}
