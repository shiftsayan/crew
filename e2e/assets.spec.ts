import { expect, test, type Page } from "@playwright/test";

import {
  CARD_DECK,
  DEEP_SEA_TASKS,
  NON_TRUMP_CARDS,
} from "../src/game/config";

async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function assetIds(page: Page, attribute: string) {
  return page.locator(`[${attribute}]`).evaluateAll((elements, name) =>
    elements.map((element) => element.getAttribute(name)),
  attribute);
}

test("assets exposes every canonical card and goal", async ({ page }) => {
  await page.goto("/assets");

  await expect(page.locator("[data-asset-card]")).toHaveCount(CARD_DECK.length);
  expect(await assetIds(page, "data-asset-card")).toEqual(
    CARD_DECK.map((card) => card.id),
  );
  await expect(page.getByText("40 playing cards", { exact: true })).toBeVisible();

  await choose(page, "Asset mode", "Mission Deep Sea");
  await expect(page.locator('[data-asset-mode="deep-sea"]')).toBeAttached();
  await expect(page.locator("[data-asset-goal]")).toHaveCount(
    DEEP_SEA_TASKS.length,
  );
  await expect(
    page.getByRole("button", { name: /View details for/ }),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-slot="deep-sea-task-difficulty"]'),
  ).toHaveCount(0);
  expect(await assetIds(page, "data-asset-goal")).toEqual(
    DEEP_SEA_TASKS.map((goal) => goal.id),
  );
  await expect(page.getByText("96 goals", { exact: true })).toBeVisible();
  await expect(
    page.locator(
      '[data-asset-mode="deep-sea"] [aria-label^="Difficulty:"]',
    ),
  ).toHaveCount(0);
  const deepSeaAssets = page.locator('[data-asset-mode="deep-sea"]');
  await expect(
    deepSeaAssets.getByText("WIN =0×", { exact: true }),
  ).toHaveCount(9);
  await expect(deepSeaAssets.getByText("0×", { exact: true })).toHaveCount(2);
  await expect(
    deepSeaAssets.getByText("Win 0× tricks", { exact: true }),
  ).toHaveCount(1);
  await expect(deepSeaAssets.getByText(/0(?:x|ˣ)/)).toHaveCount(0);

  const task88 = page.locator('[data-asset-task="deep-sea-task-88"]');
  const task88Spacing = await task88.evaluate((element) => {
    const number = element
      .querySelector<HTMLElement>('[data-slot="asset-goal-number"]')!
      .getBoundingClientRect();
    const tile = element
      .querySelector<HTMLElement>("[data-task-outcome]")!
      .getBoundingClientRect();
    const description = element
      .querySelector<HTMLElement>('[data-slot="asset-goal-description"]')!
      .getBoundingClientRect();
    const numberStyle = getComputedStyle(
      element.querySelector<HTMLElement>('[data-slot="asset-goal-number"]')!,
    );

    return {
      afterNumber: tile.top - number.bottom,
      afterTile: description.top - tile.bottom,
      numberTextAlign: numberStyle.textAlign,
    };
  });

  expect(task88Spacing.numberTextAlign).toBe("center");
  expect(task88Spacing.afterNumber).toBeGreaterThan(0);
  expect(task88Spacing.afterNumber).toBeCloseTo(task88Spacing.afterTile);

  const task85 = page.locator('[data-asset-task="deep-sea-task-85"]');
  const task85Alignment = await task85.evaluate((element) => {
    const face = element
      .querySelector<HTMLElement>('[data-slot="task-face"]')!
      .getBoundingClientRect();
    const header = element.querySelector<HTMLElement>(
      '[data-slot="deep-sea-task-header"]',
    )!;
    const label = header.firstElementChild!.getBoundingClientRect();
    const pill = header
      .querySelector<HTMLElement>('[data-slot="deep-sea-task-mini-card"]')!
      .getBoundingClientRect();
    const headerStyle = getComputedStyle(header);
    const pillStyle = getComputedStyle(
      header.querySelector<HTMLElement>(
        '[data-slot="deep-sea-task-mini-card"]',
      )!,
    );
    const contentCenter =
      (Math.min(label.top, pill.top) + Math.max(label.bottom, pill.bottom)) / 2;

    return {
      centerDelta: contentCenter - (face.top + face.bottom) / 2,
      headerAlignItems: headerStyle.alignItems,
      headerJustifyContent: headerStyle.justifyContent,
      pillDisplay: pillStyle.display,
      pillAlignItems: pillStyle.alignItems,
      pillJustifyItems: pillStyle.justifyItems,
    };
  });

  expect(Math.abs(task85Alignment.centerDelta)).toBeLessThanOrEqual(1);
  expect(task85Alignment).toMatchObject({
    headerAlignItems: "center",
    headerJustifyContent: "center",
    pillDisplay: "grid",
    pillAlignItems: "center",
    pillJustifyItems: "center",
  });

  await choose(page, "Asset mode", "Planet X");
  await expect(page.locator('[data-asset-mode="planet-nine"]')).toBeAttached();
  await expect(page.locator("[data-asset-goal]")).toHaveCount(
    NON_TRUMP_CARDS.length,
  );
  await expect(page.getByText("Capture this card", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: /View details for/ }),
  ).toHaveCount(0);
  expect(await assetIds(page, "data-asset-goal")).toEqual(
    NON_TRUMP_CARDS.map((card) => `planet-nine-task-${card.id}`),
  );
  await expect(page.getByText("36 goals", { exact: true })).toBeVisible();
});

