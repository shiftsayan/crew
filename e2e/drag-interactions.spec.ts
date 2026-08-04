import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

import type { ActorProjection, Card } from "../src/components/game/types";

const roomName = "DragLab";
const playerName = "Ada";

const cards = [
  { id: "pink-1", suit: "pink", value: 1 },
  { id: "blue-2", suit: "blue", value: 2 },
  { id: "green-3", suit: "green", value: 3 },
  { id: "yellow-4", suit: "yellow", value: 4 },
  { id: "blue-7", suit: "blue", value: 7 },
  { id: "blue-1", suit: "blue", value: 1 },
  { id: "green-9", suit: "green", value: 9 },
  { id: "pink-8", suit: "pink", value: 8 },
] satisfies Card[];

function makeProjection(): ActorProjection {
  return {
    room: { id: "room-drag-lab", name: roomName },
    mission: {
      editionKey: "planet-nine",
      missionKey: "planet-nine:1",
      number: 1,
      title: "First Launch",
      attemptNumber: 1,
      manualRule: true,
      deadSpot: false,
    },
    phase: "between-tricks",
    result: null,
    self: {
      id: "player-1",
      displayName: playerName,
      tags: [],
      seat: 1,
      hand: [...cards],
      captured: [],
      tricksWon: 0,
      communication: null,
    },
    players: [
      {
        id: "player-1",
        displayName: playerName,
        tags: [],
        seat: 1,
        cardCount: cards.length,
        tricksWon: 0,
        communication: null,
        isCaptain: true,
        isCurrent: true,
      },
      {
        id: "player-2",
        displayName: "Grace",
        tags: [],
        seat: 2,
        cardCount: 0,
        tricksWon: 0,
        communication: null,
        isCaptain: false,
        isCurrent: false,
      },
      {
        id: "player-3",
        displayName: "Katherine",
        tags: [],
        seat: 3,
        cardCount: 0,
        tricksWon: 0,
        communication: null,
        isCaptain: false,
        isCurrent: false,
      },
    ],
    tasks: [],
    currentTrick: null,
    lastTrick: null,
    legalActions: {
      canStartMission: false,
      canStartTrick: true,
      claimableTaskIds: [],
      releasableTaskIds: [],
      canPassTask: false,
      playableCardIds: cards.map((card) => card.id),
      communicationOptions: [
        { cardId: "pink-1", qualifiers: ["lowest"] },
        { cardId: "blue-2", qualifiers: ["highest", "lowest"] },
      ],
      taskOutcomeTaskIds: [],
      canSetMissionOutcome: false,
    },
  };
}

type Projection = ActorProjection;

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    body: JSON.stringify(body),
    contentType: "application/json",
    status: 200,
  });
}

async function openMockedRoom(
  page: Page,
  onAction: (command: Record<string, unknown>, projection: Projection) => Projection,
) {
  let projection = makeProjection();
  const actions: Array<Record<string, unknown>> = [];

  await page.addInitScript(
    ({ name, storedPlayerName }) => {
      window.localStorage.setItem(
        `crew:credentials:${name.toLowerCase()}`,
        JSON.stringify({ roomName: name, playerName: storedPlayerName }),
      );
    },
    { name: roomName, storedPlayerName: playerName },
  );
  await page.route(`**/api/rooms/${roomName}/actions`, async (route) => {
    const command = route.request().postDataJSON() as Record<string, unknown>;
    actions.push(command);
    projection = onAction(command, projection);
    await fulfillJson(route, projection);
  });
  await page.route(`**/api/rooms/${roomName}`, async (route) => {
    await fulfillJson(route, projection);
  });

  await page.goto(`/rooms/${roomName}`);
  await expect(page.getByRole("region", { name: "Your hand" })).toBeVisible();

  return { actions };
}

async function handCardIds(page: Page) {
  return page
    .locator('[data-slot="hand-card-row"] > [data-card-id]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-card-id")),
    );
}

