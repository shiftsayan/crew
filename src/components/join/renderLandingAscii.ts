import {
  ART_STYLE_PRESETS,
  DEFAULT_OPTIONS,
  imageToAsciiFrame,
  imageToAsciiTextFrame,
  renderFrameToCanvas,
  renderTextFrameToCanvas,
  type ArtStyle,
  type AsciiOptions,
} from "asciify-engine";

const MAX_LONG_EDGE = 1200;

type StaticLandingEffect = {
  artStyle: ArtStyle;
  fontSize: number;
  options: Partial<AsciiOptions>;
};

export function renderLandingAscii(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  effect: StaticLandingEffect,
) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const scale = Math.min(
    1,
    MAX_LONG_EDGE / Math.max(sourceWidth, sourceHeight),
  );
  const renderWidth = Math.max(1, Math.round(sourceWidth * scale));
  const renderHeight = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext("2d");
  const sourceCanvas = document.createElement("canvas");
  const sourceContext = sourceCanvas.getContext("2d");

  if (!context || !sourceContext) {
    throw new Error("Canvas 2D is not available.");
  }

  sourceCanvas.width = renderWidth;
  sourceCanvas.height = renderHeight;
  sourceContext.drawImage(image, 0, 0, renderWidth, renderHeight);
  canvas.width = renderWidth;
  canvas.height = renderHeight;

  const options: AsciiOptions = {
    ...DEFAULT_OPTIONS,
    ...ART_STYLE_PRESETS[effect.artStyle],
    ...effect.options,
    fontSize: effect.fontSize,
  };

  if (options.renderMode === "ascii" && options.colorMode !== "fullcolor") {
    const frame = imageToAsciiTextFrame(
      sourceCanvas,
      options,
      renderWidth,
      renderHeight,
    );
    renderTextFrameToCanvas(
      context,
      frame,
      options,
      renderWidth,
      renderHeight,
    );
    return;
  }

  const { frame } = imageToAsciiFrame(
    sourceCanvas,
    options,
    renderWidth,
    renderHeight,
  );
  renderFrameToCanvas(
    context,
    frame,
    options,
    renderWidth,
    renderHeight,
  );
}