test("cards are interactive unless disabled without a disabled appearance", async ({
  page,
}) => {
  await page.goto("/assets");

  await expect(
    page.getByRole("combobox", { name: "Selection", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Element", exact: true }),
  ).toHaveCount(0);
  const firstCard = page.locator("[data-asset-card]").first();
  await expect(page.locator("[data-asset-card]")).toHaveCount(CARD_DECK.length);
  await expect(firstCard.getByRole("button")).toBeEnabled();
  await expect(firstCard).not.toHaveAttribute("data-asset-interactive", /.+/);
  await expect(firstCard).not.toHaveAttribute("data-asset-selected", /.+/);

  await choose(page, "Availability", "Disabled");
  await expect(firstCard).toHaveAttribute("data-asset-disabled", "true");
  await expect(firstCard.getByRole("button")).toBeDisabled();
  await expect(firstCard.getByRole("button")).toHaveCSS("filter", "none");
  await expect(firstCard.getByRole("button")).toHaveCSS("opacity", "1");
  await expect(firstCard.getByRole("button")).not.toHaveAttribute(
    "aria-pressed",
    /.+/,
  );
});

test("asset controls reach every meaningful card and goal state", async ({
  page,
}) => {
  await page.goto("/assets");

  await choose(page, "Availability", "Disabled");
  await choose(page, "Scale", "Communication · 80%");

  const firstCard = page.locator("[data-asset-card]").first();
  await expect(page.locator("[data-asset-card]")).toHaveCount(CARD_DECK.length);
  await expect(firstCard).toHaveAttribute("data-asset-disabled", "true");
  await expect(firstCard).toHaveAttribute(
    "data-asset-scale",
    "communication",
  );
  await expect(firstCard.getByRole("button")).toBeDisabled();
  await expect(firstCard.locator('[data-slot="game-card"]')).toHaveCSS(
    "transform",
    /matrix\(0\.8, 0, 0, 0\.8, 0, 0\)/,
  );

  await choose(page, "Asset mode", "Mission Deep Sea");

  await expect(
    page.getByRole("combobox", { name: "Order", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Owner", exact: true }),
  ).toHaveCount(0);

  await choose(page, "Size", "Default · 56px");
  await choose(page, "Outcome", "Successful");
  await choose(page, "Difficulty", "5 players");

  const deepSeaGoals = page.locator("[data-asset-goal]");
  const firstDeepSeaGoal = deepSeaGoals.first();
  await expect(deepSeaGoals).toHaveCount(DEEP_SEA_TASKS.length);
  await expect(firstDeepSeaGoal).toHaveAttribute(
    "data-asset-emphasized",
    "false",
  );
  await expect(firstDeepSeaGoal).toHaveAttribute(
    "data-asset-order",
    "none",
  );
  await expect(firstDeepSeaGoal).toHaveAttribute("data-asset-difficulty", "5");
  await expect(firstDeepSeaGoal.locator("[data-task-outcome]"))
    .toHaveAttribute("data-task-outcome", "success");
  const deepSeaBoot = firstDeepSeaGoal.locator('[data-slot="task-boot"]');
  await expect(deepSeaBoot).toBeVisible();
  await expect(deepSeaBoot).toHaveClass(/bg-slate-200/);
  const deepSeaStatus = deepSeaBoot.locator('[data-slot="task-status"]');
  await expect(deepSeaStatus).toBeVisible();
  await expect(deepSeaStatus).toHaveClass(/bg-green-500/);
  await expect(deepSeaStatus).toHaveCSS("border-width", "0px");
  await expect(deepSeaStatus).toHaveCSS("height", "14px");
  await expect(deepSeaStatus).toHaveCSS("width", "14px");
  await expect(deepSeaStatus.locator("svg")).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  const difficultyBadge = deepSeaBoot.locator(
    '[data-slot="deep-sea-task-difficulty"]',
  );
  await expect(difficultyBadge).toBeVisible();
  await expect(difficultyBadge).toHaveCSS("height", "14px");
  const difficultyWidth = await difficultyBadge.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  expect(difficultyWidth).toBeGreaterThan(14);
  expect(difficultyWidth).toBeLessThan(28);
  await expect(difficultyBadge).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(deepSeaBoot.locator('[data-slot="task-order"]')).toHaveCount(0);
  await expect(firstDeepSeaGoal.getByRole("img")).toHaveAccessibleName(
    /Unassigned\. Successful\. Difficulty \d+\./,
  );
  const difficultyButton = deepSeaBoot.getByRole("button", {
    name: /View details for/,
  });
  await expect(difficultyButton).toBeVisible();
  const difficultyFontSize = await difficultyButton.evaluate(
    (element) => getComputedStyle(element).fontSize,
  );
  await expect(difficultyButton).toHaveAttribute(
    "data-slot",
    "deep-sea-task-difficulty",
  );
  expect(
    await deepSeaBoot.evaluate((element) =>
      Array.from(element.children, (child) => child.getAttribute("data-slot")),
    ),
  ).toEqual(["deep-sea-task-difficulty", "task-status"]);
  expect(
    await deepSeaBoot
      .locator(":scope > [data-slot]")
      .evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().height),
      ),
  ).toEqual([14, 14]);
  await expect(difficultyButton).toHaveCSS("height", "14px");
  expect(
    await difficultyButton.evaluate(
      (element) => element.getBoundingClientRect().width,
    ),
  ).toBe(difficultyWidth);
  await expect(difficultyButton).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  const difficultyNumber = difficultyButton.locator("span");
  const difficultyIcon = difficultyButton.locator("svg");
  await expect(difficultyNumber).toHaveCSS("color", "rgb(40, 35, 93)");
  const restingIconColor = await difficultyIcon.evaluate(
    (element) => getComputedStyle(element).color,
  );
  await difficultyButton.hover();
  await expect(difficultyButton).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(difficultyIcon).toHaveClass(
    /group-hover:text-slate-600/,
  );
  expect(await difficultyIcon.evaluate((element) => getComputedStyle(element).color))
    .not.toBe(restingIconColor);
  await expect(difficultyNumber).toHaveCSS("color", "rgb(40, 35, 93)");
  await difficultyButton.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Task 1" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByText("I will win a trick using a 5", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await choose(page, "Outcome", "Pending");
  await expect(firstDeepSeaGoal.locator("[data-task-outcome]"))
    .toHaveAttribute("data-task-outcome", "pending");
  await expect(deepSeaStatus).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(deepSeaStatus.locator("svg")).toHaveCSS(
    "color",
    "rgb(0, 0, 0)",
  );

  await choose(page, "Outcome", "Failed");
  await expect(firstDeepSeaGoal.locator("[data-task-outcome]"))
    .toHaveAttribute("data-task-outcome", "failure");
  await expect(deepSeaStatus).toHaveClass(/bg-red-600/);
  await expect(deepSeaStatus.locator("svg")).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );

  await choose(page, "Outcome", "Successful");

  await choose(page, "Asset mode", "Planet X");
  await expect(
    page.getByRole("combobox", { name: "Difficulty", exact: true }),
  ).toHaveCount(0);

  const orderControl = page.getByRole("combobox", {
    name: "Order",
    exact: true,
  });
  await orderControl.click();
  await expect(page.getByRole("option")).toHaveCount(10);
  await page.keyboard.press("Escape");
  await choose(page, "Order", "Last trick · Ω");

  const planetXGoals = page.locator("[data-asset-goal]");
  const firstPlanetXGoal = planetXGoals.first();
  await expect(planetXGoals).toHaveCount(NON_TRUMP_CARDS.length);
  await expect(firstPlanetXGoal).toHaveAttribute(
    "data-asset-emphasized",
    "false",
  );
  await expect(firstPlanetXGoal).toHaveAttribute(
    "data-asset-order",
    "last-trick",
  );
  await expect(firstPlanetXGoal.locator('[data-slot="task-card"]')).toBeVisible();
  await expect(firstPlanetXGoal.locator("[data-task-outcome]"))
    .toHaveAttribute("data-task-outcome", "success");
  const planetXBoot = firstPlanetXGoal.locator('[data-slot="task-boot"]');
  await expect(planetXBoot).toBeVisible();
  const planetXStatus = planetXBoot.locator('[data-slot="task-status"]');
  await expect(planetXStatus).toBeVisible();
  const planetXOrder = planetXBoot.locator('[data-slot="task-order"]');
  await expect(planetXOrder).toBeVisible();
  await expect(planetXOrder).toHaveCSS("border-width", "0px");
  expect(
    await planetXOrder.evaluate(
      (element) => getComputedStyle(element).fontSize,
    ),
  ).toBe(difficultyFontSize);
  expect(
    await planetXBoot.evaluate((element) =>
      Array.from(element.children, (child) => child.getAttribute("data-slot")),
    ),
  ).toEqual(["task-order", "task-status"]);
  expect(
    await planetXBoot
      .locator(":scope > [data-slot]")
      .evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().height),
      ),
  ).toEqual([14, 14]);
  await expect(
    planetXBoot.locator('[data-slot="deep-sea-task-difficulty"]'),
  ).toHaveCount(0);
  await expect(
    planetXBoot.getByRole("button", { name: /View details for/ }),
  ).toHaveCount(0);
  await expect(firstPlanetXGoal.getByRole("img")).toHaveAccessibleName(
    /Unassigned\. Successful\. Order last-trick\./,
  );

  await choose(page, "Asset mode", "Mission Deep Sea");
  const firstDeepSeaGoalAfterOrder = page.locator("[data-asset-goal]").first();
  await expect(firstDeepSeaGoalAfterOrder).toHaveAttribute(
    "data-asset-order",
    "none",
  );
  await expect(
    firstDeepSeaGoalAfterOrder.locator('[data-slot="task-order"]'),
  ).toHaveCount(0);
});

test("the temporary components route is removed", async ({ page }) => {
  const response = await page.goto("/assets/components");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
});