async function handAlignment(page: Page) {
  return page.locator('[data-slot="hand-scroll-area"]').evaluate((area) => {
    const dock = area.closest('[aria-label="Your hand"]');
    const cards = Array.from(area.querySelectorAll("[data-card-id]"));
    if (!dock || cards.length === 0) return null;

    const dockRect = dock.getBoundingClientRect();
    const firstRect = cards[0].getBoundingClientRect();
    const lastRect = cards[cards.length - 1].getBoundingClientRect();
    const cardsCenter = (firstRect.left + lastRect.right) / 2;

    return {
      horizontalDelta: cardsCenter - (dockRect.left + dockRect.width / 2),
      topGap: firstRect.top - dockRect.top,
      bottomGap: dockRect.bottom - firstRect.bottom,
    };
  });
}

async function dragCard(page: Page, cardId: string, targetSelector: string) {
  await page
    .locator(`[data-card-id="${cardId}"] [data-slot="game-card"]`)
    .dragTo(page.locator(targetSelector), { steps: 12 });
}

async function expectNoAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations).toEqual([]);
}

test("dragging a legal card to the played station plays it", async ({
  page,
}) => {
  const { actions } = await openMockedRoom(page, (command, projection) => {
    if (command.type !== "play-card") return projection;
    const cardId = command.cardId as string;

    return {
      ...projection,
      phase: "playing-trick",
      self: {
        ...projection.self,
        hand: projection.self.hand.filter((card) => card.id !== cardId),
      },
      players: projection.players.map((player, index) => ({
        ...player,
        cardCount: index === 0 ? player.cardCount - 1 : player.cardCount,
        isCurrent: index === 1,
      })),
      currentTrick: {
        number: 1,
        leaderPlayerId: "player-1",
        plays: [{ playerId: "player-1", cardId }],
        winnerPlayerId: null,
      },
      legalActions: {
        ...projection.legalActions,
        playableCardIds: [],
        communicationOptions: [],
      },
    };
  });

  expect(await handCardIds(page)).toEqual([
    "pink-1",
    "blue-2",
    "green-3",
    "yellow-4",
    "blue-7",
    "blue-1",
    "green-9",
    "pink-8",
  ]);
  await expect(page.getByRole("region", { name: "Crew" })).toHaveAttribute(
    "data-crew-layout",
    "compact",
  );
  await expect(
    page.locator('[data-slot="hand-drag-instructions"]'),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Drag / })).toHaveCount(0);
  await expect(page.locator('[data-slot="hand-card-row"]')).toHaveCSS(
    "justify-content",
    "center",
  );
  const alignment = await handAlignment(page);
  expect(alignment).not.toBeNull();
  expect(Math.abs(alignment!.horizontalDelta)).toBeLessThanOrEqual(1);
  expect(Math.abs(alignment!.topGap - alignment!.bottomGap)).toBeLessThanOrEqual(
    1,
  );
  expect(alignment!.topGap).toBeLessThanOrEqual(8.5);

  await dragCard(page, "pink-1", '[data-card-drop-target="play"]');

  await expect.poll(() => actions).toEqual([
    { type: "play-card", cardId: "pink-1" },
  ]);
  await expect(
    page
      .getByRole("article", { name: "Ada station" })
      .getByRole("img", { name: "Pink 1", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Crew" })).toHaveAttribute(
    "data-crew-layout",
    "main",
  );
  expect(await handCardIds(page)).toEqual([
    "blue-2",
    "green-3",
    "yellow-4",
    "blue-7",
    "blue-1",
    "green-9",
    "pink-8",
  ]);
});

