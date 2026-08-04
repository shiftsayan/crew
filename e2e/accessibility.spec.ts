import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const roomName = "Europa";
const playerName = "Ada";

const players = [
  {
    id: "player-1",
    displayName: "Ada",
    tags: ["bug"],
    seat: 1,
    cardCount: 0,
    tricksWon: 0,
    communication: null,
    isCaptain: true,
    isCurrent: false,
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
];

const baseProjection = {
  room: { id: "room-e2e", name: roomName },
  mission: {
    editionKey: "planet-nine",
    missionKey: "planet-nine:1",
    number: 1,
    title: "First Launch",
    attemptNumber: 1,
    manualRule: true,
    deadSpot: false,
  },
  result: null,
  self: {
    id: "player-1",
    displayName: "Ada",
    tags: ["bug"],
    seat: 1,
    hand: [],
    captured: [],
    tricksWon: 0,
    communication: null,
  },
  players,
  tasks: [],
  currentTrick: null,
  lastTrick: null,
  legalActions: {
    canStartMission: true,
    canStartTrick: false,
    claimableTaskIds: [],
    releasableTaskIds: [],
    canPassTask: false,
    playableCardIds: [],
    communicationOptions: [],
    taskOutcomeTaskIds: [],
    canSetMissionOutcome: false,
  },
};

const activeProjection = {
  ...baseProjection,
  phase: "between-tricks",
  self: {
    ...baseProjection.self,
    hand: [{ id: "pink-1", suit: "pink", value: 1 }],
  },
  players: baseProjection.players.map((player, index) => ({
    ...player,
    cardCount: index === 0 ? 1 : 0,
    isCurrent: index === 0,
  })),
  tasks: [
    {
      id: "task-1",
      definitionId: "planet-nine-task",
      difficulty: null,
      cardId: "pink-1",
      order: "first",
      ownerPlayerId: "player-1",
      ownerDisplayName: "Ada",
      outcome: "pending",
      title: "Win the Pink 1",
      footnote: null,
    },
  ],
  legalActions: {
    ...baseProjection.legalActions,
    canStartTrick: true,
    playableCardIds: ["pink-1"],
    communicationOptions: [
      {
        cardId: "pink-1",
        qualifiers: ["highest", "only", "lowest"],
      },
    ],
    taskOutcomeTaskIds: ["task-1"],
  },
};

const emptyStartedTrickProjection = {
  ...activeProjection,
  phase: "playing-trick",
  currentTrick: {
    number: 1,
    leaderPlayerId: "player-1",
    plays: [],
    winnerPlayerId: null,
  },
  legalActions: {
    ...activeProjection.legalActions,
    canStartTrick: false,
    communicationOptions: [],
  },
};

const resolvedBetweenProjection = {
  ...activeProjection,
  tasks: activeProjection.tasks.map((task) => ({
    ...task,
    outcome: "success",
  })),
  legalActions: {
    ...activeProjection.legalActions,
    canSetMissionOutcome: true,
  },
};

const assigningProjection = {
  ...activeProjection,
  phase: "assigning-tasks",
  players: activeProjection.players.map((player) => ({
    ...player,
    isCurrent: false,
  })),
  tasks: activeProjection.tasks.map((task) => ({
    ...task,
    ownerPlayerId: null,
    ownerDisplayName: null,
  })),
  currentTrick: null,
  lastTrick: null,
  legalActions: {
    ...baseProjection.legalActions,
    canStartMission: false,
    claimableTaskIds: ["task-1"],
  },
};

const partialAssigningProjection = {
  ...assigningProjection,
  tasks: [
    activeProjection.tasks[0],
    {
      ...activeProjection.tasks[0],
      id: "task-2",
      cardId: "blue-2",
      ownerPlayerId: null,
      ownerDisplayName: null,
      title: "Win the Blue 2",
    },
  ],
  legalActions: {
    ...assigningProjection.legalActions,
    claimableTaskIds: ["task-2"],
    releasableTaskIds: ["task-1"],
  },
};

const releasedAssigningProjection = {
  ...partialAssigningProjection,
  tasks: partialAssigningProjection.tasks.map((task) => ({
    ...task,
    ownerPlayerId: null,
    ownerDisplayName: null,
  })),
  legalActions: {
    ...partialAssigningProjection.legalActions,
    claimableTaskIds: ["task-1", "task-2"],
    releasableTaskIds: [],
  },
};

const readyToStartTrickProjection = {
  ...activeProjection,
  phase: "ready-to-start-trick",
  players: activeProjection.players.map((player) => ({
    ...player,
    isCurrent: false,
  })),
  legalActions: {
    ...baseProjection.legalActions,
    canStartMission: false,
    canStartTrick: true,
    releasableTaskIds: ["task-1"],
  },
};

const playedProjection = {
  ...activeProjection,
  phase: "playing-trick",
  self: {
    ...activeProjection.self,
    hand: [],
  },
  players: activeProjection.players.map((player, index) => ({
    ...player,
    cardCount: 0,
    isCurrent: index === 1,
  })),
  currentTrick: {
    number: 1,
    leaderPlayerId: "player-1",
    plays: [{ playerId: "player-1", cardId: "pink-1" }],
    winnerPlayerId: null,
  },
  lastTrick: null,
  legalActions: {
    ...baseProjection.legalActions,
    canStartMission: false,
    taskOutcomeTaskIds: ["task-1"],
  },
};

const completedTrickProjection = {
  ...playedProjection,
  phase: "between-tricks",
  players: playedProjection.players.map((player, index) => ({
    ...player,
    isCurrent: index === 0,
  })),
  currentTrick: null,
  lastTrick: {
    number: 1,
    leaderPlayerId: "player-1",
    plays: [
      { playerId: "player-1", cardId: "pink-1" },
      { playerId: "player-2", cardId: "blue-2" },
      { playerId: "player-3", cardId: "green-3" },
    ],
    winnerPlayerId: "player-1",
  },
};

const adminRoom = {
  id: "admin-room-e2e",
  name: "Europa",
  editionKey: "planet-nine",
  missionKey: "planet-nine:1",
  missionNumber: 1,
  missionTitle: "First Launch",
  phase: "preflight",
  restartRequired: false,
  attemptNumber: 1,
  playerCount: 3,
  updatedAt: "2026-07-30T12:00:00.000Z",
};

const adminPlayers = [
  {
    id: "admin-player-1",
    displayName: "Ada",
    tags: ["bug"],
    seat: 1,
  },
  {
    id: "admin-player-2",
    displayName: "Grace",
    tags: [],
    seat: 2,
  },
  {
    id: "admin-player-3",
    displayName: "Katherine",
    tags: [],
    seat: 3,
  },
];

const editionOptions = [
  {
    key: "planet-nine",
    title: "The Quest for Planet Nine",
    missions: [
      { key: "planet-nine:1", number: 1, title: "First Launch" },
      { key: "planet-nine:2", number: 2, title: "Low Orbit" },
    ],
  },
  {
    key: "deep-sea",
    title: "Mission Deep Sea",
    missions: [{ key: "deep-sea:1", number: 1, title: "First Dive" }],
  },
];

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

  expect(dimensions.bodyWidth).toBeLessThanOrEqual(
    dimensions.viewportWidth,
  );
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

  expect(dimensions.bodyHeight).toBeLessThanOrEqual(
    dimensions.viewportHeight,
  );
  expect(dimensions.documentHeight).toBeLessThanOrEqual(
    dimensions.viewportHeight,
  );
}

async function expectPassportShell(page: Page) {
  const passport = page.locator("[data-passport]");

  await expect(passport).toHaveCount(1);
  await expect(passport).toHaveAttribute("data-slot", "card");
  await expect(passport).toHaveClass(/\bmax-w-sm\b/);
  await expect(passport).toHaveCSS("backdrop-filter", /blur\(/);
  expect(
    await passport.locator('[data-slot="card-header"]').getAttribute("class"),
  ).not.toMatch(/\b(?:justify-items-center|text-center)\b/);
  await expect(
    passport.locator('[data-slot="card-title"] [data-slot="crew-logo"]'),
  ).toHaveCount(1);
  const title = passport.locator('[data-slot="passport-title"]');
  if (await title.count()) {
    await expect(title).toHaveCSS("font-weight", "500");
  }
}

async function expectKeyboardReachable(page: Page, label: string) {
  const control = page.getByRole("button", { name: label });
  await expect(control).toBeVisible();

  for (let press = 0; press < 40; press += 1) {
    await page.keyboard.press("Tab");
    if (await control.evaluate((element) => element === document.activeElement)) {
      await expect(control).toBeFocused();
      return;
    }
  }

  throw new Error(`${label} was not reachable within 40 Tab presses.`);
}

async function mockAuthenticatedAdmin(
  page: Page,
  rooms = [adminRoom],
) {
  await page.route("**/api/admin/rooms**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const requestedRoom = rooms.find(
      (room) => pathname === `/api/admin/rooms/${room.id}`,
    );

    if (request.method() !== "GET") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ room: { ...adminRoom, players: adminPlayers } }),
        status: 200,
      });
      return;
    }

    if (requestedRoom) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ...requestedRoom, players: adminPlayers }),
        status: 200,
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        editions: editionOptions,
        rooms,
      }),
      status: 200,
    });
  });
}

test("admin displays the canonical phase identifier", async ({ page }) => {
  const assigningRoom = { ...adminRoom, phase: "assigning-tasks" };
  await mockAuthenticatedAdmin(page, [assigningRoom]);
  await page.goto("/admin");
  await page
    .getByRole("button", { name: `Manage ${assigningRoom.name}` })
    .click();

  await expect(page.getByLabel("Room phase")).toHaveText("assigning-tasks");
});

