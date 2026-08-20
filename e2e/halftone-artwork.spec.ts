import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

test("halftone artwork renders, animates, and responds to its inspector", async ({
  page,
}) => {
  let roomRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/rooms/")) {
      roomRequests += 1;
    }
  });

  await page.goto("/artwork/halftone");

  await expect(page).toHaveTitle("Halftone Artwork · The Crew");
  await expect(
    page.getByRole("heading", { name: "Halftone swirl", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Halftone controls" }),
  ).toBeVisible();

  const artwork = page.locator("[data-halftone-artwork]");
  const canvas = page.locator("[data-halftone-canvas]");
  await expect(page.locator("body > [data-artwork]")).toBeHidden();
  await expect(artwork).toHaveCount(1);
  await expect(artwork).toHaveAttribute("data-halftone-renderer", "webgl");
  await expect(canvas).toBeVisible();
  const dimensions = await canvas.evaluate((element) => ({
    height: (element as HTMLCanvasElement).height,
    width: (element as HTMLCanvasElement).width,
  }));
  expect(dimensions.width).toBeGreaterThan(0);
  expect(dimensions.height).toBeGreaterThan(0);

  const firstFrame = await canvas.getAttribute("data-halftone-frame");
  const firstSignature = await getCanvasSignature(canvas);
  await expect
    .poll(() => canvas.getAttribute("data-halftone-frame"))
    .not.toBe(firstFrame);
  await expect.poll(() => getCanvasSignature(canvas)).not.toBe(firstSignature);

  const densityInput = page.getByRole("spinbutton", {
    name: "Dot density numeric value",
  });
  await densityInput.fill("140");
  await expect(densityInput).toHaveValue("140");
  await expect(artwork).toHaveAttribute("data-halftone-density", "140");
  await page.getByRole("button", { name: "Reset Dot density" }).click();
  await expect(densityInput).toHaveValue("100");
  await expect(artwork).toHaveAttribute("data-halftone-density", "100");

  await page.getByRole("button", { name: "Pause animation" }).click();
  await expect(artwork).toHaveAttribute("data-halftone-state", "paused");
  const pausedFrame = await canvas.getAttribute("data-halftone-frame");
  await page.waitForTimeout(300);
  await expect(canvas).toHaveAttribute(
    "data-halftone-frame",
    pausedFrame ?? "",
  );
  await page.getByRole("button", { name: "Play animation" }).click();
  await expect(artwork).toHaveAttribute("data-halftone-state", "running");

  await page.getByRole("spinbutton", {
    name: "Color balance numeric value",
  }).fill("25");
  await page.getByRole("button", { name: "Reset all controls" }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Color balance numeric value" }),
  ).toHaveValue("50");
  await expect(
    page.getByRole("spinbutton", { name: "Animation speed numeric value" }),
  ).toHaveValue("1");

  expect(roomRequests).toBe(0);
  await expectNoHorizontalDocumentOverflow(page);
  await expectNoDocumentScroll(page);
  await expectNoAccessibilityViolations(page);
});

test("halftone editor stays contained on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/artwork/halftone");

  await expect(page.locator("[data-halftone-viewport]")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reset all controls" }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Halftone controls" }),
  ).toBeVisible();
  await expectNoHorizontalDocumentOverflow(page);
  await expectNoDocumentScroll(page);
  await expectNoAccessibilityViolations(page);
});

test("uses an animated 2D renderer when WebGL shader setup fails", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getShaderParameter =
      WebGLRenderingContext.prototype.getShaderParameter;
    Object.defineProperty(
      WebGLRenderingContext.prototype,
      "getShaderParameter",
      {
        configurable: true,
        value(
          this: WebGLRenderingContext,
          shader: WebGLShader,
          parameter: number,
        ) {
          if (parameter === this.COMPILE_STATUS) return false;
          return Reflect.apply(getShaderParameter, this, [shader, parameter]);
        },
      },
    );
  });
  await page.goto("/artwork/halftone");

  const artwork = page.locator("[data-halftone-artwork]");
  const canvas = page.locator("[data-halftone-canvas]");
  await expect(artwork).toHaveAttribute(
    "data-halftone-renderer",
    "canvas-2d",
  );
  const firstFrame = await canvas.getAttribute("data-halftone-frame");
  const firstSignature = await getCanvasSignature(canvas);
  await expect
    .poll(() => canvas.getAttribute("data-halftone-frame"))
    .not.toBe(firstFrame);
  await expect.poll(() => getCanvasSignature(canvas)).not.toBe(firstSignature);
});

test("recovers with the 2D renderer when WebGL fails during a frame", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const drawArrays = WebGLRenderingContext.prototype.drawArrays;
    Object.defineProperty(WebGLRenderingContext.prototype, "drawArrays", {
      configurable: true,
      value(
        this: WebGLRenderingContext,
        mode: number,
        first: number,
        count: number,
      ) {
        if (
          this.canvas instanceof HTMLCanvasElement &&
          this.canvas.hasAttribute("data-halftone-webgl-canvas")
        ) {
          throw new Error("WebGL frame intentionally failed for this test");
        }
        return Reflect.apply(drawArrays, this, [mode, first, count]);
      },
    });
  });
  await page.goto("/artwork/halftone");

  const artwork = page.locator("[data-halftone-artwork]");
  const canvas = page.locator("[data-halftone-canvas]");
  await expect(artwork).toHaveAttribute(
    "data-halftone-renderer",
    "canvas-2d",
  );
  const firstFrame = await canvas.getAttribute("data-halftone-frame");
  await expect
    .poll(() => canvas.getAttribute("data-halftone-frame"))
    .not.toBe(firstFrame);
});

