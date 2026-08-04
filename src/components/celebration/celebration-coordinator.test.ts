import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CELEBRATION_COLORS,
  CELEBRATION_SHAPES,
  clearCelebrationCoordinatorForTests,
  getCelebrationStorageKey,
  startLevelCompleteCelebration,
} from "./celebration-coordinator";

type Confetti = Awaited<ReturnType<Parameters<
  typeof startLevelCompleteCelebration
>[0]["loadConfetti"]>>;

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

function createConfetti() {
  const confetti = vi.fn(() => null) as unknown as Confetti;
  confetti.reset = vi.fn();
  return confetti;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("level-complete celebration coordinator", () => {
  beforeEach(() => {
    clearCelebrationCoordinatorForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does nothing for an inactive result", () => {
    const storage = createStorage();
    const loadConfetti = vi.fn(async () => createConfetti());

    const cleanup = startLevelCompleteCelebration({
      active: false,
      attemptNumber: 3,
      loadConfetti,
      roomId: "room-1",
      storage,
    });
    cleanup();

    expect(loadConfetti).not.toHaveBeenCalled();
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("loads and fires only once when the same winning projection repeats", async () => {
    const storage = createStorage();
    const confetti = createConfetti();
    const pendingConfetti = deferred<Confetti>();
    const loadConfetti = vi.fn(() => pendingConfetti.promise);
    const options = {
      active: true,
      attemptNumber: 3,
      loadConfetti,
      roomId: "room-1",
      storage,
    };

    const firstCleanup = startLevelCompleteCelebration(options);
    const repeatedCleanup = startLevelCompleteCelebration(options);

    expect(loadConfetti).toHaveBeenCalledTimes(1);

    pendingConfetti.resolve(confetti);
    await settle();

    expect(confetti).toHaveBeenCalledTimes(2);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(
      getCelebrationStorageKey("room-1", 3),
      "true",
    );

    const pollCleanup = startLevelCompleteCelebration(options);
    expect(loadConfetti).toHaveBeenCalledTimes(1);
    expect(confetti).toHaveBeenCalledTimes(2);

    firstCleanup();
    expect(confetti.reset).not.toHaveBeenCalled();
    repeatedCleanup();
    expect(confetti.reset).toHaveBeenCalledTimes(1);
    pollCleanup();
  });

  it("uses the exact accessible side-cannon configuration", async () => {
    const storage = createStorage();
    const confetti = createConfetti();

    startLevelCompleteCelebration({
      active: true,
      attemptNumber: 4,
      loadConfetti: vi.fn(async () => confetti),
      roomId: "room-2",
      storage,
    });
    await settle();

    const shared = {
      colors: [...CELEBRATION_COLORS],
      disableForReducedMotion: true,
      gravity: 0.95,
      particleCount: 60,
      shapes: [...CELEBRATION_SHAPES],
      spread: 70,
      startVelocity: 42,
      ticks: 170,
      zIndex: 1000,
    };
    expect(confetti).toHaveBeenNthCalledWith(1, {
      ...shared,
      angle: 60,
      origin: { x: 0, y: 1 },
    });
    expect(confetti).toHaveBeenNthCalledWith(2, {
      ...shared,
      angle: 120,
      origin: { x: 1, y: 1 },
    });
  });

  it("skips a result already celebrated in this tab", () => {
    const storage = createStorage();
    const storageKey = getCelebrationStorageKey("room-3", 7);
    storage.setItem(storageKey, "true");
    const loadConfetti = vi.fn(async () => createConfetti());

    const cleanup = startLevelCompleteCelebration({
      active: true,
      attemptNumber: 7,
      loadConfetti,
      roomId: "room-3",
      storage,
    });
    cleanup();

    expect(loadConfetti).not.toHaveBeenCalled();
  });

  it("resets without firing when cleanup happens while import is pending", async () => {
    const storage = createStorage();
    const confetti = createConfetti();
    const pendingConfetti = deferred<Confetti>();
    const loadConfetti = vi.fn(() => pendingConfetti.promise);
    const options = {
      active: true,
      attemptNumber: 8,
      loadConfetti,
      roomId: "room-4",
      storage,
    };

    const cleanup = startLevelCompleteCelebration(options);
    cleanup();
    cleanup();
    pendingConfetti.resolve(confetti);
    await settle();

    expect(confetti).not.toHaveBeenCalled();
    expect(confetti.reset).toHaveBeenCalledTimes(1);
    expect(storage.setItem).not.toHaveBeenCalled();

    const resumedCleanup = startLevelCompleteCelebration(options);
    expect(loadConfetti).toHaveBeenCalledTimes(1);
    expect(confetti).toHaveBeenCalledTimes(2);
    resumedCleanup();
    expect(confetti.reset).toHaveBeenCalledTimes(2);
  });

  it("contains a failed dynamic import and permits a retry", async () => {
    const storage = createStorage();
    const failedImport = deferred<Confetti>();
    const confetti = createConfetti();
    const loadConfetti = vi
      .fn<() => Promise<Confetti>>()
      .mockReturnValueOnce(failedImport.promise)
      .mockResolvedValueOnce(confetti);
    const options = {
      active: true,
      attemptNumber: 9,
      loadConfetti,
      roomId: "room-5",
      storage,
    };

    startLevelCompleteCelebration(options);
    failedImport.reject(new Error("chunk failed"));
    await settle();

    startLevelCompleteCelebration(options);
    await settle();

    expect(loadConfetti).toHaveBeenCalledTimes(2);
    expect(confetti).toHaveBeenCalledTimes(2);
  });
});
