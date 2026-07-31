import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const roomName = "Europa";
const playerKey = "6FJ9KP";

const players = [
  {
    id: "player-1",
    displayName: "Ada",
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
    claimableTaskIds: [],
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
      id: "objective-1",
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
    playableCardIds: ["pink-1"],
    communicationOptions: [
      {
        cardId: "pink-1",
        qualifiers: ["highest", "only", "lowest"],
      },
    ],
  },
};

const adminRoom = {
  id: "admin-room-e2e",
  name: "Europa",
  editionKey: "planet-nine",
  missionKey: "planet-nine:1",
  missionNumber: 1,
  missionTitle: "First Launch",
  phase: "setup",
  restartRequired: false,
  attemptNumber: 0,
  playerCount: 3,
  updatedAt: "2026-07-30T12:00:00.000Z",
};

const adminPlayers = [
  { id: "admin-player-1", displayName: "Ada", loginKey: "2BCDEF", seat: 1 },
  { id: "admin-player-2", displayName: "Grace", loginKey: "3BCDEF", seat: 2 },
  {
    id: "admin-player-3",
    displayName: "Katherine",
    loginKey: "4BCDEF",
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

async function mockAuthenticatedAdmin(page: Page) {
  await page.route("**/api/admin/rooms**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (request.method() !== "GET") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ room: { ...adminRoom, players: adminPlayers } }),
        status: 200,
      });
      return;
    }

    if (pathname === `/api/admin/rooms/${adminRoom.id}`) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ...adminRoom, players: adminPlayers }),
        status: 200,
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        editions: editionOptions,
        rooms: [adminRoom],
      }),
      status: 200,
    });
  });
}

