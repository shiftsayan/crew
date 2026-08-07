import { expect, test, type Locator, type Page } from "@playwright/test";

type CardSpec = {
  cardId: string;
  color: string;
  iconClass: string;
  shape: Array<{
    tag: string;
    attributes: Record<string, string>;
  }>;
  suit: "pink" | "blue" | "green" | "yellow" | "trump";
};

const cards: CardSpec[] = [
  {
    cardId: "pink-1",
    color: "rgb(248, 113, 113)",
    iconClass: "lucide lucide-square",
    shape: [
      {
        tag: "rect",
        attributes: {
          height: "18",
          rx: "2",
          width: "18",
          x: "3",
          y: "3",
        },
      },
    ],
    suit: "pink",
  },
  {
    cardId: "blue-1",
    color: "rgb(14, 165, 233)",
    iconClass: "lucide lucide-circle",
    shape: [
      {
        tag: "circle",
        attributes: { cx: "12", cy: "12", r: "10" },
      },
    ],
    suit: "blue",
  },
  {
    cardId: "green-1",
    color: "rgb(16, 185, 129)",
    iconClass: "lucide lucide-triangle",
    shape: [
      {
        tag: "path",
        attributes: {
          d: "M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z",
        },
      },
    ],
    suit: "green",
  },
  {
    cardId: "yellow-1",
    color: "rgb(251, 191, 36)",
    iconClass: "lucide lucide-x",
    shape: [
      {
        tag: "path",
        attributes: { d: "M18 6 6 18" },
      },
      {
        tag: "path",
        attributes: { d: "m6 6 12 12" },
      },
    ],
    suit: "yellow",
  },
  {
    cardId: "trump-1",
    color: "rgb(0, 0, 0)",
    iconClass: "lucide lucide-chevrons-up",
    shape: [
      {
        tag: "path",
        attributes: { d: "m17 11-5-5-5 5" },
      },
      {
        tag: "path",
        attributes: { d: "m17 18-5-5-5 5" },
      },
    ],
    suit: "trump",
  },
];

function cardLocator(page: Page, cardId: string) {
  return page
    .locator(`[data-asset-card="${cardId}"]`)
    .locator('[data-slot="game-card"]');
}

