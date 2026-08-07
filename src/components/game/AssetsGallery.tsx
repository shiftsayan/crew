"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ProjectedTask,
  Suit,
  TaskOrder,
  TaskOutcome,
} from "@/game";
import {
  CARD_DECK,
  DEEP_SEA_TASKS,
  NON_TRUMP_CARDS,
  SUITS,
} from "@/game/config";

import { GameCard } from "./GameCard";
import { RoomConsoleImpl, RoomDockImpl, RoomShellImpl } from "./RoomShell";
import { TaskTile } from "./TaskTile";

type AssetMode = "cards" | "deep-sea" | "planet-nine";
type CardConfiguration = {
  disabled: boolean;
  scale: "full" | "communication";
};
type GoalConfiguration = {
  emphasized: boolean;
  outcome: TaskOutcome;
  order: TaskOrder | "none";
};
type DeepSeaPlayerCount = "none" | "3" | "4" | "5";
type ControlOption = { label: string; value: string };

const suitNames = {
  blue: "Blue",
  green: "Green",
  pink: "Pink",
  yellow: "Yellow",
  trump: "Trump",
} satisfies Record<Suit, string>;

const cardGroups = SUITS.map((suit) => ({
  suit,
  cards: CARD_DECK.filter((card) => card.suit === suit),
}));

const deepSeaGoals = DEEP_SEA_TASKS.map((definition) => ({
  definition,
  task: {
    id: definition.id,
    definitionId: definition.id,
    difficulty: null,
    cardId: null,
    order: null,
    ownerPlayerId: null,
    outcome: "pending",
    title: definition.presentation.summary,
    footnote: definition.presentation.footnote ?? null,
    ownerDisplayName: null,
  } satisfies ProjectedTask,
}));

const planetXGoals = NON_TRUMP_CARDS.map((card) => ({
  card,
  task: {
    id: `planet-nine-task-${card.id}`,
    definitionId: card.id,
    difficulty: null,
    cardId: card.id,
    order: null,
    ownerPlayerId: null,
    outcome: "pending",
    title: `Capture the ${card.suit} ${card.value}`,
    footnote: null,
    ownerDisplayName: null,
  } satisfies ProjectedTask,
}));

const modeDetails = {
  cards: {
    label: "Cards",
    summary: `${CARD_DECK.length} playing cards`,
  },
  "deep-sea": {
    label: "Mission Deep Sea",
    summary: `${DEEP_SEA_TASKS.length} goals`,
  },
  "planet-nine": {
    label: "Planet X",
    summary: `${NON_TRUMP_CARDS.length} goals`,
  },
} satisfies Record<AssetMode, { label: string; summary: string }>;

const cardAvailabilityOptions = [
  { label: "Available", value: "false" },
  { label: "Disabled", value: "true" },
] as const satisfies readonly ControlOption[];

const cardScaleOptions = [
  { label: "Full size", value: "full" },
  { label: "Communication · 80%", value: "communication" },
] as const satisfies readonly ControlOption[];

const goalSizeOptions = [
  { label: "Default · 56px", value: "default" },
  { label: "Emphasized · 84px", value: "emphasized" },
] as const satisfies readonly ControlOption[];

const goalOutcomeOptions = [
  { label: "Pending", value: "pending" },
  { label: "Successful", value: "success" },
  { label: "Failed", value: "failure" },
] as const satisfies readonly ControlOption[];

const goalOrderOptions = [
  { label: "None", value: "none" },
  { label: "One · 1", value: "one" },
  { label: "Two · 2", value: "two" },
  { label: "Three · 3", value: "three" },
  { label: "Four · 4", value: "four" },
  { label: "First · −", value: "first" },
  { label: "Second · =", value: "second" },
  { label: "Third · ≡", value: "third" },
  { label: "Last · Ω", value: "last" },
  { label: "Last trick · Ω", value: "last-trick" },
] as const satisfies readonly ControlOption[];

const deepSeaDifficultyOptions = [
  { label: "Hidden", value: "none" },
  { label: "3 players", value: "3" },
  { label: "4 players", value: "4" },
  { label: "5 players", value: "5" },
] as const satisfies readonly ControlOption[];