for (const width of [320, 375, 768, 1440]) {
  test(`join shell fits a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({
      width,
      height: width <= 375 ? 740 : 900,
    });
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Ready, crew?" }),
    ).toBeVisible();
    await expect(page.getByLabel("Join a room")).toBeVisible();
    await expectNoHorizontalDocumentOverflow(page);
    await expectNoDocumentScroll(page);

    for (const control of [
      page.getByLabel("Room name"),
      page.getByLabel("Your player key"),
    ]) {
      const box = await control.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });
}

test("the homepage uses shadcn New York primitives", async ({ page }) => {
  await page.goto("/");
  const joinButton = page.getByRole("button", { name: "Join mission" });
  await expect(page.locator('[data-slot="card"]')).toHaveCount(1);
  await expect(page.locator('[data-slot="field"]')).toHaveCount(2);
  await expect(page.locator('[data-slot="input"]')).toHaveCount(2);
  await expect(joinButton).toHaveAttribute("data-slot", "button");
  await expect(joinButton).toHaveAttribute("data-variant", "default");
  await expect(joinButton).toHaveAttribute("data-size", "default");
  await expect(joinButton).toHaveCSS("height", "44px");
  await expect(joinButton).toHaveCSS("border-radius", "6px");
  await expect(page.getByText("Keys use six letters and numbers.")).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("link", { name: "Room admin" }),
  ).toHaveCount(0);
});

test("the join screen animates a character overlay on the local artwork", async ({
  page,
}) => {
  await page.goto("/");
  const artwork = page.locator("[data-artwork-canvas]");
  await expect(artwork).toBeVisible();
  await expect
    .poll(() => artwork.getAttribute("data-artwork-frame"))
    .not.toBeNull();
  const firstFrame = await artwork.getAttribute("data-artwork-frame");
  await expect
    .poll(() => artwork.getAttribute("data-artwork-frame"))
    .not.toBe(firstFrame);

  const wallpaper = await page.request.get("/crew-clouds.jpg");
  expect(wallpaper.ok()).toBe(true);
  expect(wallpaper.headers()["content-type"]).toBe("image/jpeg");
});

test("join is keyboard-operable and stores only the submitted player credential", async ({
  page,
}) => {
  let loginBody: unknown;

  await page.route("**/api/rooms/login", async (route) => {
    loginBody = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ room: { name: roomName } }),
      status: 200,
    });
  });
  await page.route(`**/api/rooms/${roomName}`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ...baseProjection, phase: "setup" }),
      status: 200,
    });
  });

  await page.goto("/");
  const roomInput = page.getByLabel("Room name");
  const keyInput = page.getByLabel("Your player key");

  await expect(roomInput).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(roomInput).toBeFocused();

  await page.keyboard.type(roomName);
  await page.keyboard.press("Tab");
  await expect(keyInput).toBeFocused();
  await page.keyboard.type(playerKey.toLowerCase());
  await expect(keyInput).toHaveValue(playerKey);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Join mission" })).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(new RegExp(`/rooms/${roomName}$`));
  await expect(
    page.getByRole("heading", { name: "Waiting for the room admin" }),
  ).toBeVisible();
  expect(loginBody).toEqual({ roomName, key: playerKey });
  await expect
    .poll(() =>
      page.evaluate(() => window.localStorage.getItem("crew:credentials:europa")),
    )
    .toBe(JSON.stringify({ roomName, key: playerKey }));
});

test("join and locked admin shells pass automated accessibility checks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expectNoAccessibilityViolations(page);

  await page.goto("/admin");
  await expect(page.getByLabel("Admin password")).toBeVisible();
  await expectNoHorizontalDocumentOverflow(page);
  await expectNoAccessibilityViolations(page);
});

test("the admin authentication shell reports an incorrect password accessibly", async ({
  page,
}) => {
  await page.goto("/admin");
  const password = page.getByLabel("Admin password");
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

test("active gameplay is accessible, viewport-bound, and keyboard reachable", async ({
  page,
}) => {
  let actionBody: unknown;

  await page.addInitScript(
    ({ key, name }) => {
      window.localStorage.setItem(
        `crew:credentials:${name.toLowerCase()}`,
        JSON.stringify({ roomName: name, key }),
      );
    },
    { key: playerKey, name: roomName },
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

    await expect(
      page.getByRole("heading", { name: "Current trick" }),
    ).toBeVisible();
    await expectNoHorizontalDocumentOverflow(page);
    await expectNoDocumentScroll(page);
    await expectNoAccessibilityViolations(page);
    await expectKeyboardReachable(page, "Play: Pink 1");
    const station = page.getByRole("article", { name: "Ada station" });
    const objective = station.getByRole("img", {
      name: /Win the Pink 1.*Assigned to Ada/,
    });
    const [stationBox, objectiveBox] = await Promise.all([
      station.boundingBox(),
      objective.boundingBox(),
    ]);

    expect(stationBox).not.toBeNull();
    expect(objectiveBox).not.toBeNull();
    expect(objectiveBox!.y).toBeGreaterThanOrEqual(stationBox!.y);
    expect(objectiveBox!.y + objectiveBox!.height).toBeLessThanOrEqual(
      stationBox!.y + stationBox!.height,
    );
  }

  await page.setViewportSize({ width: 1024, height: 640 });
  await page.goto(`/rooms/${roomName}`);
  const modeButton = page.getByRole("button", { name: "Communicate a card" });
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

test("the game room is unavailable below the minimum laptop viewport", async ({
  page,
}) => {
  let roomRequests = 0;

  await page.addInitScript(
    ({ key, name }) => {
      window.localStorage.setItem(
        `crew:credentials:${name.toLowerCase()}`,
        JSON.stringify({ roomName: name, key }),
      );
    },
    { key: playerKey, name: roomName },
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
      page.getByRole("heading", { name: "Screen too small" }),
    ).toBeVisible();
    await expect(
      page.getByText("The game room requires a window at least 1024 × 640."),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Game console" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Play: Pink 1" })).toHaveCount(0);
    await expectNoHorizontalDocumentOverflow(page);
    await expectNoDocumentScroll(page);
    await expectNoAccessibilityViolations(page);
  }

  expect(roomRequests).toBe(0);

  await page.setViewportSize({ width: 1024, height: 640 });
  await expect(
    page.getByRole("heading", { name: "Current trick" }),
  ).toBeVisible();
  expect(roomRequests).toBeGreaterThan(0);

  await page.setViewportSize({ width: 1023, height: 640 });
  await expect(
    page.getByRole("heading", { name: "Screen too small" }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Game console" })).toHaveCount(0);
});

test("authenticated admin dashboard is accessible and responsive at target widths", async ({
  page,
}) => {
  await mockAuthenticatedAdmin(page);

  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({
      width,
      height: width <= 375 ? 740 : 900,
    });
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Room admin" })).toBeVisible();
    await page.getByRole("button", { name: `Manage ${adminRoom.name}` }).click();
    await expect(
      page.getByRole("heading", { name: adminRoom.name, exact: true }),
    ).toBeVisible();

    await expectNoHorizontalDocumentOverflow(page);
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

  test("keeps the static winning result without a confetti canvas", async ({
    page,
  }) => {
    await page.addInitScript(
      ({ key, name }) => {
        window.localStorage.setItem(
          `crew:credentials:${name.toLowerCase()}`,
          JSON.stringify({ roomName: name, key }),
        );
      },
      { key: playerKey, name: roomName },
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
