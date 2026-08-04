import type {
  ArtworkColorOptions,
  ArtworkFit,
  ArtworkTransformOptions,
} from "./config";

const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_image;
uniform vec2 u_canvas_size;
uniform vec2 u_image_size;
uniform vec2 u_translate;
uniform vec2 u_scale;
uniform vec2 u_skew;
uniform float u_rotation;
uniform float u_fit;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_grayscale;

varying vec2 v_uv;

vec2 fit_uv(vec2 uv) {
  float canvas_aspect = u_canvas_size.x / u_canvas_size.y;
  float image_aspect = u_image_size.x / u_image_size.y;

  if (u_fit < 0.5) {
    if (image_aspect > canvas_aspect) {
      uv.x = 0.5 + (uv.x - 0.5) * canvas_aspect / image_aspect;
    } else {
      uv.y = 0.5 + (uv.y - 0.5) * image_aspect / canvas_aspect;
    }
    return uv;
  }

  if (u_fit < 1.5) {
    if (image_aspect > canvas_aspect) {
      float height = canvas_aspect / image_aspect;
      if (abs(uv.y - 0.5) > height * 0.5) return vec2(-1.0);
      uv.y = 0.5 + (uv.y - 0.5) / height;
    } else {
      float width = image_aspect / canvas_aspect;
      if (abs(uv.x - 0.5) > width * 0.5) return vec2(-1.0);
      uv.x = 0.5 + (uv.x - 0.5) / width;
    }
  }

  return uv;
}

void main() {
  vec2 point = v_uv - 0.5 - u_translate;
  float cosine = cos(-u_rotation);
  float sine = sin(-u_rotation);
  point = mat2(cosine, -sine, sine, cosine) * point;

  float determinant = 1.0 - u_skew.x * u_skew.y;
  if (abs(determinant) < 0.001) {
    determinant = determinant < 0.0 ? -0.001 : 0.001;
  }
  point = mat2(1.0, -u_skew.y, -u_skew.x, 1.0) * point / determinant;
  point /= u_scale;

  vec2 uv = fit_uv(point + 0.5);
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  vec4 color = texture2D(u_image, vec2(uv.x, 1.0 - uv.y));
  color.rgb += u_brightness;
  color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
  float luminance = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  color.rgb = mix(vec3(luminance), color.rgb, u_saturation);
  color.rgb = mix(color.rgb, vec3(luminance), u_grayscale);
  gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0), color.a);
}
`;

type RenderOptions = {
  canvas: HTMLCanvasElement;
  image: HTMLImageElement;
  width: number;
  height: number;
  transform: Required<ArtworkTransformOptions>;
  color: Required<Omit<ArtworkColorOptions, "tint">>;
};

type ArtworkWebGLRenderer = {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  texture: WebGLTexture;
  render: (options: RenderOptions) => boolean;
  destroy: () => void;
};

export function createArtworkWebGLRenderer(
  canvas: HTMLCanvasElement,
): ArtworkWebGLRenderer | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  if (!gl) return null;
  const context = gl;

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  const positionBuffer = gl.createBuffer();
  const texture = gl.createTexture();
  if (!positionBuffer || !texture) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );

  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.useProgram(program);

  function render({
    image,
    width,
    height,
    transform,
    color,
  }: RenderOptions) {
    try {
      const deviceScale = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.max(1, Math.round(width * deviceScale));
      const pixelHeight = Math.max(1, Math.round(height * deviceScale));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      context.viewport(0, 0, pixelWidth, pixelHeight);
      context.clearColor(0, 0, 0, 0);
      context.clear(context.COLOR_BUFFER_BIT);
      context.useProgram(program);
      context.bindTexture(context.TEXTURE_2D, texture);
      context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, 0);
      context.texImage2D(
        context.TEXTURE_2D,
        0,
        context.RGBA,
        context.RGBA,
        context.UNSIGNED_BYTE,
        image,
      );

      uniform2f(context, program, "u_canvas_size", pixelWidth, pixelHeight);
      uniform2f(
        context,
        program,
        "u_image_size",
        image.naturalWidth,
        image.naturalHeight,
      );
      uniform2f(
        context,
        program,
        "u_translate",
        transform.translateX / 100,
        -transform.translateY / 100,
      );
      uniform2f(
        context,
        program,
        "u_scale",
        transform.scale *
          transform.scaleX *
          (transform.flipX ? -1 : 1),
        transform.scale *
          transform.scaleY *
          (transform.flipY ? -1 : 1),
      );
      uniform2f(
        context,
        program,
        "u_skew",
        Math.tan(toRadians(transform.skewX)),
        Math.tan(toRadians(transform.skewY)),
      );
      uniform1f(context, program, "u_rotation", toRadians(transform.rotate));
      uniform1f(context, program, "u_fit", fitValue(transform.fit));
      uniform1f(context, program, "u_brightness", color.brightness);
      uniform1f(context, program, "u_contrast", color.contrast);
      uniform1f(context, program, "u_saturation", color.saturation);
      uniform1f(context, program, "u_grayscale", color.grayscale);
      context.drawArrays(context.TRIANGLES, 0, 6);
      return context.getError() === context.NO_ERROR;
    } catch {
      return false;
    }
  }

  return {
    gl: context,
    program,
    texture,
    render,
    destroy() {
      context.deleteBuffer(positionBuffer);
      context.deleteTexture(texture);
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

function uniform1f(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  name: string,
  value: number,
) {
  gl.uniform1f(gl.getUniformLocation(program, name), value);
}

function uniform2f(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  name: string,
  x: number,
  y: number,
) {
  gl.uniform2f(gl.getUniformLocation(program, name), x, y);
}

function fitValue(fit: ArtworkFit) {
  if (fit === "contain") return 1;
  if (fit === "fill") return 2;
  return 0;
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}