export function AssetsGallery() {
  const [mode, setMode] = useState<AssetMode>("cards");
  const [cardConfiguration, setCardConfiguration] =
    useState<CardConfiguration>({
      disabled: false,
      scale: "full",
    });
  const [goalConfiguration, setGoalConfiguration] =
    useState<GoalConfiguration>({
      emphasized: true,
      outcome: "pending",
      order: "none",
    });
  const [deepSeaPlayerCount, setDeepSeaPlayerCount] =
    useState<DeepSeaPlayerCount>("none");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollAreaRef.current?.scrollTo({ left: 0, top: 0 });
  }, [mode]);

  return (
    <RoomShellImpl
      console={
        <RoomConsoleImpl aria-labelledby="assets-title">
          <header className="flex flex-none flex-col items-stretch gap-2 border-b border-indigo-100 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
            <h1 className="sr-only" id="assets-title">
              Crew assets
            </h1>
            <Select
              value={mode}
              onValueChange={(value) => setMode(value as AssetMode)}
            >
              <SelectTrigger
                aria-label="Asset mode"
                className="h-11 w-full border-indigo-100 bg-white text-crew-ink shadow-none sm:w-auto sm:min-w-52"
                data-asset-mode-trigger=""
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" position="popper">
                {(Object.entries(modeDetails) as Array<
                  [AssetMode, (typeof modeDetails)[AssetMode]]
                >).map(([value, details]) => (
                  <SelectItem key={value} value={value}>
                    {details.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p
              className="m-0 text-left text-sm text-crew-ink/60 sm:ml-auto sm:text-right"
              aria-live="polite"
            >
              {modeDetails[mode].summary}
            </p>
          </header>

          <div
            ref={scrollAreaRef}
            className="min-h-0 flex-1 overflow-auto overscroll-contain px-4 py-5 scrollbar-gutter-stable sm:p-6"
            data-asset-mode={mode}
          >
            <div className="mb-6">
              {mode === "cards" ? (
                <CardControls
                  configuration={cardConfiguration}
                  onChange={(change) =>
                    setCardConfiguration((current) => ({
                      ...current,
                      ...change,
                    }))
                  }
                />
              ) : (
                <GoalControls
                  configuration={goalConfiguration}
                  deepSeaPlayerCount={deepSeaPlayerCount}
                  mode={mode}
                  onChange={(change) =>
                    setGoalConfiguration((current) => ({
                      ...current,
                      ...change,
                    }))
                  }
                  onDeepSeaPlayerCountChange={setDeepSeaPlayerCount}
                />
              )}
            </div>

            {mode === "cards" ? (
              <PlayingCards configuration={cardConfiguration} />
            ) : null}
            {mode === "deep-sea" ? (
              <DeepSeaGoals
                configuration={goalConfiguration}
                playerCount={deepSeaPlayerCount}
              />
            ) : null}
            {mode === "planet-nine" ? (
              <PlanetXGoals configuration={goalConfiguration} />
            ) : null}
          </div>
        </RoomConsoleImpl>
      }
      dock={<RoomDockImpl aria-label="Empty room dock" />}
    />
  );
}

function CardControls({
  configuration,
  onChange,
}: {
  configuration: CardConfiguration;
  onChange: (change: Partial<CardConfiguration>) => void;
}) {
  return (
    <PreviewControls
      description="These settings apply to all 40 cards without changing the deck. Disabled prevents interaction without changing the card appearance."
      title="Card state"
    >
      <ControlSelect
        label="Availability"
        name="card-availability"
        options={cardAvailabilityOptions}
        value={String(configuration.disabled)}
        onValueChange={(value) => onChange({ disabled: value === "true" })}
      />
      <ControlSelect
        label="Scale"
        name="card-scale"
        options={cardScaleOptions}
        value={configuration.scale}
        onValueChange={(value) =>
          onChange({ scale: value as CardConfiguration["scale"] })
        }
      />
    </PreviewControls>
  );
}

function GoalControls({
  configuration,
  deepSeaPlayerCount,
  mode,
  onChange,
  onDeepSeaPlayerCountChange,
}: {
  configuration: GoalConfiguration;
  deepSeaPlayerCount: DeepSeaPlayerCount;
  mode: Exclude<AssetMode, "cards">;
  onChange: (change: Partial<GoalConfiguration>) => void;
  onDeepSeaPlayerCountChange: (value: DeepSeaPlayerCount) => void;
}) {
  return (
    <PreviewControls
      description={`These settings apply to all ${mode === "deep-sea" ? DEEP_SEA_TASKS.length : NON_TRUMP_CARDS.length} goals without filtering the catalog.`}
      title="Goal state"
    >
      <ControlSelect
        label="Size"
        name="goal-size"
        options={goalSizeOptions}
        value={configuration.emphasized ? "emphasized" : "default"}
        onValueChange={(value) =>
          onChange({ emphasized: value === "emphasized" })
        }
      />
      <ControlSelect
        label="Outcome"
        name="goal-outcome"
        options={goalOutcomeOptions}
        value={configuration.outcome}
        onValueChange={(value) =>
          onChange({ outcome: value as TaskOutcome })
        }
      />
      {mode === "planet-nine" ? (
        <ControlSelect
          label="Order"
          name="goal-order"
          options={goalOrderOptions}
          value={configuration.order}
          onValueChange={(value) =>
            onChange({ order: value as GoalConfiguration["order"] })
          }
        />
      ) : null}
      {mode === "deep-sea" ? (
        <ControlSelect
          label="Difficulty"
          name="goal-difficulty"
          options={deepSeaDifficultyOptions}
          value={deepSeaPlayerCount}
          onValueChange={(value) =>
            onDeepSeaPlayerCountChange(value as DeepSeaPlayerCount)
          }
        />
      ) : null}
    </PreviewControls>
  );
}

function PreviewControls({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section
      aria-labelledby="asset-preview-controls-title"
      className="rounded-xl border border-indigo-100 bg-indigo-50/55 p-3 sm:p-4"
      data-asset-controls=""
    >
      <div className="mb-3">
        <h2
          className="m-0 text-sm font-bold text-crew-ink"
          id="asset-preview-controls-title"
        >
          {title}
        </h2>
        <p className="mt-1 mb-0 text-xs leading-4 text-crew-ink/60">
          {description}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:flex md:flex-wrap">
        {children}
      </div>
    </section>
  );
}

function ControlSelect({
  label,
  name,
  onValueChange,
  options,
  value,
}: {
  label: string;
  name: string;
  onValueChange: (value: string) => void;
  options: readonly ControlOption[];
  value: string;
}) {
  const id = `asset-control-${name}`;

  return (
    <div className="min-w-0 md:w-44">
      <label
        className="mb-1 block text-xs font-semibold text-crew-ink/70"
        htmlFor={id}
      >
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          aria-controls="asset-catalog"
          className="h-11 w-full border-indigo-100 bg-white text-crew-ink shadow-none"
          data-asset-control={name}
          id={id}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start" position="popper">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PlayingCards({
  configuration,
}: {
  configuration: CardConfiguration;
}) {
  return (
    <div
      className="space-y-8"
      aria-label="Playing cards"
      id="asset-catalog"
    >
      {cardGroups.map(({ suit, cards }) => (
        <section key={suit} aria-labelledby={`asset-suit-${suit}`}>
          <div className="mb-4 flex items-baseline gap-2">
            <h2
              className="font-display text-lg leading-none font-medium"
              id={`asset-suit-${suit}`}
            >
              {suitNames[suit]}
            </h2>
            <span className="text-xs text-crew-ink/50">
              {cards.length} cards
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-x-3 gap-y-4">
            {cards.map((card) => (
              <div
                key={card.id}
                className="flex justify-center"
                data-asset-card={card.id}
                data-asset-disabled={configuration.disabled}
                data-asset-scale={configuration.scale}
              >
                <GameCard
                  card={card}
                  disabled={configuration.disabled}
                  labelPrefix={
                    configuration.disabled ? "Unavailable" : "Preview"
                  }
                  transformScale={
                    configuration.scale === "communication" ? 0.8 : undefined
                  }
                  onClick={() => undefined}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function DeepSeaGoals({
  configuration,
  playerCount,
}: {
  configuration: GoalConfiguration;
  playerCount: DeepSeaPlayerCount;
}) {
  return (
    <ul
      className="grid list-none grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3 p-0"
      aria-label="Mission Deep Sea goals"
      id="asset-catalog"
    >
      {deepSeaGoals.map(({ definition, task }) => {
        const difficulty =
          playerCount === "none"
            ? null
            : definition.difficulty[Number(playerCount) as 3 | 4 | 5];
        const configuredTask = configureGoal(task, configuration, {
          difficulty,
          order: null,
        });

        return (
          <li
            key={definition.id}
            className="flex min-h-48 flex-col items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/55 p-3 text-center"
            data-asset-difficulty={playerCount}
            data-asset-emphasized={configuration.emphasized}
            data-asset-goal={definition.id}
            data-asset-order="none"
            data-asset-task={definition.id}
          >
            <span
              className="w-full text-center font-mono text-[0.65rem] font-medium text-crew-ink/55"
              data-slot="asset-goal-number"
            >
              #{definition.number}
            </span>
            <TaskTile
              emphasized={configuration.emphasized}
              showInfo
              task={configuredTask}
            />
            <p
              className="m-0 line-clamp-3 text-[0.7rem] leading-tight text-crew-ink/70"
              data-slot="asset-goal-description"
            >
              {definition.title}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function PlanetXGoals({
  configuration,
}: {
  configuration: GoalConfiguration;
}) {
  return (
    <ul
      className="grid list-none grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3 p-0"
      aria-label="Planet X goals"
      id="asset-catalog"
    >
      {planetXGoals.map(({ card, task }) => {
        const configuredTask = configureGoal(task, configuration, {
          difficulty: null,
          order:
            configuration.order === "none" ? null : configuration.order,
        });

        return (
          <li
            key={task.id}
            className="flex min-h-40 flex-col items-center rounded-xl border border-indigo-100 bg-indigo-50/55 p-3 text-center"
            data-asset-emphasized={configuration.emphasized}
            data-asset-goal={task.id}
            data-asset-order={configuration.order}
            data-asset-task={task.id}
          >
            <span className="w-full font-mono text-[0.65rem] font-medium text-crew-ink/55">
              {suitNames[card.suit]} {card.value}
            </span>
            <TaskTile
              className="mt-2"
              card={card}
              emphasized={configuration.emphasized}
              task={configuredTask}
            />
          </li>
        );
      })}
    </ul>
  );
}

function configureGoal(
  task: ProjectedTask,
  configuration: GoalConfiguration,
  metadata: Pick<ProjectedTask, "difficulty" | "order">,
): ProjectedTask {
  return {
    ...task,
    ...metadata,
    outcome: configuration.outcome,
  };
}