test("dragging to communication opens the existing qualifier picker", async ({
  page,
}) => {
  const { actions } = await openMockedRoom(page, (command, projection) => ({
    ...projection,
    self: {
      ...projection.self,
      communication: {
        cardId: command.cardId as Card["id"],
        qualifier: command.qualifier as "highest" | "only" | "lowest",
      },
    },
    players: projection.players.map((player, index) =>
      index === 0
        ? {
            ...player,
            communication: {
              cardId: command.cardId as Card["id"],
              qualifier: command.qualifier as "highest" | "only" | "lowest",
            },
          }
        : player,
    ),
    legalActions: {
      ...projection.legalActions,
      communicationOptions: [],
    },
  }));

  await dragCard(
    page,
    "blue-2",
    '[data-card-drop-target="communicate"]',
  );

  const picker = page.getByRole("group", { name: "Choose communication" });
  await expect(picker).toBeVisible();
  await expect(picker.getByRole("button", { name: "Highest" })).toBeFocused();
  expect(actions).toEqual([]);
  await expectNoAccessibilityViolations(page);

  await page.waitForTimeout(75);
  await picker.getByRole("button", { name: "Highest" }).click();
  await expect.poll(() => actions).toEqual([
    { type: "communicate", cardId: "blue-2", qualifier: "highest" },
  ]);
  await expect(picker).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Your hand" })).toBeFocused();
});

test("existing click and keyboard card actions remain available", async ({
  page,
}) => {
  const { actions } = await openMockedRoom(page, (_command, projection) =>
    projection,
  );

  const playCard = page.getByRole("button", { name: "Play: Pink 1" });
  await playCard.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => actions).toEqual([
    { type: "play-card", cardId: "pink-1" },
  ]);

  actions.length = 0;
  await page.getByRole("button", { name: "Communicate a card" }).click();
  await page.keyboard.press("Tab");
  const communicationCard = page.getByRole("button", {
    name: "Communicate: Pink 1",
  });
  await expect(communicationCard).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Lowest" })).toBeFocused();
  await page.getByRole("button", { name: "Lowest" }).click();
  await expect.poll(() => actions).toEqual([
    { type: "communicate", cardId: "pink-1", qualifier: "lowest" },
  ]);
});

test("a long-press touch drag plays a card on a touch screen", async ({
  browser,
}, testInfo) => {
  const baseURL = testInfo.project.use.baseURL;
  if (typeof baseURL !== "string") {
    throw new Error("The Playwright project must define a base URL.");
  }

  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 1024, height: 640 },
  });
  const page = await context.newPage();

  try {
    const { actions } = await openMockedRoom(page, (_command, projection) =>
      projection,
    );
    const alignment = await handAlignment(page);
    expect(alignment).not.toBeNull();
    expect(Math.abs(alignment!.horizontalDelta)).toBeLessThanOrEqual(1);
    expect(Math.abs(alignment!.topGap - alignment!.bottomGap)).toBeLessThanOrEqual(
      1,
    );
    const source = page.locator(
      '[data-card-id="pink-1"] [data-slot="game-card"]',
    );
    const target = page.locator('[data-card-drop-target="play"]');
    const [sourceBox, targetBox] = await Promise.all([
      source.boundingBox(),
      target.boundingBox(),
    ]);
    expect(sourceBox).not.toBeNull();
    expect(targetBox).not.toBeNull();

    const sourcePoint = {
      x: sourceBox!.x + sourceBox!.width / 2,
      y: sourceBox!.y + sourceBox!.height / 2,
    };
    const targetPoint = {
      x: targetBox!.x + targetBox!.width / 2,
      y: targetBox!.y + targetBox!.height / 2,
    };
    const client = await context.newCDPSession(page);

    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [sourcePoint],
    });
    await page.waitForTimeout(220);
    await expect(target).toHaveAttribute("data-drop-state", "available");
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: (sourcePoint.x + targetPoint.x) / 2,
          y: (sourcePoint.y + targetPoint.y) / 2,
        },
      ],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [targetPoint],
    });
    await expect(target).toHaveAttribute("data-drop-state", "active");
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });

    await expect.poll(() => actions).toEqual([
      { type: "play-card", cardId: "pink-1" },
    ]);
  } finally {
    await context.close();
  }
});
