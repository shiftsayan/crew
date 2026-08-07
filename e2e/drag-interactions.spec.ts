import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Locator,
  type Page,
  type Route,
} from "@playwright/test";

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

function makeTaskAssignmentProjection(): ActorProjection {
  const projection = makeProjection();

  return {
    ...projection,
    mission: {
      ...projection.mission,
      editionKey: "deep-sea",
      missionKey: "deep-sea:1",
      title: "First Dive",
      manualRule: false,
    },
    phase: "assigning-tasks",
    players: projection.players.map((player) => ({
      ...player,
      isCurrent: false,
    })),
    tasks: [
      {
        id: "task-1",
        definitionId: "deep-sea-task-85",
        difficulty: 3,
        cardId: null,
        order: null,
        ownerPlayerId: null,
        ownerDisplayName: null,
        outcome: "pending",
        title: "I will win exactly two 9s",
        footnote: null,
      },
    ],
    legalActions: {
      ...projection.legalActions,
      canStartTrick: false,
      claimableTaskIds: ["task-1"],
      playableCardIds: [],
      communicationOptions: [],
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
  initialProjection: Projection = makeProjection(),
) {
  let projection = initialProjection;
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

async function dragTaskFace(
  page: Page,
  taskButton: Locator,
  target: Locator,
  ownStation: Locator,
  allowed: boolean,
) {
  const source = taskButton.locator('[data-slot="task-face"]');
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

  await page.mouse.move(sourcePoint.x, sourcePoint.y);
  await page.mouse.down();
  await page.mouse.move(sourcePoint.x + 12, sourcePoint.y, { steps: 2 });
  await expect(ownStation).toHaveAttribute(
    "data-task-drop-state",
    "available",
  );
  await page.mouse.move(targetPoint.x, targetPoint.y, { steps: 12 });
  await expect(ownStation).toHaveAttribute(
    "data-task-drop-state",
    allowed ? "active" : "available",
  );
  await page.mouse.up();
}

async function expectNoAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations).toEqual([]);
}

test("a task face only assigns when dropped on the current player's Crew station", async ({
  page,
}) => {
  const initialProjection = makeTaskAssignmentProjection();
  const { actions } = await openMockedRoom(
    page,
    (command, projection) => {
      if (command.type !== "claim-task") return projection;

      return {
        ...projection,
        phase: "ready-to-start-trick",
        tasks: projection.tasks.map((task) =>
          task.id === command.taskId
            ? {
                ...task,
                ownerPlayerId: projection.self.id,
                ownerDisplayName: projection.self.displayName,
              }
            : task,
        ),
        legalActions: {
          ...projection.legalActions,
          canStartTrick: true,
          claimableTaskIds: [],
          releasableTaskIds: [command.taskId as string],
        },
      };
    },
    initialProjection,
  );
  const taskButton = page.getByRole("button", {
    name: "Assign I will win exactly two 9s to me",
  });
  const ownStation = page.locator('[data-task-drop-target="claim"]');
  const otherStation = page.getByRole("article", {
    name: "Grace station",
  });

  await expect(taskButton.locator('[data-slot="task-face"]')).toBeVisible();
  await expect(taskButton.locator('[data-slot="task-boot"]')).toHaveCount(0);
  await dragTaskFace(page, taskButton, otherStation, ownStation, false);
  await expect(taskButton).toHaveAttribute("data-task-dragging", "false");
  await expect(ownStation).toHaveAttribute("data-task-drop-state", "idle");
  expect(actions).toEqual([]);

  await dragTaskFace(page, taskButton, ownStation, ownStation, true);

  await expect.poll(() => actions).toEqual([
    { type: "claim-task", taskId: "task-1" },
  ]);
  await expect(
    page
      .getByRole("region", { name: "Mission board" })
      .getByRole("button", {
        name: "Deselect I will win exactly two 9s",
      }),
  ).toBeVisible();
});

test("task assignment keeps click and keyboard fallbacks", async ({ page }) => {
  const { actions } = await openMockedRoom(
    page,
    (_command, projection) => projection,
    makeTaskAssignmentProjection(),
  );
  const taskButton = page.getByRole("button", {
    name: "Assign I will win exactly two 9s to me",
  });

  await taskButton.locator('[data-slot="task-face"]').click();
  await expect.poll(() => actions).toEqual([
    { type: "claim-task", taskId: "task-1" },
  ]);
  await expect(taskButton).toBeEnabled();

  actions.length = 0;
  await taskButton.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => actions).toEqual([
    { type: "claim-task", taskId: "task-1" },
  ]);
  await expect(taskButton).toBeEnabled();

  actions.length = 0;
  await taskButton.focus();
  await page.keyboard.press("Space");
  await expect.poll(() => actions).toEqual([
    { type: "claim-task", taskId: "task-1" },
  ]);
});

test("a long-press touch drag assigns a task on a touch screen", async ({
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
    const { actions } = await openMockedRoom(
      page,
      (_command, projection) => projection,
      makeTaskAssignmentProjection(),
    );
    const source = page
      .getByRole("button", {
        name: "Assign I will win exactly two 9s to me",
      })
      .locator('[data-slot="task-face"]');
    const target = page.locator('[data-task-drop-target="claim"]');
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
    await expect(target).toHaveAttribute("data-task-drop-state", "available");
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
    await expect(target).toHaveAttribute("data-task-drop-state", "active");
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });

    await expect.poll(() => actions).toEqual([
      { type: "claim-task", taskId: "task-1" },
    ]);
  } finally {
    await context.close();
  }
});

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
      .getByRole("button", { name: "Pink 1", exact: true }),
  ).toBeDisabled();
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