test("empty admin editor stays clear with aligned sidebar actions", async ({ page }) => {
  await mockAuthenticatedAdmin(page, []);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin");

  const newRoomButton = page.getByRole("button", { name: "New room" });
  const signOutButton = page.getByRole("button", { name: "Sign out" });
  for (const adminAction of [newRoomButton, signOutButton]) {
    await expect(adminAction).toBeVisible();
    await expect(adminAction).toHaveAttribute("data-size", "default");
    await expect(adminAction).toHaveCSS("height", "36px");
    expect(await adminAction.getAttribute("class")).not.toMatch(/\bw-28\b/);
  }
  await expect(newRoomButton).toHaveAttribute("data-slot", "dialog-trigger");
  await expect(signOutButton).toHaveAttribute("data-slot", "button");
  await expect(newRoomButton).toHaveAttribute("data-variant", "default");
  await expect(signOutButton).toHaveAttribute("data-variant", "secondary");
  await expect(page.locator('[data-slot="sidebar-inset"] h1')).toHaveCount(0);
  await expect(page.locator('[data-slot="sidebar-inset"] section')).toHaveCount(0);
  await expect(page.getByText("Select a room", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Room summary" })).toHaveCount(0);
  const sidebarActionTops = await page
    .getByTestId("admin-sidebar-actions")
    .evaluate((actions) => {
      const buttons = [...actions.querySelectorAll("button")];
      return buttons.map((candidate) => {
        const box = candidate.getBoundingClientRect();
        return { left: box.left, top: box.top };
      });
    });
  expect(new Set(sidebarActionTops.map(({ top }) => Math.round(top))).size).toBe(1);
  expect(sidebarActionTops[1].left).toBeGreaterThan(sidebarActionTops[0].left);
  const consoleGeometry = await page.evaluate(() => {
    const wrapper = document.querySelector('[data-slot="sidebar-wrapper"]');
    const workspace = document.querySelector('[data-slot="sidebar-inset"]');
    const wrapperBox = wrapper?.getBoundingClientRect();
    const workspaceBox = workspace?.getBoundingClientRect();
    return {
      wrapperTop: wrapperBox?.top ?? 0,
      wrapperBottom: wrapperBox?.bottom ?? 0,
      wrapperRight: wrapperBox?.right ?? 0,
      workspaceTop: workspaceBox?.top ?? 0,
      workspaceBottom: workspaceBox?.bottom ?? 0,
      workspaceRight: workspaceBox?.right ?? 0,
    };
  });
  expect(consoleGeometry.wrapperTop).toBe(32);
  expect(consoleGeometry.workspaceTop).toBe(consoleGeometry.wrapperTop);
  expect(consoleGeometry.workspaceBottom).toBe(consoleGeometry.wrapperBottom);
  expect(consoleGeometry.workspaceRight).toBe(consoleGeometry.wrapperRight);
  await expect(page.locator('[data-artwork-effect="ascii"]')).toHaveAttribute(
    "data-artwork-effect",
    "ascii",
  );
  await expectNoHorizontalDocumentOverflow(page);
  await expectNoDocumentScroll(page);
  await expectNoAccessibilityViolations(page);
});

for (const width of [320, 375, 768, 1440]) {
  test(`join shell fits a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({
      width,
      height: width <= 375 ? 740 : 900,
    });
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Hello crewmate" }),
    ).toBeVisible();
    await expect(
      page.getByText("Enter your room key and player key.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Join a room")).toBeVisible();
    await expectNoHorizontalDocumentOverflow(page);
    await expectNoDocumentScroll(page);

    for (const control of [
      page.getByLabel("Room Key"),
      page.getByLabel("Player Key"),
    ]) {
      const box = await control.boundingBox();
      expect(box?.height).toBe(36);
    }
  });
}

test("the homepage uses shadcn New York primitives", async ({ page }) => {
  await page.goto("/");
  const joinButton = page.getByRole("button", { name: "Enter" });
  await expectPassportShell(page);
  await expect(page.locator('[data-slot="card"]')).toHaveCount(1);
  await expect(page.locator('[data-slot="field"]')).toHaveCount(2);
  await expect(page.locator('[data-slot="input"]')).toHaveCount(2);
  await expect(joinButton).toHaveAttribute("data-slot", "button");
  await expect(joinButton).toHaveAttribute("data-variant", "default");
  await expect(joinButton).toHaveAttribute("data-size", "default");
  await expect(joinButton.locator("svg")).toHaveCount(1);
  await expect(joinButton).toHaveCSS("height", "36px");
  expect(await joinButton.getAttribute("class")).not.toMatch(
    /\b(?:h-11|w-36|self-end)\b/,
  );
  await expect(joinButton).toHaveCSS("border-radius", "6px");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#ffffff",
  );
  await expect(page.locator("html")).toHaveCSS("overflow-x", "hidden");
  await expect(page.locator("body")).toHaveCSS("overflow-x", "hidden");
  await expect(page.locator("html")).toHaveCSS(
    "overscroll-behavior-x",
    "none",
  );
  expect(await page.locator("main").getAttribute("data-color-theme")).toBeNull();
  await expect(page.locator("main")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  expect(
    await page.locator("html").evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--primary").trim(),
    ),
  ).toMatch(/^(?:lab|oklch)\(/);
  await expect(page.getByText("Keys use six letters and numbers.")).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("link", { name: "Room admin" }),
  ).toHaveCount(0);
});

test("remembered logins show the room and player without a divider", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(
    ({ storedRoomName, storedPlayerName }) => {
      window.localStorage.setItem(
        `crew:credentials:${storedRoomName.toLowerCase()}`,
        JSON.stringify({
          roomName: storedRoomName,
          playerName: storedPlayerName,
        }),
      );
    },
    { storedRoomName: roomName, storedPlayerName: playerName },
  );
  const storedLogin = JSON.stringify({ roomName, playerName });
  expect(
    await page.evaluate(
      (key) => window.localStorage.getItem(key),
      `crew:credentials:${roomName.toLowerCase()}`,
    ),
  ).toBe(storedLogin);
  await page.reload();
  expect(
    await page.evaluate(
      (key) => window.localStorage.getItem(key),
      `crew:credentials:${roomName.toLowerCase()}`,
    ),
  ).toBe(storedLogin);

  const joinCard = page.getByRole("region", { name: "Join a room" });
  const deviceLabel = joinCard.getByText("On this device", { exact: true });
  const rememberedLogin = joinCard.getByRole("button", {
    name: `${roomName} · ${playerName}`,
    exact: true,
  });

  await expect(deviceLabel).toHaveCSS("letter-spacing", "normal");
  await expect(joinCard.locator('[data-slot="separator"]')).toHaveCount(0);
  await expect(rememberedLogin).toBeVisible();

  await rememberedLogin.click();
  await expect(page.getByLabel("Room Key")).toHaveValue(roomName);
  await expect(page.getByLabel("Player Key")).toHaveValue(playerName);
});

test("the not-found page returns people to the homepage", async ({ page }) => {
  await page.goto("/missing-page");

  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await expectPassportShell(page);
  await expect(page.locator('[data-slot="card"]')).toHaveCount(1);
  await expect(page.locator("[data-artwork-canvas]")).toBeVisible();
  await expectNoHorizontalDocumentOverflow(page);
  await expectNoDocumentScroll(page);
  await expectNoAccessibilityViolations(page);

  await page.getByRole("link", { name: "Return to homepage" }).click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { name: "Hello crewmate" }),
  ).toBeVisible();
});

test("the root layout owns the shared artwork layer", async ({
  page,
}) => {
  await page.goto("/");
  const artwork = page.locator("body > [data-artwork]");
  const artworkCanvas = artwork.locator("[data-artwork-canvas]");

  await expect(artwork).toHaveCount(1);
  await expect(artwork).toHaveAttribute("data-artwork-effect", "ascii");
  await expect(artworkCanvas).toBeVisible();
  await expect
    .poll(() => artworkCanvas.getAttribute("data-artwork-frame"))
    .not.toBeNull();
  const firstFrame = await artworkCanvas.getAttribute("data-artwork-frame");
  const firstCanvasSignature = await getCanvasSignature(artworkCanvas);
  await expect
    .poll(() => artworkCanvas.getAttribute("data-artwork-frame"))
    .not.toBe(firstFrame);
  expect(await getCanvasSignature(artworkCanvas)).not.toBe(
    firstCanvasSignature,
  );

  const wallpaper = await page.request.get("/crew-clouds.jpg");
  expect(wallpaper.ok()).toBe(true);
  expect(wallpaper.headers()["content-type"]).toBe("image/jpeg");
});

test("the decorations gallery uses the shared empty room renderers", async ({
  page,
}) => {
  let roomRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/rooms/")) {
      roomRequests += 1;
    }
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/decorations");

  await expect(page).toHaveTitle("Decorations · The Crew");
  const heading = page.getByRole("heading", { name: "Decorations Preview" });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveCSS("font-size", "24px");
  await expect(heading).toHaveCSS("font-weight", "500");
  const controls = page.getByRole("region", { name: "Decoration controls" });
  await expect(controls).toBeVisible();
  await expect(page.getByRole("region", { name: "Empty room dock" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Mission information" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Your hand" })).toHaveCount(0);

  const buttons = controls.locator('button[data-variant="default"]');
  await expect(buttons).toHaveCount(2);
  const previewButton = controls.getByRole("button", {
    name: "Preview 'Mission Complete'",
  });
  await expect(previewButton).toHaveAttribute(
    "data-decoration-kind",
    "mission-complete",
  );

  const decorationCanvas = page.locator(
    "canvas:not([data-artwork-canvas]):not([data-artwork-image-canvas])",
  );
  await previewButton.click();
  await expect(decorationCanvas).toHaveCount(1);
  await previewButton.click();
  await expect(decorationCanvas).toHaveCount(1);

  expect(roomRequests).toBe(0);
  await expectNoHorizontalDocumentOverflow(page);
  await expectNoDocumentScroll(page);
  await expectNoAccessibilityViolations(page);
});

test("the bug decoration stays viewport-anchored and persistent", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/decorations");

  const controls = page.getByRole("region", { name: "Decoration controls" });
  const bugButton = controls.getByRole("button", {
    name: "Preview 'Bug'",
  });
  await expect(bugButton).toHaveAttribute("data-decoration-kind", "bug");

  const bugOverlay = page.locator('[data-room-decoration="bug"]');
  await bugButton.click();
  await expect(bugOverlay).toHaveCount(1);
  await expect(bugOverlay).toHaveAttribute("aria-hidden", "true");
  await expect(bugOverlay).toHaveCSS("position", "fixed");
  await expect(bugOverlay).toHaveCSS("pointer-events", "none");

  const bugSmudge = bugOverlay.locator('[data-dead-pixel-blob="true"]');
  await expect
    .poll(() =>
      bugSmudge.evaluate((element) =>
        Number.parseFloat(window.getComputedStyle(element).opacity),
      ),
    )
    .toBeGreaterThan(0.2);
  const bugBounds = await bugSmudge.boundingBox();
  expect(bugBounds).not.toBeNull();
  expect(bugBounds?.width).toBeGreaterThan(0);
  expect(bugBounds?.height).toBeGreaterThan(0);
  expect(bugBounds?.width).toBeLessThanOrEqual(18);
  expect(bugBounds?.height).toBeLessThanOrEqual(14);
  expect(bugBounds?.x).toBeGreaterThanOrEqual(0);
  expect(bugBounds?.y).toBeGreaterThanOrEqual(0);
  expect((bugBounds?.x ?? 0) + (bugBounds?.width ?? 0)).toBeLessThanOrEqual(1440);
  expect((bugBounds?.y ?? 0) + (bugBounds?.height ?? 0)).toBeLessThanOrEqual(900);
  await expect(bugSmudge).toHaveCSS("position", "absolute");
  await expect(bugSmudge).toHaveCSS("animation-name", "none");

  const firstBugTrigger = await bugOverlay.getAttribute("data-trigger-id");
  await bugButton.click();
  await expect(bugOverlay).toHaveCount(1);
  await expect(bugOverlay).toHaveAttribute(
    "data-trigger-id",
    firstBugTrigger ?? "",
  );
  const replayedBugBounds = await bugSmudge.boundingBox();
  expect(replayedBugBounds?.x).toBeCloseTo(bugBounds?.x ?? 0);
  expect(replayedBugBounds?.y).toBeCloseTo(bugBounds?.y ?? 0);

  await page.setViewportSize({ width: 1800, height: 1125 });
  const zoomedBugBounds = await bugSmudge.boundingBox();
  expect(zoomedBugBounds).not.toBeNull();
  expect((zoomedBugBounds?.width ?? 0) / 1800).toBeCloseTo(
    (bugBounds?.width ?? 0) / 1440,
  );
  expect((zoomedBugBounds?.y ?? 0) / 1125).toBeCloseTo(
    (bugBounds?.y ?? 0) / 900,
  );
  expect(
    (1800 -
      ((zoomedBugBounds?.x ?? 0) + (zoomedBugBounds?.width ?? 0))) /
      1800,
  ).toBeCloseTo(
    (1440 - ((bugBounds?.x ?? 0) + (bugBounds?.width ?? 0))) / 1440,
  );

  await page.waitForTimeout(3_600);
  await expect(bugOverlay).toHaveCount(1);

  await controls
    .getByRole("button", { name: "Preview 'Mission Complete'" })
    .click();
  await expect(bugOverlay).toHaveCount(1);

  await expectNoHorizontalDocumentOverflow(page);
  await expectNoDocumentScroll(page);
  await expectNoAccessibilityViolations(page);
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

test("join is keyboard-operable and stores only the submitted room credentials", async ({
  page,
}) => {
  let loginBody: unknown;

  await page.route("**/api/rooms/login", async (route) => {
    loginBody = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        room: { name: roomName },
        player: { displayName: playerName },
      }),
      status: 200,
    });
  });
  await page.route(`**/api/rooms/${roomName}`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ...baseProjection, phase: "preflight" }),
      status: 200,
    });
  });

  await page.goto("/");
  const roomInput = page.getByLabel("Room Key");
  const keyInput = page.getByLabel("Player Key");

  await expect(roomInput).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(roomInput).toBeFocused();

  await expect(roomInput).toHaveAttribute("placeholder", "Enter your room key...");
  await expect(keyInput).toHaveAttribute("placeholder", "Enter your player key...");
  await page.keyboard.type(roomName);
  await expect(roomInput).toHaveValue(roomName);
  await page.keyboard.press("Tab");
  await expect(keyInput).toBeFocused();
  await page.keyboard.type(playerName);
  await expect(keyInput).toHaveValue(playerName);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Enter" })).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(new RegExp(`/rooms/${roomName}$`));
  await expect(page).toHaveTitle(`${roomName} · The Crew`);
  const startButton = page.getByRole("button", {
    name: "Start Mission",
    exact: true,
  });
  await expect(startButton).toBeVisible();
  await expect(page.getByLabel("Players in room")).toHaveCount(0);
  await expect(startButton).toHaveAttribute("data-slot", "button");
  await expect(startButton).toHaveAttribute("data-variant", "outline");
  await expect(startButton).toHaveAttribute("data-size", "sm");
  await expect(startButton).toHaveClass(/\bw-fit\b/);
  expect(await startButton.getAttribute("class")).not.toMatch(/\bw-full\b/);
  await expect(startButton).toHaveCSS("height", "32px");
  await expect(startButton.locator("svg.lucide-play")).toHaveCount(1);
  await expect(startButton.locator(":scope > :first-child")).toHaveClass(
    /\blucide-play\b/,
  );
  await expect(
    page
      .getByRole("complementary", { name: "Mission information" })
      .getByRole("button", { name: "Start Mission" }),
  ).toHaveCount(1);
  await expect(
    page
      .getByRole("region", { name: "Mission board" })
      .getByRole("button", { name: "Start Mission" }),
  ).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Mission board" })).toBeEmpty();
  await expect(
    page.getByRole("navigation", { name: "Room breadcrumb" }),
  ).toHaveCount(0);
  const crewHome = page.getByRole("link", { name: "Crew home" });
  await expect(crewHome).toHaveCount(1);
  await expect(crewHome).toHaveAttribute("href", "/");
  await expect(crewHome.locator('[data-slot="crew-logo"]')).toHaveCount(1);
  const missionSidebarHeader = page.locator(
    '[data-slot="mission-sidebar-header"]',
  );
  await expect(missionSidebarHeader).toHaveCSS("position", "sticky");
  await expect(missionSidebarHeader).toHaveCSS("top", "0px");
  await expect(missionSidebarHeader).toHaveCSS("padding-top", "16px");
  const preflightCallout = page.locator(
    '[data-slot="mission-phase-callout"]',
  );
  await expect(preflightCallout).toBeVisible();
  await expect(preflightCallout).toHaveCSS("padding", "12px");
  await expect(
    preflightCallout.getByRole("button", {
      name: "Start Mission",
      exact: true,
    }),
  ).toHaveCount(1);
  await expect(
    preflightCallout.getByText("Current phase", { exact: true }),
  ).toHaveCount(0);
  const preflightPhaseName = preflightCallout.locator(
    '[data-slot="mission-phase-name"]',
  );
  await expect(preflightPhaseName).toHaveText("Waiting for launch.");
  await expect(preflightPhaseName).toHaveCSS("font-size", "14px");
  await expect(preflightPhaseName).toHaveCSS("font-weight", "600");
  const preflightInstructions = preflightCallout.locator(
    '[data-slot="mission-phase-instructions"]',
  );
  await expect(preflightInstructions).toHaveText(
    "When everyone is ready, start the mission.",
  );
  await expect(preflightInstructions).toHaveCSS("font-size", "14px");
  await expect(preflightInstructions).toHaveCSS("font-weight", "400");
  await expect(
    preflightCallout.getByRole("progressbar", {
      name: "Task progress",
    }),
  ).toHaveCount(0);
  const missionSidebar = page.getByRole("complementary", {
    name: "Mission information",
  });
  const missionMetadata = missionSidebar.locator(
    '[data-slot="mission-sidebar-metadata"]',
  );
  await expect(
    missionMetadata.getByText("Mission", { exact: true }),
  ).toBeVisible();
  await expect(
    missionMetadata.getByText("Attempt", { exact: true }),
  ).toBeVisible();
  await expect(
    missionMetadata.getByText("The Quest for Planet Nine", { exact: true }),
  ).toBeVisible();
  const [
    crewHomeBox,
    preflightCalloutBox,
    missionSidebarBox,
    metadataBox,
    startButtonBox,
  ] = await Promise.all([
    crewHome.boundingBox(),
    preflightCallout.boundingBox(),
    missionSidebar.boundingBox(),
    missionMetadata.boundingBox(),
    startButton.boundingBox(),
  ]);
  expect(crewHomeBox).not.toBeNull();
  expect(preflightCalloutBox).not.toBeNull();
  expect(missionSidebarBox).not.toBeNull();
  expect(metadataBox).not.toBeNull();
  expect(startButtonBox).not.toBeNull();
  expect(preflightCalloutBox!.y).toBeGreaterThan(
    crewHomeBox!.y + crewHomeBox!.height,
  );
  expect(
    preflightCalloutBox!.y + preflightCalloutBox!.height,
  ).toBeLessThanOrEqual(missionSidebarBox!.y + missionSidebarBox!.height);
  const sidebarPadding = await missionSidebar.evaluate((sidebar) => {
    const style = window.getComputedStyle(sidebar);
    return {
      top: Number.parseFloat(style.paddingTop),
      right: Number.parseFloat(style.paddingRight),
      bottom: Number.parseFloat(style.paddingBottom),
      left: Number.parseFloat(style.paddingLeft),
    };
  });
  expect(sidebarPadding).toEqual({ top: 0, right: 16, bottom: 16, left: 16 });
  expect(
    Math.abs(crewHomeBox!.y - (missionSidebarBox!.y + 16)),
  ).toBeLessThanOrEqual(1);
  expect(metadataBox!.y).toBeGreaterThan(
    startButtonBox!.y + startButtonBox!.height,
  );
  const headerBoxBeforeScroll = await missionSidebarHeader.boundingBox();
  expect(headerBoxBeforeScroll).not.toBeNull();
  expect(
    Math.abs(headerBoxBeforeScroll!.y - missionSidebarBox!.y),
  ).toBeLessThanOrEqual(1);
  await missionSidebar.evaluate((sidebar) => {
    sidebar.scrollTop = sidebar.scrollHeight;
  });
  await expect
    .poll(() => missionSidebar.evaluate((sidebar) => sidebar.scrollTop))
    .toBeGreaterThan(0);
  const [headerBoxAfterScroll, visibleMetadataBox] = await Promise.all([
    missionSidebarHeader.boundingBox(),
    missionMetadata.boundingBox(),
  ]);
  expect(headerBoxAfterScroll).not.toBeNull();
  expect(visibleMetadataBox).not.toBeNull();
  expect(
    Math.abs(headerBoxAfterScroll!.y - headerBoxBeforeScroll!.y),
  ).toBeLessThanOrEqual(1);
  expect(
    await missionSidebar.evaluate((sidebar) => {
      const rect = sidebar.getBoundingClientRect();
      return Boolean(
        document
          .elementFromPoint(rect.left + rect.width / 2, rect.top + 8)
          ?.closest('[data-slot="mission-sidebar-header"]'),
      );
    }),
  ).toBe(true);
  expect(
    visibleMetadataBox!.y + visibleMetadataBox!.height,
  ).toBeLessThanOrEqual(
    missionSidebarBox!.y + missionSidebarBox!.height - sidebarPadding.bottom + 1,
  );
  expect(loginBody).toEqual({ roomName, playerName });
  await expect
    .poll(() =>
      page.evaluate(() => window.localStorage.getItem("crew:credentials:europa")),
    )
    .toBe(JSON.stringify({ roomName, playerName }));
});

test("a valid login renders an incompatible room instead of redirecting home", async ({
  page,
}) => {
  let roomRequests = 0;
  let requestedPlayerName: string | undefined;

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/rooms/login", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        room: { name: roomName },
        player: { displayName: playerName },
      }),
      status: 200,
    });
  });
  await page.route(`**/api/rooms/${roomName}`, async (route) => {
    roomRequests += 1;
    requestedPlayerName =
      route.request().headers()["x-crew-player-name"];
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        message:
          "This level was created by an incompatible game version. Ask an admin to return it to preflight.",
        error: {
          code: "LEVEL_RESTART_REQUIRED",
          message:
            "This level was created by an incompatible game version. Ask an admin to return it to preflight.",
        },
      }),
      status: 409,
    });
  });

  await page.goto("/");
  await expect
    .poll(() =>
      page.locator("[data-artwork-canvas]").getAttribute("data-artwork-frame"),
    )
    .not.toBeNull();
  await page.getByLabel("Room Key").fill(roomName);
  await page.getByLabel("Player Key").fill(playerName);
  await page.getByRole("button", { name: "Enter" }).click();

  await expect(page).toHaveURL(new RegExp(`/rooms/${roomName}$`));
  await expect(
    page.getByRole("heading", { name: "Reset required" }),
  ).toBeVisible();
  await expect(page.locator("[data-room-fallback]")).toHaveCount(1);
  await expect(
    page.getByText(
      "The game configuration has changed. Please ask an admin to reset the room.",
    ),
  ).toBeVisible();
  await expectPassportShell(page);
  expect(roomRequests).toBeGreaterThan(0);
  expect(requestedPlayerName).toBe(playerName);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.localStorage.getItem("crew:credentials:europa"),
      ),
    )
    .toBe(JSON.stringify({ roomName, playerName }));
});

test("an unavailable room uses RoomFallback with the shared Passport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(
    ({ name, storedPlayerName }) => {
      window.localStorage.setItem(
        `crew:credentials:${name.toLowerCase()}`,
        JSON.stringify({
          roomName: name,
          playerName: storedPlayerName,
        }),
      );
    },
    { name: roomName, storedPlayerName: playerName },
  );
  await page.route(`**/api/rooms/${roomName}`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        message: "Room not found.",
        error: { code: "NOT_FOUND", message: "Room not found." },
      }),
      status: 404,
    });
  });

  await page.goto(`/rooms/${roomName}`);

  await expect(
    page.getByRole("heading", { name: `${roomName} was not found` }),
  ).toBeVisible();
  await expect(page.locator("[data-room-fallback]")).toHaveCount(1);
  await expectPassportShell(page);
  await expect(
    page.getByRole("button", { name: "Forget room and go home" }),
  ).toBeVisible();
  await expectNoAccessibilityViolations(page);
});

test("the locked admin login uses the shared Passport card", async ({ page }) => {
  await page.goto("/admin");

  await expect(
    page.getByRole("heading", { name: "Hello commander" }),
  ).toBeVisible();
  await expect(
    page.getByText("Enter the admin password.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Admin Password")).toBeVisible();
  await expectPassportShell(page);
});

test("join and locked admin shells pass automated accessibility checks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page).toHaveTitle("The Crew");
  await expectNoAccessibilityViolations(page);

  await page.goto("/admin");
  await expect(page).toHaveTitle("Admin · The Crew");
  const adminPassword = page.getByLabel("Admin Password");
  await expect(adminPassword).toBeVisible();
  await expect(adminPassword).toHaveAttribute("data-slot", "input");
  await expect(adminPassword).toHaveAttribute(
    "placeholder",
    "Enter your password...",
  );
  await expect(adminPassword).toHaveCSS("height", "36px");
  await expect(adminPassword).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(adminPassword).toHaveCSS("border-radius", "6px");
  const adminEnterButton = page.getByRole("button", { name: "Enter" });
  await expect(adminEnterButton).toBeVisible();
  await expect(adminEnterButton.locator("svg")).toHaveCount(1);
  await expectPassportShell(page);
  await expect(page.locator('[data-artwork-effect="ascii"]')).toHaveAttribute(
    "data-artwork-effect",
    "ascii",
  );
  await expect(page.locator('[data-slot="card"]')).toHaveCount(1);
  await expectNoHorizontalDocumentOverflow(page);
  await expectNoAccessibilityViolations(page);
});

test("the admin authentication shell reports an incorrect password accessibly", async ({
  page,
}) => {
  await page.goto("/admin");
  const password = page.getByLabel("Admin Password");
  await expect(password).toBeFocused();
  await page.keyboard.type("definitely-wrong");
  await page.keyboard.press("Enter");

  await expect(
    page.getByRole("alert").filter({
      hasText: "The admin password is incorrect.",
    }),
  ).toBeVisible();
  await expect(password).toBeEnabled();
});

test("a selected task can be clicked to deselect only while task selection remains open", async ({
  page,
}) => {
  let projection: unknown = partialAssigningProjection;
  const actionBodies: unknown[] = [];

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
    actionBodies.push(route.request().postDataJSON());
    projection = releasedAssigningProjection;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(projection),
      status: 200,
    });
  });
  await page.route(`**/api/rooms/${roomName}`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(projection),
      status: 200,
    });
  });

  await page.goto(`/rooms/${roomName}`);
  const adaStation = page.getByRole("article", { name: "Ada station" });
  const deselectTask = adaStation.getByRole("button", {
    name: "Deselect Win the Pink 1",
    exact: true,
  });
  await expect(deselectTask).toBeVisible();
  await expect(
    page
      .getByRole("article", { name: "Grace station" })
      .getByRole("button", { name: /^Deselect / }),
  ).toHaveCount(0);

  await deselectTask.click();

  expect(actionBodies).toEqual([
    { type: "release-task", taskId: "task-1" },
  ]);
  const unassignedTasks = page.getByRole("list", {
    name: "Unassigned tasks",
  });
  await expect(
    unassignedTasks.getByRole("button", {
      name: "Assign Win the Pink 1 to me",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Deselect / }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Start Trick", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("progressbar", { name: "Task progress" }),
  ).toHaveCount(0);
  await expectNoAccessibilityViolations(page);
});

test("assigning tasks uses direct task claims and keeps played cards in the crew panel", async ({
  page,
}) => {
  let projection: unknown = assigningProjection;
  const actionBodies: unknown[] = [];

  await page.setViewportSize({ width: 1440, height: 900 });
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
    const command = route.request().postDataJSON() as { type?: string };
    actionBodies.push(command);

    if (command.type === "claim-task") {
      projection = readyToStartTrickProjection;
    } else if (command.type === "release-task") {
      projection = assigningProjection;
    } else if (command.type === "start-trick") {
      projection = activeProjection;
    } else if (command.type === "play-card") {
      projection = playedProjection;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(projection),
      status: 200,
    });
  });
  await page.route(`**/api/rooms/${roomName}`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(projection),
      status: 200,
    });
  });

  await page.goto(`/rooms/${roomName}`);

  const missionBoard = page.getByRole("region", { name: "Mission board" });
  const unassignedTasks = missionBoard.getByRole("list", {
    name: "Unassigned tasks",
  });
  const assignTask = unassignedTasks.getByRole("button", {
    name: "Assign Win the Pink 1 to me",
    exact: true,
  });

  await expect(assignTask).toBeVisible();
  await expect(
    assignTask.locator('[data-slot="task-tile"]'),
  ).toHaveCSS("border-width", "0px");
  await expect(
    page.getByText(
      "Select any unassigned task. Click one of yours again to deselect it.", {
        exact: true,
      },
    ),
  ).toBeVisible();
  await expect(page.getByText("Turn", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Pass task", exact: true }),
  ).toHaveCount(0);
  await expect(unassignedTasks.locator("[data-task-outcome]")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Claim", exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Game views" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Table", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Tasks \d+$/ })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Current trick" }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Cards in the current trick", { exact: true }),
  ).toHaveCount(0);
  const startTrick = page.getByRole("button", {
    name: "Start Trick",
    exact: true,
  });
  await expect(startTrick).toBeVisible();
  await expect(startTrick).toHaveAttribute("data-variant", "outline");
  await expect(startTrick).toHaveAttribute("data-size", "sm");
  await expect(startTrick).toBeDisabled();
  await expect(
    page.getByRole("progressbar", { name: "Task progress" }),
  ).toHaveCount(0);

  await assignTask.click();

  const adaStation = page.getByRole("article", { name: "Ada station" });
  await expect(
    adaStation.getByRole("img", {
      name: /Win the Pink 1.*Assigned to Ada/,
    }),
  ).toBeVisible();
  await expect(
    adaStation.getByRole("img", {
      name: /Win the Pink 1.*Assigned to Ada/,
    }),
  ).toHaveAttribute("title", "Win the Pink 1");
  expect(actionBodies).toEqual([
    { type: "claim-task", taskId: "task-1" },
  ]);

  await expect(
    page.getByText(
      "Review assignments. Deselect one of yours, or start the first trick.", {
        exact: true,
      },
    ),
  ).toBeVisible();
  await expect(startTrick).toBeVisible();
  await expect(startTrick).toBeEnabled();
  await expect(
    missionBoard.getByRole("list", { name: "Tasks" }),
  ).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Task progress" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Play: Pink 1", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Communicate a card", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("group", { name: "Resolve Win the Pink 1" }),
  ).toHaveCount(0);
  await expect(
    adaStation.getByRole("button", {
      name: "Deselect Win the Pink 1",
      exact: true,
    }),
  ).toBeVisible();
  await adaStation
    .getByRole("button", {
      name: "Deselect Win the Pink 1",
      exact: true,
    })
    .hover();
  await expect(
    adaStation.getByRole("button", {
      name: "Deselect Win the Pink 1",
      exact: true,
    }),
  ).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(
    adaStation.locator('[data-slot="task-tile"]'),
  ).toHaveCSS("border-width", "0px");
  await expect(missionBoard.getByText("Ada", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Turn", { exact: true })).toHaveCount(0);

  await adaStation
    .getByRole("button", {
      name: "Deselect Win the Pink 1",
      exact: true,
    })
    .click();
  await expect(assignTask).toBeVisible();
  await expect(startTrick).toBeDisabled();
  expect(actionBodies).toEqual([
    { type: "claim-task", taskId: "task-1" },
    { type: "release-task", taskId: "task-1" },
  ]);

  await assignTask.click();
  await expect(startTrick).toBeEnabled();

  await startTrick.click();

  await expect(missionBoard).toBeVisible();
  await expect(missionBoard).toHaveAttribute(
    "data-game-surface",
    "between-tricks",
  );
  await expect(page.getByRole("region", { name: "Crew" })).toHaveAttribute(
    "data-crew-layout",
    "compact",
  );
  await expect(
    missionBoard.getByRole("group", { name: "Resolve Win the Pink 1" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Deselect / }),
  ).toHaveCount(0);
  await expect(startTrick).toBeVisible();
  await expect(startTrick).toBeEnabled();
  await expect(
    page.getByRole("progressbar", { name: "Task progress" }),
  ).toHaveAttribute("aria-valuetext", "Successful tasks: 0 of 1");
  expect(actionBodies).toEqual([
    { type: "claim-task", taskId: "task-1" },
    { type: "release-task", taskId: "task-1" },
    { type: "claim-task", taskId: "task-1" },
    { type: "start-trick" },
  ]);

  await page.getByRole("button", { name: "Play: Pink 1" }).click();

  await expect(missionBoard).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Crew" })).toHaveAttribute(
    "data-crew-layout",
    "main",
  );

  await expect(
    adaStation.getByRole("img", { name: "Pink 1", exact: true }),
  ).toBeVisible();
  await expect(
    adaStation.getByRole("group", { name: "Resolve Win the Pink 1" }),
  ).toBeVisible();
  expect(actionBodies).toEqual([
    { type: "claim-task", taskId: "task-1" },
    { type: "release-task", taskId: "task-1" },
    { type: "claim-task", taskId: "task-1" },
    { type: "start-trick" },
    { type: "play-card", cardId: "pink-1" },
  ]);
  await expect(
    page.getByRole("heading", { name: "Current trick" }),
  ).toHaveCount(0);

  projection = completedTrickProjection;
  await page.reload();

  await expect(page.getByRole("region", { name: "Mission board" })).toHaveAttribute(
    "data-game-surface",
    "between-tricks",
  );
  await expect(page.getByRole("region", { name: "Crew" })).toHaveAttribute(
    "data-crew-layout",
    "compact",
  );
  await expect(page.getByRole("region", { name: "Crew" })).toBeVisible();
  await expect(
    page
      .getByRole("article", { name: "Ada station" })
      .getByRole("img", { name: "Pink 1", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("article", { name: "Grace station" })
      .getByRole("img", { name: "Blue 2", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("article", { name: "Katherine station" })
      .getByRole("img", { name: "Green 3", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Current trick" }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Cards in the current trick", { exact: true }),
  ).toHaveCount(0);
  await expectNoAccessibilityViolations(page);
});

test("between tricks exposes task status, commander result, and cardless Start Trick controls", async ({
  page,
}) => {
  let projection: unknown = activeProjection;
  const actionBodies: unknown[] = [];

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
    const command = route.request().postDataJSON() as { type?: string };
    actionBodies.push(command);
    if (command.type === "set-task-outcome") {
      projection = resolvedBetweenProjection;
    } else if (command.type === "begin-trick") {
      projection = emptyStartedTrickProjection;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(projection),
      status: 200,
    });
  });
  await page.route(`**/api/rooms/${roomName}`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(projection),
      status: 200,
    });
  });

  await page.goto(`/rooms/${roomName}`);
  await expect(
    page.getByRole("button", { name: "Mission complete", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Mark Win the Pink 1 successful" })
    .click();
  await expect(
    page.getByRole("button", { name: "Mission complete", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mission failed", exact: true }),
  ).toBeVisible();

  projection = activeProjection;
  await page.reload();
  await page
    .getByRole("button", { name: "Start Trick", exact: true })
    .click();
  await expect(page.getByRole("region", { name: "Mission board" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("region", { name: "Crew" })).toHaveAttribute(
    "data-crew-layout",
    "main",
  );
  await expect(
    page.getByRole("button", { name: "Communicate a card", exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("article", { name: "Ada station" })
      .getByText("Turn", { exact: true }),
  ).toBeVisible();
  expect(actionBodies).toEqual([
    {
      type: "set-task-outcome",
      taskId: "task-1",
      outcome: "success",
    },
    { type: "begin-trick" },
  ]);
});

test("the between-tricks control surface is accessible, viewport-bound, and keyboard reachable", async ({
  page,
}) => {
  let actionBody: unknown;

  await page.addInitScript(
    ({ name, storedPlayerName }) => {
      window.localStorage.setItem(
        `crew:credentials:${name.toLowerCase()}`,
        JSON.stringify({
          roomName: name,
          playerName: storedPlayerName,
        }),
      );
    },
    { name: roomName, storedPlayerName: playerName },
  );
  await page.route(`**/api/rooms/${roomName}/actions`, async (route) => {
    actionBody = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(activeProjection),
      status: 200,
    });
  });
  await page.route(`**/api/rooms/${roomName}`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(activeProjection),
      status: 200,
    });
  });

  for (const viewport of [
    { width: 1024, height: 640 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`/rooms/${roomName}`);

    await expect(page.getByRole("region", { name: "Crew" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Crew" })).toHaveAttribute(
      "data-crew-layout",
      "compact",
    );
    const missionBoard = page.getByRole("region", { name: "Mission board" });
    await expect(missionBoard).toHaveAttribute(
      "data-game-surface",
      "between-tricks",
    );
    await expect(
      missionBoard.getByRole("group", { name: "Resolve Win the Pink 1" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start Trick", exact: true }),
    ).toBeVisible();
    const phaseCallout = page.locator('[data-slot="mission-phase-callout"]');
    await expect(
      phaseCallout.locator('[data-slot="mission-phase-name"]'),
    ).toHaveText("Between tricks.");
    const phaseInstructions = phaseCallout.locator(
      '[data-slot="mission-phase-instructions"]',
    );
    await expect(phaseInstructions).toHaveText(
      "Set task statuses, communicate, play a lead card, or start the trick.",
    );
    await expect(phaseInstructions).toHaveCSS("font-weight", "400");
    await expect(page.getByText("Ada's turn", { exact: true })).toHaveCount(0);
    const taskProgress = phaseCallout.getByRole("progressbar", {
      name: "Task progress",
    });
    await expect(taskProgress).toHaveAttribute("data-slot", "progress");
    await expect(taskProgress).toHaveAttribute("aria-valuemin", "0");
    await expect(taskProgress).toHaveAttribute("aria-valuemax", "1");
    await expect(taskProgress).toHaveAttribute("aria-valuenow", "0");
    await expect(taskProgress).toHaveAttribute(
      "aria-valuetext",
      "Successful tasks: 0 of 1",
    );
    await expect(
      phaseCallout.getByText("0/1", { exact: true }),
    ).toBeVisible();
    const crew = page.getByRole("region", { name: "Crew" });
    const [missionSidebarBox, crewBox] = await Promise.all([
      page
        .getByRole("complementary", { name: "Mission information" })
        .boundingBox(),
      crew.boundingBox(),
    ]);
    expect(missionSidebarBox).not.toBeNull();
    expect(crewBox).not.toBeNull();
    await expect(page.getByText("Your hand", { exact: true })).toHaveCount(0);
    await expect(page.getByText("1 cards", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Your hand" }),
    ).toBeVisible();
    await expect(page.locator('[data-artwork-effect="ascii"]')).toBeVisible();
    const gameShell = page.locator("main#main-content");
    const gameConsole = page.getByRole("region", { name: "Game console" });
    const [consoleBox, handDockBox] = await Promise.all([
      gameConsole.boundingBox(),
      page.getByRole("region", { name: "Your hand" }).boundingBox(),
    ]);
    const shellHeight = Math.min(viewport.height, 864);
    const shellTop = (viewport.height - shellHeight) / 2;
    expect(consoleBox).not.toBeNull();
    expect(handDockBox).not.toBeNull();
    expect(consoleBox!.y).toBe(shellTop + 32);
    expect(handDockBox!.y - (consoleBox!.y + consoleBox!.height)).toBe(32);
    expect(handDockBox!.y + handDockBox!.height).toBe(
      shellTop + shellHeight - 32,
    );
    await expect(gameShell).toHaveCSS("padding", "32px");
    await expect(gameShell).toHaveCSS("gap", "32px");
    await expect(gameShell).toHaveCSS("max-height", "864px");
    await expect(gameConsole).toHaveCSS("padding-top", "0px");
    await expect(gameConsole).toHaveCSS("padding-right", "0px");
    await expect(gameConsole).toHaveCSS("padding-bottom", "24px");
    await expect(gameConsole).toHaveCSS("padding-left", "0px");
    await expect(
      page.locator('[data-slot="game-console-layout"]'),
    ).toHaveCSS("padding", "24px");
    expect(
      crewBox!.y - (missionSidebarBox!.y + missionSidebarBox!.height),
    ).toBe(24);
    expect(
      consoleBox!.y + consoleBox!.height - (crewBox!.y + crewBox!.height),
    ).toBe(24);
    await expect(crew).toHaveCSS("margin-bottom", "0px");
    await expectNoHorizontalDocumentOverflow(page);
    await expectNoDocumentScroll(page);
    await expectNoAccessibilityViolations(page);
    await expectKeyboardReachable(page, "Play: Pink 1");
    const station = page.getByRole("article", { name: "Ada station" });
    await expect(station).toHaveCSS("border-top-width", "0px");
    await expect(
      station.getByRole("img", {
        name: /Win the Pink 1.*Assigned to Ada/,
      }),
    ).toHaveCount(0);
    const task = missionBoard.getByRole("img", {
      name: /Win the Pink 1.*Assigned to Ada/,
    });
    const [missionBoardBox, taskBox] = await Promise.all([
      missionBoard.boundingBox(),
      task.boundingBox(),
    ]);

    expect(missionBoardBox).not.toBeNull();
    expect(taskBox).not.toBeNull();
    expect(taskBox!.y).toBeGreaterThanOrEqual(missionBoardBox!.y);
    expect(taskBox!.y + taskBox!.height).toBeLessThanOrEqual(
      missionBoardBox!.y + missionBoardBox!.height,
    );
  }

  await page.setViewportSize({ width: 1024, height: 640 });
  await page.goto(`/rooms/${roomName}`);
  const modeButton = page.getByRole("button", { name: "Communicate a card" });
  expect((await modeButton.boundingBox())?.width).toBeLessThan(128);
  await modeButton.click();
  await expect(
    page.getByRole("button", { name: "Cancel communication mode" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("Tab");
  const card = page.getByRole("button", { name: "Communicate: Pink 1" });
  await expect(card).toBeFocused();
  await page.keyboard.press("Enter");

  const highest = page.getByRole("button", { name: "Highest" });
  await expect(highest).toBeFocused();
  await expectNoDocumentScroll(page);

  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(card).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(highest).toBeFocused();

  await page.getByRole("button", { name: "Lowest" }).click();
  expect(actionBody).toEqual({
    type: "communicate",
    cardId: "pink-1",
    qualifier: "lowest",
  });
  await expect(page.getByRole("region", { name: "Your hand" })).toBeFocused();
});

test("room connection failures update one Sonner toast until recovery", async ({
  page,
}) => {
  const connectionMessage = "The room connection was interrupted for this test.";
  let roomRequests = 0;
  let recovered = false;

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(
    ({ name, storedPlayerName }) => {
      window.localStorage.setItem(
        `crew:credentials:${name.toLowerCase()}`,
        JSON.stringify({ roomName: name, playerName: storedPlayerName }),
      );
    },
    { name: roomName, storedPlayerName: playerName },
  );
  await page.route(`**/api/rooms/${roomName}`, async (route) => {
    roomRequests += 1;
    if (roomRequests === 1 || recovered) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(activeProjection),
        status: 200,
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "ROOM_UNAVAILABLE", message: connectionMessage },
      }),
      status: 503,
    });
  });

  await page.goto(`/rooms/${roomName}`);

  const connectionToast = page
    .locator("[data-sonner-toast]")
    .filter({ hasText: connectionMessage });
  await expect(connectionToast).toBeVisible();
  await expect(connectionToast).toHaveCount(1);

  recovered = true;
  await expect(connectionToast).toBeHidden({ timeout: 8_000 });
});

test("a development player query opens the room without changing saved login", async ({
  page,
}) => {
  let requestedPlayerName: string | undefined;

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(`**/api/rooms/${roomName}`, async (route) => {
    requestedPlayerName = route.request().headers()["x-crew-player-name"];
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(activeProjection),
      status: 200,
    });
  });

  await page.goto(
    `/rooms/${roomName}?player=${encodeURIComponent(playerName)}`,
  );

  await expect(
    page.getByText(`${roomName} · ${playerName} · Live`, { exact: true }),
  ).toBeVisible();
  expect(requestedPlayerName).toBe(playerName);
  expect(
    await page.evaluate((name) =>
      window.localStorage.getItem(`crew:credentials:${name.toLowerCase()}`),
    roomName),
  ).toBeNull();

  await page.reload();
  await expect(
    page.getByText(`${roomName} · ${playerName} · Live`, { exact: true }),
  ).toBeVisible();
  expect(requestedPlayerName).toBe(playerName);
});

test("the game room is unavailable below the minimum laptop viewport", async ({
  page,
}) => {
  let roomRequests = 0;

  await page.addInitScript(
    ({ name, storedPlayerName }) => {
      window.localStorage.setItem(
        `crew:credentials:${name.toLowerCase()}`,
        JSON.stringify({
          roomName: name,
          playerName: storedPlayerName,
        }),
      );
    },
    { name: roomName, storedPlayerName: playerName },
  );
  await page.route(`**/api/rooms/${roomName}`, async (route) => {
    roomRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(activeProjection),
      status: 200,
    });
  });

  for (const viewport of [
    { width: 1023, height: 900 },
    { width: 1440, height: 639 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`/rooms/${roomName}`);

    await expect(
      page.getByRole("heading", { name: "Size Matters" }),
    ).toBeVisible();
    await expect(page.locator("[data-room-fallback]")).toHaveCount(1);
    await expect(
      page.getByText("The game room requires a window at least 1024 × 640."),
    ).toBeVisible();
    await expectPassportShell(page);
    await expect(page.getByRole("region", { name: "Game console" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Play: Pink 1" })).toHaveCount(0);
    await expectNoHorizontalDocumentOverflow(page);
    await expectNoDocumentScroll(page);
    await expectNoAccessibilityViolations(page);
  }

  expect(roomRequests).toBe(0);

  await page.setViewportSize({ width: 1024, height: 640 });
  await expect(page.getByRole("region", { name: "Crew" })).toBeVisible();
  expect(roomRequests).toBeGreaterThan(0);

  await page.setViewportSize({ width: 1023, height: 640 });
  await expect(
    page.getByRole("heading", { name: "Size Matters" }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Game console" })).toHaveCount(0);
});

test("authenticated admin dashboard is accessible and responsive at target widths", async ({
  page,
}) => {
  test.setTimeout(60_000);
  let savedRoomSettings: Record<string, unknown> | null = null;
  page.on("request", (request) => {
    if (
      request.method() === "PUT" &&
      new URL(request.url()).pathname === `/api/admin/rooms/${adminRoom.id}`
    ) {
      savedRoomSettings = request.postDataJSON() as Record<string, unknown>;
    }
  });
  await mockAuthenticatedAdmin(page);

  for (const width of [320, 375, 768, 879, 1440]) {
    await page.setViewportSize({
      width,
      height: width <= 375 ? 740 : 900,
    });
    await page.goto("/admin");
    await expect(page.getByRole("button", { name: "Toggle Sidebar" })).toHaveCount(0);
    const logo = page.getByLabel("Crew administration", { exact: true });
    await expect(logo).toBeVisible();
    expect(
      await logo.evaluate((element) => {
        const icon = element.querySelector('[data-slot="crew-logo-icon"]');
        const text = element.querySelector('[data-slot="crew-logo-text"]');
        return [
          icon ? window.getComputedStyle(icon).fontSize : null,
          text ? window.getComputedStyle(text).fontSize : null,
        ];
      }),
    ).toEqual(["20.8px", "20.8px"]);
    await expect(page.getByText("1 room", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Rooms", { exact: true })).toBeVisible();
    await expect(
      page.locator('[data-slot="sidebar-group-content"]').first(),
    ).toHaveCSS("padding-top", "4px");
    await expect(page.getByRole("button", { name: "New room" })).toBeVisible();
    const roomButton = page.getByRole("button", {
      name: `Manage ${adminRoom.name}`,
    });
    await expect(roomButton).toHaveCSS("cursor", "pointer");
    await expect(roomButton.locator('[data-slot="crew-edition"]')).toHaveCount(0);
    await expect(
      roomButton.locator('[data-slot="admin-room-status"]'),
    ).toHaveCount(0);
    await expect(roomButton.getByText("Mission 1", { exact: true })).toHaveCount(0);
    await expect(roomButton.getByText("preflight", { exact: true })).toHaveCount(0);
    const roomRowAlignment = await roomButton.evaluate((button) => {
      const roomName = button.querySelector('[data-slot="admin-room-name"]');
      const chevron = button.querySelector('[data-slot="admin-room-chevron"]');
      const chevronBox = chevron?.getBoundingClientRect();
      const buttonBox = button.getBoundingClientRect();
      return {
        chevronCenter: chevronBox ? chevronBox.top + chevronBox.height / 2 : 0,
        chevronRight: chevronBox?.right ?? 0,
        buttonRight: buttonBox.right,
        buttonCenter: buttonBox.top + buttonBox.height / 2,
        nameWeight: roomName ? window.getComputedStyle(roomName).fontWeight : "",
      };
    });
    expect(roomRowAlignment.nameWeight).toBe("400");
    await expect(
      roomButton.locator('[data-slot="admin-room-chevron"]'),
    ).toBeVisible();
    expect(
      Math.abs(roomRowAlignment.chevronCenter - roomRowAlignment.buttonCenter),
    ).toBeLessThanOrEqual(1);
    expect(roomRowAlignment.chevronRight).toBeLessThan(roomRowAlignment.buttonRight);
    await expect(
      page.getByText(/Last active \d+[mhd] ago|Last active Just now/),
    ).toBeVisible();
    await expect(
      page.getByText("Administration", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Create a room, add its crew, then start the mission."),
    ).toHaveCount(0);
    await expect(page.locator('[data-artwork-effect="ascii"]')).toHaveAttribute(
      "data-artwork-effect",
      "ascii",
    );
    if (width === 1440) {
      await roomButton.hover();
      expect(
        await roomButton.evaluate(
          (button) => window.getComputedStyle(button).backgroundColor,
        ),
      ).not.toBe("rgb(255, 255, 255)");
    }
    if (width === 879) {
      await page.getByRole("button", { name: "New room" }).click();
      const createRoomForm = page.getByRole("form", { name: "Create room" });
      await expect(createRoomForm.locator('[data-slot="select-trigger"]')).toHaveCount(2);
      await expect(
        createRoomForm.getByRole("combobox", { name: "Edition", exact: true }),
      ).toHaveAttribute("data-slot", "select-trigger");
      await createRoomForm.getByRole("button", { name: "Cancel" }).click();
    }
    await roomButton.click();
    const detailScroll = page.getByTestId("admin-detail-scroll");
    await expect(
      page.getByRole("heading", {
        name: `Rooms ${adminRoom.name}`,
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator('[data-slot="select-trigger"]')).toHaveCount(2);
    await expect(
      page.getByRole("combobox", { name: "Edition", exact: true }),
    ).toHaveAttribute("data-slot", "select-trigger");
    await expect(page.getByLabel("Room name")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Mission", exact: true }),
    ).toBeVisible();
    const missionSection = page.getByRole("region", {
      name: "Mission",
      exact: true,
    });
    const playersSection = page.getByRole("region", {
      name: "Players",
      exact: true,
    });
    const actionsSection = page.getByRole("region", {
      name: "Actions",
      exact: true,
    });
    const previousMissionButton = page.getByRole("button", {
      name: "Previous mission",
    });
    const nextMissionButton = page.getByRole("button", {
      name: "Next mission",
    });
    const previousAttemptButton = page.getByRole("button", {
      name: "Previous attempt",
    });
    const nextAttemptButton = page.getByRole("button", {
      name: "Next attempt",
    });
    await expect(previousMissionButton).toBeVisible();
    await expect(previousMissionButton).toHaveAttribute("data-slot", "button");
    await expect(previousMissionButton).toHaveAttribute("data-variant", "outline");
    await expect(previousMissionButton).toBeDisabled();
    await expect(nextMissionButton).toBeVisible();
    await expect(nextMissionButton).toHaveAttribute("data-slot", "button");
    await expect(nextMissionButton).toHaveAttribute("data-variant", "outline");
    await expect(nextMissionButton).toBeEnabled();
    const attemptInput = missionSection.getByRole("spinbutton", {
      name: "Attempt",
    });
    await expect(attemptInput).toHaveValue("1");
    await expect(attemptInput).toHaveAttribute("min", "1");
    await expect(attemptInput).toHaveAttribute("step", "1");
    await expect(previousAttemptButton).toBeVisible();
    await expect(previousAttemptButton).toHaveAttribute("data-slot", "button");
    await expect(previousAttemptButton).toHaveAttribute("data-variant", "outline");
    await expect(previousAttemptButton).toBeDisabled();
    await expect(nextAttemptButton).toBeVisible();
    await expect(nextAttemptButton).toHaveAttribute("data-slot", "button");
    await expect(nextAttemptButton).toHaveAttribute("data-variant", "outline");
    await expect(nextAttemptButton).toBeEnabled();
    const roomPhase = missionSection.getByLabel("Room phase");
    await expect(roomPhase).toHaveText("preflight");
    await expect(roomPhase).toHaveCSS("font-family", /Geist Mono/);
    await expect(
      missionSection.getByRole("textbox", { name: "Phase" }),
    ).toHaveCount(0);
    await expect(
      missionSection.getByRole("button", { name: "Reset" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Players" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Actions" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Danger zone" })).toHaveCount(0);
    await expect(page.getByText("Player", { exact: true })).toBeVisible();
    await expect(page.getByText("Tags", { exact: true })).toBeVisible();
    await expect(
      playersSection.getByRole("button", { name: "Shuffle players" }),
    ).toBeVisible();
    await expect(
      actionsSection.getByRole("button", { name: "Delete Room" }),
    ).toBeVisible();
    await expect(
      actionsSection.getByRole("button", { name: "Save" }),
    ).toBeVisible();
    await expect(
      actionsSection.getByRole("button", { name: "Reset" }),
    ).toHaveCount(0);
    await expect(
      actionsSection.getByRole("button", { name: "Shuffle players" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Room controls" }),
    ).toHaveCount(0);
    await expect(detailScroll.locator("[data-admin-player-row]")).toHaveCount(5);
    await expect(
      detailScroll.locator(
        '[data-player-color], [data-slot="admin-player-color"], [data-slot="admin-player-color-square"]',
      ),
    ).toHaveCount(0);
    for (let seat = 1; seat <= 5; seat += 1) {
      await expect(
        detailScroll.getByLabel(`Display name for player ${seat}`),
      ).toHaveCount(1);
    }
    await expect(
      detailScroll.locator('[data-admin-player-row][data-empty="true"]'),
    ).toHaveCount(2);
    await expect(detailScroll.getByLabel("3 of 5 players")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add player" })).toHaveCount(0);
    const tagComboboxes = detailScroll.getByRole("combobox", {
      name: /^Tags for /,
    });
    await expect(tagComboboxes).toHaveCount(3);
    await expect(detailScroll.getByLabel("Tags for Ada")).toHaveAttribute(
      "data-slot",
      "combobox-chip-input",
    );
    await expect(
      detailScroll
        .locator("[data-admin-player-row]")
        .first()
        .locator('[data-slot="combobox-chip"]'),
    ).toHaveText("bug");
    await expect(page.getByText("Room settings updated.")).toHaveCount(0);

    if (width === 1440) {
      const missionSelect = page.getByRole("combobox", {
        name: "Mission",
        exact: true,
      });
      const missionBorderColor = await missionSelect.evaluate(
        (select) => window.getComputedStyle(select).borderColor,
      );
      expect(
        await previousMissionButton.evaluate(
          (button) => window.getComputedStyle(button).borderColor,
        ),
      ).toBe(missionBorderColor);
      expect(
        await nextMissionButton.evaluate(
          (button) => window.getComputedStyle(button).borderColor,
        ),
      ).toBe(missionBorderColor);
      await expect(missionSelect).toHaveText("1 · First Launch");
      await nextMissionButton.click();
      await expect(missionSelect).toHaveText("2 · Low Orbit");
      await expect(previousMissionButton).toBeEnabled();
      await expect(nextMissionButton).toBeDisabled();
      await previousMissionButton.click();
      await expect(missionSelect).toHaveText("1 · First Launch");

      const attemptBorderColor = await attemptInput.evaluate(
        (input) => window.getComputedStyle(input).borderColor,
      );
      expect(
        await previousAttemptButton.evaluate(
          (button) => window.getComputedStyle(button).borderColor,
        ),
      ).toBe(attemptBorderColor);
      expect(
        await nextAttemptButton.evaluate(
          (button) => window.getComputedStyle(button).borderColor,
        ),
      ).toBe(attemptBorderColor);
      await nextAttemptButton.click();
      await expect(attemptInput).toHaveValue("2");
      await expect(previousAttemptButton).toBeEnabled();
      await previousAttemptButton.click();
      await expect(attemptInput).toHaveValue("1");
      await expect(previousAttemptButton).toBeDisabled();

      const settingsGeometry = await missionSection.evaluate((section) => {
        const settingBox = (name: string) =>
          section
            .querySelector(`[data-admin-setting="${name}"]`)
            ?.getBoundingClientRect();
        const edition = settingBox("edition");
        const mission = settingBox("mission");
        const attempt = settingBox("attempt");
        const phase = settingBox("phase");
        const phaseValue = section
          .querySelector('[data-slot="admin-room-phase"]')
          ?.getBoundingClientRect();
        const reset = [...section.querySelectorAll("button")]
          .find((button) => button.textContent?.includes("Reset"))
          ?.getBoundingClientRect();
        return {
          editionTop: edition?.top ?? 0,
          editionLeft: edition?.left ?? 0,
          missionTop: mission?.top ?? 0,
          missionLeft: mission?.left ?? 0,
          missionWidth: mission?.width ?? 0,
          attemptTop: attempt?.top ?? 0,
          attemptLeft: attempt?.left ?? 0,
          phaseTop: phase?.top ?? 0,
          phaseLeft: phase?.left ?? 0,
          phaseWidth: phase?.width ?? 0,
          phaseValueTop: phaseValue?.top ?? 0,
          resetTop: reset?.top ?? 0,
        };
      });
      expect(settingsGeometry.editionTop).toBeLessThan(
        settingsGeometry.missionTop,
      );
      expect(
        Math.abs(settingsGeometry.phaseTop - settingsGeometry.editionTop),
      ).toBeLessThanOrEqual(1);
      expect(settingsGeometry.editionLeft).toBeGreaterThan(
        settingsGeometry.phaseLeft,
      );
      expect(
        Math.abs(settingsGeometry.missionTop - settingsGeometry.attemptTop),
      ).toBeLessThanOrEqual(1);
      expect(settingsGeometry.attemptLeft).toBeGreaterThan(
        settingsGeometry.missionLeft,
      );
      expect(settingsGeometry.missionTop).toBeGreaterThan(
        settingsGeometry.phaseTop,
      );
      expect(
        Math.abs(settingsGeometry.phaseWidth - settingsGeometry.missionWidth),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(settingsGeometry.phaseValueTop - settingsGeometry.resetTop),
      ).toBeLessThanOrEqual(1);

      const roomTitle = page.locator('[data-slot="admin-room-title"]');
      const roomTitleName = page.locator(
        '[data-slot="admin-room-title-name"]',
      );
      const sectionTitles = detailScroll.locator(
        '[data-slot="admin-section-title"]',
      );
      await expect(roomTitle).toHaveCSS("font-size", "20.8px");
      await expect(roomTitle).toHaveCSS("font-weight", "400");
      await expect(roomTitleName).toHaveCSS(
        "font-family",
        /Geist Mono/,
      );
      await expect(sectionTitles).toHaveCount(3);
      expect(
        await sectionTitles.evaluateAll((titles) =>
          titles.map((title) => window.getComputedStyle(title).fontSize),
        ),
      ).toEqual(["18px", "18px", "18px"]);
      expect(
        await sectionTitles.evaluateAll((titles) =>
          titles.map((title) => window.getComputedStyle(title).fontWeight),
        ),
      ).toEqual(["600", "600", "600"]);

      const editorGeometry = await page
        .locator('[data-slot="admin-room-editor"]')
        .evaluate((editor) => {
          const roomHeading = document.querySelector(
            '[data-slot="admin-room-title"]',
          );
          const sectionHeading = editor.querySelector(
            '[data-slot="admin-section-title"]',
          );
          return {
            editorWidth: editor.getBoundingClientRect().width,
            roomHeadingLeft: roomHeading?.getBoundingClientRect().left ?? 0,
            sectionHeadingLeft: sectionHeading?.getBoundingClientRect().left ?? 0,
          };
        });
      expect(editorGeometry.editorWidth).toBeLessThanOrEqual(1152);
      expect(
        Math.abs(
          editorGeometry.roomHeadingLeft - editorGeometry.sectionHeadingLeft,
        ),
      ).toBeLessThanOrEqual(1);

      const unusedPlayer = detailScroll.locator(
        '[data-admin-player-row][data-empty="true"]',
      ).first();
      await expect(unusedPlayer).toHaveCSS("opacity", "0.5");

      const playerNames = detailScroll.getByLabel(
        /^Display name for player [1-5]$/,
      );
      const beforeShuffle = await playerNames.evaluateAll((inputs) =>
        inputs.map((input) => (input as HTMLInputElement).value),
      );
      await page.getByRole("button", { name: "Shuffle players" }).click();
      await expect(
        page.getByText("Players shuffled", { exact: true }),
      ).toBeVisible();
      const afterShuffle = await playerNames.evaluateAll((inputs) =>
        inputs.map((input) => (input as HTMLInputElement).value),
      );
      expect(afterShuffle.slice(0, 3)).not.toEqual(beforeShuffle.slice(0, 3));
      expect(afterShuffle.slice(3)).toEqual(["", ""]);
      await expect(detailScroll.getByLabel("3 of 5 players")).toHaveCount(0);

      const saveButton = page.getByRole("button", { name: "Save" });
      await attemptInput.fill("4");
      const saveTop = await saveButton.evaluate(
        (button) => button.getBoundingClientRect().top,
      );
      const finalPlayerBottom = await detailScroll
        .locator("[data-admin-player-row]")
        .last()
        .evaluate((row) => row.getBoundingClientRect().bottom);
      expect(saveTop).toBeGreaterThan(finalPlayerBottom);
      await saveButton.click();
      await expect
        .poll(() => savedRoomSettings?.attemptNumber)
        .toBe(4);
    }

    await expect(detailScroll).toHaveCSS("overflow-y", "auto");
    if (width === 879) {
      const detailDimensions = await detailScroll.evaluate((element) => ({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      }));
      expect(detailDimensions.scrollHeight).toBeGreaterThan(
        detailDimensions.clientHeight,
      );
    }

    await expectNoHorizontalDocumentOverflow(page);
    await expectNoDocumentScroll(page);
    await expectNoAccessibilityViolations(page);
  }
});

test.describe("reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("keeps the artwork character field still", async ({ page }) => {
    await page.goto("/");
    const artwork = page.locator("[data-artwork-canvas]");

    await expect(artwork).toHaveAttribute("data-artwork-frame", "0");
    await page.waitForTimeout(500);
    await expect(artwork).toHaveAttribute("data-artwork-frame", "0");
  });

  test("keeps the bug decoration still", async ({ page }) => {
    await page.goto("/decorations");
    await page.getByRole("button", { name: "Preview 'Bug'" }).click();
    const bugOverlay = page.locator('[data-room-decoration="bug"]');
    await expect(bugOverlay).toBeVisible();
    await expect(
      bugOverlay.locator('[data-dead-pixel-blob="true"]'),
    ).toHaveCSS("animation-name", "none");

    await expectNoHorizontalDocumentOverflow(page);
    await expectNoDocumentScroll(page);
    await expectNoAccessibilityViolations(page);
  });

  test("keeps the static winning result without a confetti canvas", async ({
    page,
  }) => {
    await page.addInitScript(
      ({ name, storedPlayerName }) => {
        window.localStorage.setItem(
          `crew:credentials:${name.toLowerCase()}`,
          JSON.stringify({
            roomName: name,
            playerName: storedPlayerName,
          }),
        );
      },
      { name: roomName, storedPlayerName: playerName },
    );
    await page.route(`**/api/rooms/${roomName}`, async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ...baseProjection,
          phase: "finished",
          result: "won",
        }),
        status: 200,
      });
    });

    await page.goto(`/rooms/${roomName}`);

    await expect(
      page.getByRole("heading", { name: "Mission complete" }),
    ).toBeVisible();
    await expect(page.getByText("Level complete")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.sessionStorage.getItem("crew:celebrated:room-e2e:1"),
        ),
      )
      .toBe("true");
    expect(
      await page.evaluate(
        () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).toBe(true);
    await expect(page.locator("canvas")).toHaveCount(0);
    await expectNoAccessibilityViolations(page);
  });
});