async function expectCardSurface(
  card: Locator,
  spec: CardSpec,
) {
  await expect(card).toBeAttached();
  await expect(card).toHaveAttribute("data-card-suit", spec.suit);

  const contract = await card.evaluate((element) => {
    const required = <ElementType extends Element>(selector: string) => {
      const result = element.querySelector<ElementType>(selector);
      if (!result) throw new Error(`Missing card element: ${selector}`);
      return result;
    };
    const relativeBox = (child: Element, parent: Element) => {
      const childBox = child.getBoundingClientRect();
      const parentBox = parent.getBoundingClientRect();
      return {
        height: childBox.height,
        left: childBox.left - parentBox.left,
        top: childBox.top - parentBox.top,
        width: childBox.width,
      };
    };

    const field = required<HTMLElement>('[data-slot="game-card-field"]');
    const rank = required<HTMLElement>('[data-slot="game-card-rank"]');
    const rankLabel = required<HTMLElement>(
      '[data-slot="game-card-rank-label"]',
    );
    const symbol = required<HTMLElement>('[data-slot="game-card-symbol"]');
    const svg = required<SVGElement>('[data-slot="game-card-symbol"] svg');
    const cardStyle = getComputedStyle(element);
    const fieldStyle = getComputedStyle(field);
    const rankStyle = getComputedStyle(rank);
    const rankLabelStyle = getComputedStyle(rankLabel);
    const symbolStyle = getComputedStyle(symbol);
    const svgStyle = getComputedStyle(svg);
    const cardBox = element.getBoundingClientRect();

    return {
      card: {
        backgroundColor: cardStyle.backgroundColor,
        borderRadius: cardStyle.borderRadius,
        borderWidth: cardStyle.borderWidth,
        boxShadow: cardStyle.boxShadow,
        boxSizing: cardStyle.boxSizing,
        color: cardStyle.color,
        height: cardBox.height,
        overflow: cardStyle.overflow,
        padding: cardStyle.padding,
        position: cardStyle.position,
        transform: cardStyle.transform,
        width: cardBox.width,
      },
      field: {
        ...relativeBox(field, element),
        backgroundColor: fieldStyle.backgroundColor,
        borderRadius: fieldStyle.borderRadius,
      },
      rank: {
        ...relativeBox(rank, element),
        backgroundColor: rankStyle.backgroundColor,
        borderBottomLeftRadius: rankStyle.borderBottomLeftRadius,
        borderBottomRightRadius: rankStyle.borderBottomRightRadius,
        borderTopLeftRadius: rankStyle.borderTopLeftRadius,
        borderTopRightRadius: rankStyle.borderTopRightRadius,
      },
      rankLabel: {
        ...relativeBox(rankLabel, element),
        color: rankLabelStyle.color,
        fontFamily: rankLabelStyle.fontFamily,
        fontSize: rankLabelStyle.fontSize,
        fontVariantNumeric: rankLabelStyle.fontVariantNumeric,
        fontWeight: rankLabelStyle.fontWeight,
        lineHeight: rankLabelStyle.lineHeight,
        paddingTop: rankLabelStyle.paddingTop,
      },
      symbol: {
        color: symbolStyle.color,
        fontSize: symbolStyle.fontSize,
        lineHeight: symbolStyle.lineHeight,
        opacity: symbolStyle.opacity,
      },
      svg: {
        attributes: {
          fill: svg.getAttribute("fill"),
          height: svg.getAttribute("height"),
          stroke: svg.getAttribute("stroke"),
          strokeLinecap: svg.getAttribute("stroke-linecap"),
          strokeLinejoin: svg.getAttribute("stroke-linejoin"),
          strokeWidth: svg.getAttribute("stroke-width"),
          viewBox: svg.getAttribute("viewBox"),
          width: svg.getAttribute("width"),
        },
        box: relativeBox(svg, symbol),
        fill: svgStyle.fill,
        iconClass: svg.getAttribute("class"),
        stroke: svgStyle.stroke,
      },
      shape: Array.from(svg.children).map((child) => ({
        attributes: Object.fromEntries(
          Array.from(child.attributes, (attribute) => [
            attribute.name,
            attribute.value,
          ]),
        ),
        tag: child.tagName.toLowerCase(),
      })),
    };
  });

  expect(contract.card).toEqual({
    backgroundColor: "rgb(255, 255, 255)",
    borderRadius: "12px",
    borderWidth: "0px",
    boxShadow: "none",
    boxSizing: "border-box",
    color: spec.color,
    height: 112,
    overflow: "hidden",
    padding: "6px",
    position: "relative",
    transform: "none",
    width: 80,
  });
  expect(contract.field).toEqual({
    backgroundColor: spec.color,
    borderRadius: "8px",
    height: 100,
    left: 6,
    top: 6,
    width: 68,
  });
  expect(contract.rank).toEqual({
    backgroundColor: "rgb(255, 255, 255)",
    borderBottomLeftRadius: "0px",
    borderBottomRightRadius: "12px",
    borderTopLeftRadius: "12px",
    borderTopRightRadius: "0px",
    height: 32,
    left: 0,
    top: 0,
    width: 32,
  });
  expect(contract.rankLabel).toMatchObject({
    color: spec.color,
    fontSize: "18px",
    fontVariantNumeric: "tabular-nums",
    fontWeight: "700",
    lineHeight: "28px",
    paddingTop: "0px",
  });
  expect(contract.rankLabel.left + contract.rankLabel.width / 2).toBeCloseTo(16);
  expect(contract.rankLabel.top + contract.rankLabel.height / 2).toBeCloseTo(16);
  expect(contract.rankLabel.fontFamily).toMatch(/^Poppins(?:,|$)/);
  expect(contract.symbol).toEqual({
    color: "rgb(255, 255, 255)",
    fontSize: "36px",
    lineHeight: "40px",
    opacity: "0.2",
  });
  expect(contract.svg).toEqual({
    attributes: {
      fill: "none",
      height: "1em",
      stroke: "currentColor",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: "2",
      viewBox: "0 0 24 24",
      width: "1em",
    },
    box: {
      height: 36,
      left: 0,
      top: 0,
      width: 36,
    },
    fill: "none",
    iconClass: spec.iconClass,
    stroke: "rgb(255, 255, 255)",
  });
  expect(contract.shape).toEqual(spec.shape);
}

for (const viewport of [
  { label: "desktop", width: 1440 },
  { label: "375px mobile", width: 375 },
]) {
  test(`regular cards retain their fixed surface at ${viewport.label}`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: viewport.width });
    await page.goto("/assets");
    await expect(page.locator('[data-asset-mode="cards"]')).toBeAttached();
    await page.evaluate(() => document.fonts.ready.then(() => true));

    for (const spec of cards) {
      await expectCardSurface(cardLocator(page, spec.cardId), spec);
    }
  });
}