test("animates its SVG fallback when canvas rendering is unavailable", async ({
  page,
}) => {
  await disableHalftoneCanvasContexts(page, [
    "2d",
    "webgl",
    "experimental-webgl",
  ]);
  await page.goto("/artwork/halftone");

  const artwork = page.locator("[data-halftone-artwork]");
  const fallback = page.locator("[data-halftone-noise-fallback]");
  await expect(artwork).toHaveAttribute("data-halftone-renderer", "fallback");
  await expect(artwork).toHaveAttribute("data-halftone-state", "running");
  await expect(fallback).toBeVisible();
  const firstFrame = await fallback.screenshot();
  await page.waitForTimeout(500);
  const secondFrame = await fallback.screenshot();
  expect(secondFrame.equals(firstFrame)).toBe(false);
});

test("keeps an animated CSS backup behind the SVG fallback", async ({ page }) => {
  await disableHalftoneCanvasContexts(page, [
    "2d",
    "webgl",
    "experimental-webgl",
  ]);
  await page.goto("/artwork/halftone");
  await page.addStyleTag({
    content: "[data-halftone-noise-fallback] { display: none !important; }",
  });

  const fallback = page.locator("[data-halftone-fallback]");
  await expect(fallback).toBeVisible();
  const firstFrame = await fallback.screenshot();
  await page.waitForTimeout(500);
  const secondFrame = await fallback.screenshot();
  expect(secondFrame.equals(firstFrame)).toBe(false);
});

test.describe("reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("keeps the halftone swirl on its deterministic first frame", async ({
    page,
  }) => {
    await page.goto("/artwork/halftone");

    const artwork = page.locator("[data-halftone-artwork]");
    const canvas = page.locator("[data-halftone-canvas]");
    await expect(artwork).toHaveAttribute(
      "data-halftone-state",
      "reduced-motion",
    );
    await expect(canvas).toHaveAttribute("data-halftone-frame", "0");
    const signature = await getCanvasSignature(canvas);
    await page.waitForTimeout(400);
    await expect(canvas).toHaveAttribute("data-halftone-frame", "0");
    expect(await getCanvasSignature(canvas)).toBe(signature);
  });

  test("freezes the no-canvas fallback and reports reduced motion", async ({
    page,
  }) => {
    await disableHalftoneCanvasContexts(page, [
      "2d",
      "webgl",
      "experimental-webgl",
    ]);
    await page.goto("/artwork/halftone");

    const artwork = page.locator("[data-halftone-artwork]");
    const fallback = page.locator("[data-halftone-fallback]");
    await expect(artwork).toHaveAttribute("data-halftone-renderer", "fallback");
    await expect(artwork).toHaveAttribute(
      "data-halftone-state",
      "reduced-motion",
    );
    const firstFrame = await fallback.screenshot();
    await page.waitForTimeout(500);
    const secondFrame = await fallback.screenshot();
    expect(secondFrame.equals(firstFrame)).toBe(true);
  });
});

async function getCanvasSignature(canvas: Locator) {
  return canvas.evaluate((element) => {
    const encoded = (element as HTMLCanvasElement).toDataURL("image/png");
    let hash = 2166136261;
    for (let index = 0; index < encoded.length; index += 1) {
      hash = Math.imul(hash ^ encoded.charCodeAt(index), 16777619);
    }
    return hash >>> 0;
  });
}

async function disableHalftoneCanvasContexts(
  page: Page,
  disabledContexts: string[],
) {
  await page.addInitScript((contextIds) => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value(
        this: HTMLCanvasElement,
        contextId: string,
        ...options: unknown[]
      ) {
        if (
          (this.hasAttribute("data-halftone-canvas") ||
            this.hasAttribute("data-halftone-canvas-2d")) &&
          contextIds.includes(contextId)
        ) {
          throw new Error(`${contextId} intentionally disabled for this test`);
        }
        return Reflect.apply(getContext, this, [contextId, ...options]);
      },
    });
  }, disabledContexts);
}

async function expectNoAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(
    results.violations,
    results.violations
      .map(
        (violation) =>
          `${violation.id}: ${violation.help} (${violation.nodes.length} node${
            violation.nodes.length === 1 ? "" : "s"
          })`,
      )
      .join("\n"),
  ).toEqual([]);
}

async function expectNoHorizontalDocumentOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));

  expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  expect(dimensions.documentWidth).toBeLessThanOrEqual(
    dimensions.viewportWidth,
  );
}

async function expectNoDocumentScroll(page: Page) {
  const dimensions = await page.evaluate(() => ({
    bodyHeight: document.body.scrollHeight,
    documentHeight: document.documentElement.scrollHeight,
    viewportHeight: document.documentElement.clientHeight,
  }));

  expect(dimensions.bodyHeight).toBeLessThanOrEqual(dimensions.viewportHeight);
  expect(dimensions.documentHeight).toBeLessThanOrEqual(
    dimensions.viewportHeight,
  );
}
