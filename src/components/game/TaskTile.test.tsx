import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DEEP_SEA_TASK_VISUALS } from "@/game/config/deep-sea-task-visuals";

import type { Card, ProjectedTask } from "./types";
import { TaskTile } from "./TaskTile";

const cards = [
  { id: "pink-1", suit: "pink", value: 1 },
  { id: "blue-1", suit: "blue", value: 1 },
  { id: "green-1", suit: "green", value: 1 },
  { id: "yellow-1", suit: "yellow", value: 1 },
  { id: "trump-1", suit: "trump", value: 1 },
] satisfies Card[];

function taskFor(
  card: Card | null,
  overrides: Partial<ProjectedTask> = {},
): ProjectedTask {
  return {
    id: `task-${card?.id ?? "deep-sea"}`,
    definitionId: card?.id ?? "deep-sea-task-1",
    difficulty: null,
    cardId: card?.id ?? null,
    order: null,
    ownerPlayerId: null,
    outcome: "pending",
    title: card
      ? `Capture ${card.suit} ${card.value}`
      : "I will win a trick using a 5",
    footnote: null,
    ownerDisplayName: null,
    ...overrides,
  };
}

describe("TaskTile", () => {
  it("uses the Deep Sea difficulty as the optional TaskBoot info trigger", () => {
    const markup = renderToStaticMarkup(
      <TaskTile
        emphasized
        showInfo
        task={taskFor(null, {
          definitionId: "deep-sea-task-85",
          difficulty: 3,
          title: "I will win exactly two 9s",
        })}
      />,
    );

    expect(markup).toContain('data-slot="task-boot"');
    expect(markup).toContain('data-slot="task-status"');
    expect(markup).toContain('data-slot="deep-sea-task-difficulty"');
    expect(markup).toContain("lucide-gauge");
    expect(markup).toContain("h-3.5");
    expect(markup).toContain("px-0.5");
    expect(markup).not.toContain("w-7");
    expect(markup).toContain("size-2.5");
    expect(markup).not.toContain("lucide-badge-info");
    expect(markup).not.toContain('data-slot="task-info"');
    expect(markup).toContain(
      'aria-label="Difficulty 3. View details for I will win exactly two 9s"',
    );
    expect(markup).toContain("View details for I will win exactly two 9s");
    expect(markup).not.toContain('data-slot="task-order"');
    expect(
      markup.match(
        /data-slot="(?:deep-sea-task-difficulty|task-info|task-status)"/g,
      ),
    ).toEqual([
      'data-slot="deep-sea-task-difficulty"',
      'data-slot="task-status"',
    ]);
  });

  it("shows Deep Sea difficulty without requiring the info button", () => {
    const markup = renderToStaticMarkup(
      <TaskTile task={taskFor(null, { difficulty: 2 })} />,
    );

    expect(markup).toContain('data-slot="task-boot"');
    expect(markup).toContain('data-slot="deep-sea-task-difficulty"');
    expect(markup).toContain("lucide-gauge");
    expect(markup).not.toContain("lucide-badge-info");
    expect(markup).not.toContain("View details for");
  });

  it("never adds Deep Sea difficulty or information to Planet X boots", () => {
    const markup = renderToStaticMarkup(
      <TaskTile
        card={cards[0]}
        showInfo
        task={taskFor(cards[0], { difficulty: 4, order: "first" })}
      />,
    );

    expect(markup).toContain('data-slot="task-boot"');
    expect(markup).toContain('data-slot="task-status"');
    expect(markup).toContain('data-slot="task-order"');
    expect(markup).not.toContain('data-slot="deep-sea-task-difficulty"');
    expect(markup).not.toContain("lucide-gauge");
    expect(markup).not.toContain("lucide-badge-info");
    expect(markup).not.toContain("View details for");
    expect(markup).not.toContain("Difficulty 4.");
  });

  it("suppresses order for Deep Sea even when projection data includes it", () => {
    const markup = renderToStaticMarkup(
      <TaskTile
        task={taskFor(null, { difficulty: 3, order: "last-trick" })}
      />,
    );

    expect(markup).toContain('data-slot="task-boot"');
    expect(markup).toContain('data-slot="task-status"');
    expect(markup).toContain('data-slot="deep-sea-task-difficulty"');
    expect(markup).not.toContain('data-slot="task-order"');
    expect(markup).not.toContain("Order last-trick.");
  });

  it("can omit TaskBoot for safe external composition", () => {
    const markup = renderToStaticMarkup(
      <TaskTile showBoot={false} task={taskFor(null, { difficulty: 3 })} />,
    );

    expect(markup).toContain('data-slot="task-tile"');
    expect(markup).not.toContain('data-slot="task-boot"');
    expect(markup).not.toContain('data-slot="task-status"');
  });

  it("renders all three structured Deep Sea face variants", () => {
    const wildcard = renderToStaticMarkup(
      <TaskTile task={taskFor(null, { definitionId: "deep-sea-task-1" })} />,
    );
    const header = renderToStaticMarkup(
      <TaskTile task={taskFor(null, { definitionId: "deep-sea-task-3" })} />,
    );
    const text = renderToStaticMarkup(
      <TaskTile task={taskFor(null, { definitionId: "deep-sea-task-4" })} />,
    );
    const cardsFace = renderToStaticMarkup(
      <TaskTile task={taskFor(null, { definitionId: "deep-sea-task-9" })} />,
    );

    expect(header).toContain('data-slot="deep-sea-task-header"');
    expect(header).toContain("WIN MORE");
    expect(header.match(/WIN MORE/g)).toHaveLength(1);
    expect(wildcard).toContain('data-card-suit="wild"');
    expect(wildcard).toMatch(
      /class="[^"]*text-white[^"]*"[^>]*data-card-suit="wild"/,
    );
    expect(wildcard).toContain("background-image:conic-gradient(");
    expect(wildcard).toContain("var(--color-red-400)");
    expect(wildcard).toContain("var(--color-amber-400)");
    expect(wildcard).toContain("var(--color-emerald-500)");
    expect(wildcard).toContain("var(--color-sky-500)");
    expect(wildcard).not.toContain("data:image/");
    expect(text).toContain('data-slot="deep-sea-task-text"');
    expect(text).toContain("Win =X tricks (public)");
    expect(cardsFace).toContain('data-slot="deep-sea-task-cards"');
    expect(
      cardsFace.match(/data-slot="deep-sea-task-mini-card"/g),
    ).toHaveLength(4);
  });

  it("uses centered multiplication signs for zero-count Deep Sea visuals", () => {
    const visuals = JSON.stringify(DEEP_SEA_TASK_VISUALS);
    const header = renderToStaticMarkup(
      <TaskTile task={taskFor(null, { definitionId: "deep-sea-task-6" })} />,
    );
    const cardsFace = renderToStaticMarkup(
      <TaskTile task={taskFor(null, { definitionId: "deep-sea-task-26" })} />,
    );
    const text = renderToStaticMarkup(
      <TaskTile task={taskFor(null, { definitionId: "deep-sea-task-51" })} />,
    );

    expect(visuals).toContain("0×");
    expect(visuals).not.toMatch(/0(?:x|ˣ)/);
    expect(header).toContain("WIN =0×");
    expect(cardsFace.match(/0×/g)).toHaveLength(2);
    expect(text).toContain("Win 0× tricks");
  });
});