test("Planet X task cards use the outlined mini Crew pill", async ({
  page,
}) => {
  await page.goto("/assets");
  await page.getByRole("combobox", { name: "Asset mode" }).click();
  await page.getByRole("option", { name: "Planet X" }).click();
  await expect(page.locator('[data-asset-mode="planet-nine"]')).toBeAttached();

  const emphasizedTask = page.locator(
    '[data-asset-task="planet-nine-task-blue-1"]',
  );
  const emphasizedGeometry = await emphasizedTask.evaluate((element) => {
    const face = element
      .querySelector<HTMLElement>('[data-slot="task-face"]')!
      .getBoundingClientRect();
    const pill = element
      .querySelector<HTMLElement>('[data-slot="task-card"]')!
      .getBoundingClientRect();
    const boot = element
      .querySelector<HTMLElement>('[data-slot="task-boot"]')!
      .getBoundingClientRect();

    return {
      bootTopDelta: boot.top - face.bottom,
      faceHeight: face.height,
      faceWidth: face.width,
      pillHeight: pill.height,
      pillWidth: pill.width,
      xCenterDelta: (pill.left + pill.right - face.left - face.right) / 2,
      yCenterDelta: (pill.top + pill.bottom - face.top - face.bottom) / 2,
    };
  });

  expect(emphasizedGeometry.bootTopDelta).toBeCloseTo(0, 1);
  expect(emphasizedGeometry.faceHeight).toBeCloseTo(84, 1);
  expect(emphasizedGeometry.faceWidth).toBeCloseTo(84, 1);
  expect(emphasizedGeometry.pillHeight).toBeCloseTo(33.6, 1);
  expect(emphasizedGeometry.pillWidth).toBeCloseTo(57.6, 1);
  expect(emphasizedGeometry.xCenterDelta).toBeCloseTo(0, 1);
  expect(emphasizedGeometry.yCenterDelta).toBeCloseTo(0, 1);
  const bootFrame = emphasizedTask.locator('[data-slot="task-boot-frame"]');
  await expect(bootFrame).toHaveClass(/before:bg-slate-200/);
  const bootExtension = await bootFrame.evaluate((element) => {
      const style = getComputedStyle(element, "::before");
      const boot = element.querySelector<HTMLElement>('[data-slot="task-boot"]')!;
      return {
        backgroundColor: style.backgroundColor,
        bootBackgroundColor: getComputedStyle(boot).backgroundColor,
        height: style.height,
        top: style.top,
        zIndex: style.zIndex,
      };
    });
  expect(bootExtension.backgroundColor).toBe(
    bootExtension.bootBackgroundColor,
  );
  expect(bootExtension).toEqual({
    backgroundColor: bootExtension.bootBackgroundColor,
    bootBackgroundColor: bootExtension.bootBackgroundColor,
    height: "4px",
    top: "-4px",
    zIndex: "0",
  });

  await page.getByRole("combobox", { name: "Size", exact: true }).click();
  await page.getByRole("option", { name: "Default · 56px" }).click();

  for (const { cardId, color, iconClass } of cards.filter(
    ({ suit }) => suit !== "trump",
  )) {
    const task = page.locator(
      `[data-asset-task="planet-nine-task-${cardId}"]`,
    );
    const pill = task.locator('[data-slot="task-card"]');
    const field = task.locator('[data-slot="task-card-field"]');
    const icon = task.locator('[data-slot="task-card-symbol"]');
    const value = task.locator('[data-slot="task-card-value"]');
    const tile = task.locator('[data-slot="task-tile"]');
    const boot = task.locator('[data-slot="task-boot"]');
    const status = task.locator('[data-slot="task-status"]');

    await expect(icon).toHaveClass(new RegExp(`\\b${iconClass.split(" ")[1]}\\b`));
    await expect(pill).toHaveCSS("color", color);
    await expect(pill).toHaveCSS("border-color", "rgb(217, 220, 232)");
    await expect(pill).toHaveCSS("border-style", "solid");
    await expect(pill).toHaveCSS("border-width", "1px");
    await expect(field).toHaveCSS("background-color", color);
    await expect(field).toHaveCSS("font-size", "12px");
    await expect(icon).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(icon).toHaveCSS("height", "12px");
    await expect(icon).toHaveCSS("opacity", "0.2");
    await expect(icon).toHaveCSS("width", "12px");
    await expect(value).toHaveCSS("color", color);
    await expect(value).toHaveCSS("font-size", "12.8px");
    await expect(value).toHaveCSS("font-variant-numeric", "tabular-nums");
    await expect(value).toHaveCSS("font-weight", "800");
    await expect(tile).toHaveCSS("height", "56px");
    await expect(tile).toHaveCSS("width", "56px");
    await expect(boot).toHaveCSS("height", "20px");
    await expect(boot).toHaveCSS("width", "56px");
    await expect(status).toHaveCSS("height", "14px");
    await expect(status).toHaveCSS("width", "14px");
    const defaultGeometry = await task.evaluate((element) => {
      const face = element
        .querySelector<HTMLElement>('[data-slot="task-face"]')!
        .getBoundingClientRect();
      const pill = element
        .querySelector<HTMLElement>('[data-slot="task-card"]')!
        .getBoundingClientRect();
      const bootRect = element
        .querySelector<HTMLElement>('[data-slot="task-boot"]')!
        .getBoundingClientRect();

      return {
        bootTopDelta: bootRect.top - face.bottom,
        pillHeight: pill.height,
        pillWidth: pill.width,
        xCenterDelta: (pill.left + pill.right - face.left - face.right) / 2,
        yCenterDelta: (pill.top + pill.bottom - face.top - face.bottom) / 2,
      };
    });
    expect(defaultGeometry.bootTopDelta).toBeCloseTo(0, 1);
    expect(defaultGeometry.pillHeight).toBeCloseTo(26.4, 1);
    expect(defaultGeometry.pillWidth).toBeCloseTo(44.8, 1);
    expect(defaultGeometry.xCenterDelta).toBeCloseTo(0, 1);
    expect(defaultGeometry.yCenterDelta).toBeCloseTo(0, 1);
    expect(
      await status.evaluate(
        (element) =>
          element.closest('[data-slot="task-boot"]')?.getAttribute("data-slot"),
      ),
    ).toBe("task-boot");
  }
});
