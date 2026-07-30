import type canvasConfetti from "canvas-confetti";

export const CELEBRATION_COLORS = [
  "#5146d9",
  "#f45c93",
  "#3d9df2",
  "#46b98c",
  "#f6c94c",
  "#ffffff",
] as const;

export const CELEBRATION_SHAPES = ["circle", "square", "star"] as const;

type Confetti = typeof canvasConfetti;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

type CelebrationRecord = {
  confetti?: Confetti;
  fired: boolean;
  loadPromise: Promise<void>;
  storage: StorageLike;
  storageKey: string;
  subscribers: Set<symbol>;
};

export type StartLevelCompleteCelebrationOptions = {
  active: boolean;
  attemptNumber: number;
  loadConfetti: () => Promise<Confetti>;
  roomId: string;
  storage: StorageLike;
};

const celebrations = new Map<string, CelebrationRecord>();

export function getCelebrationStorageKey(
  roomId: string,
  attemptNumber: number,
): string {
  return `crew:celebrated:${roomId}:${attemptNumber}`;
}

function hasCelebrated(storage: StorageLike, storageKey: string): boolean {
  try {
    return storage.getItem(storageKey) !== null;
  } catch {
    return false;
  }
}

function rememberCelebration(
  storage: StorageLike,
  storageKey: string,
): void {
  try {
    storage.setItem(storageKey, "true");
  } catch {
    // The in-memory record still prevents repeat animations if storage is blocked.
  }
}

function fire(record: CelebrationRecord): void {
  if (
    record.fired ||
    !record.confetti ||
    record.subscribers.size === 0 ||
    hasCelebrated(record.storage, record.storageKey)
  ) {
    return;
  }

  record.fired = true;
  rememberCelebration(record.storage, record.storageKey);

  const sharedOptions = {
    particleCount: 60,
    spread: 70,
    startVelocity: 42,
    gravity: 0.95,
    ticks: 170,
    colors: [...CELEBRATION_COLORS],
    shapes: [...CELEBRATION_SHAPES],
    disableForReducedMotion: true,
    zIndex: 1000,
  };

  record.confetti({
    ...sharedOptions,
    angle: 60,
    origin: { x: 0, y: 0.68 },
  });
  record.confetti({
    ...sharedOptions,
    angle: 120,
    origin: { x: 1, y: 0.68 },
  });
}

function createRecord(
  storageKey: string,
  storage: StorageLike,
  loadConfetti: () => Promise<Confetti>,
): CelebrationRecord {
  const record: CelebrationRecord = {
    fired: false,
    loadPromise: Promise.resolve(),
    storage,
    storageKey,
    subscribers: new Set(),
  };

  record.loadPromise = loadConfetti()
    .then((confetti) => {
      record.confetti = confetti;
      if (record.subscribers.size === 0) {
        confetti.reset();
        return;
      }
      fire(record);
    })
    .catch(() => {
      if (celebrations.get(storageKey) === record) {
        celebrations.delete(storageKey);
      }
    });

  return record;
}

export function startLevelCompleteCelebration({
  active,
  attemptNumber,
  loadConfetti,
  roomId,
  storage,
}: StartLevelCompleteCelebrationOptions): () => void {
  if (!active) {
    return () => undefined;
  }

  const storageKey = getCelebrationStorageKey(roomId, attemptNumber);
  if (hasCelebrated(storage, storageKey)) {
    return () => undefined;
  }

  let record = celebrations.get(storageKey);
  if (!record) {
    record = createRecord(storageKey, storage, loadConfetti);
    celebrations.set(storageKey, record);
  }

  const subscriber = Symbol(storageKey);
  record.subscribers.add(subscriber);

  if (record.confetti) {
    fire(record);
  }

  let cleanedUp = false;
  return () => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;
    record.subscribers.delete(subscriber);
    if (record.confetti && record.subscribers.size === 0) {
      record.confetti.reset();
    }
  };
}

export function clearCelebrationCoordinatorForTests(): void {
  celebrations.clear();
}
