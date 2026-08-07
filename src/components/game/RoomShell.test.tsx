import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ActorProjection } from "./types";
import { RoomShell } from "./RoomShell";

const deepSeaTask: ActorProjection["tasks"][number] = {
  id: "task-85",
  definitionId: "deep-sea-task-85",
  difficulty: 3,
  cardId: null,
  order: null,
  ownerPlayerId: null,
  ownerDisplayName: null,
  outcome: "pending",
  title: "I will win exactly two 9s",
  footnote: null,
};

function deepSeaProjection(
  phase: ActorProjection["phase"],
): ActorProjection {
  const players: ActorProjection["players"] = [
    {
      id: "player-1",
      displayName: "Ada",
      tags: [],
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

  return {
    room: { id: "room-deep-sea", name: "Europa" },
    mission: {
      editionKey: "deep-sea",
      missionKey: "deep-sea:1",
      number: 1,
      title: "First Dive",
      attemptNumber: 1,
      manualRule: false,
      deadSpot: false,
    },
    phase,
    result: null,
    self: {
      id: "player-1",
      displayName: "Ada",
      tags: [],
      seat: 1,
      hand: [],
      captured: [],
      tricksWon: 0,
      communication: null,
    },
    players,
    tasks: [deepSeaTask],
    currentTrick: null,
    lastTrick: null,
    legalActions: {
      canStartMission: false,
      canStartTrick: false,
      claimableTaskIds: phase === "assigning-tasks" ? [deepSeaTask.id] : [],
      releasableTaskIds: [],
      canPassTask: false,
      playableCardIds: [],
      communicationOptions: [],
      taskOutcomeTaskIds: [],
      canSetMissionOutcome: false,
    },
  };
}

describe("RoomShellImpl", () => {
  it("keeps the Deep Sea boot and info control outside claim and release buttons", () => {
    const assigningMarkup = renderToStaticMarkup(
      <RoomShell
        actionPending={false}
        connection="connected"
        message=""
        projection={deepSeaProjection("assigning-tasks")}
        sendCommand={async () => true}
        onForget={() => undefined}
      />,
    );
    const infoLabel =
      'aria-label="Difficulty 3. View details for I will win exactly two 9s"';

    function expectSiblingBoot(markup: string, selectionLabel: string) {
      const labelIndex = markup.indexOf(`aria-label="${selectionLabel}"`);
      const buttonStart = markup.lastIndexOf("<button", labelIndex);
      const buttonEnd = markup.indexOf("</button>", labelIndex) + 9;
      const selectionButton = markup.slice(buttonStart, buttonEnd);
      const bootIndex = markup.indexOf('data-slot="task-boot"', buttonEnd);

      expect(labelIndex).toBeGreaterThan(-1);
      expect(selectionButton.match(/<button/g)).toHaveLength(1);
      expect(selectionButton).toContain(`data-task-id="${deepSeaTask.id}"`);
      expect(selectionButton).not.toContain(infoLabel);
      expect(selectionButton).not.toContain('data-slot="task-boot"');
      expect(bootIndex).toBeGreaterThan(buttonEnd);
      expect(markup.indexOf(infoLabel)).toBeGreaterThan(buttonEnd);
      expect(markup.slice(bootIndex)).toContain('data-slot="task-status"');
      expect(markup.slice(bootIndex)).toContain(
        'data-slot="deep-sea-task-difficulty"',
      );
    }

    expectSiblingBoot(
      assigningMarkup,
      "Assign I will win exactly two 9s to me",
    );

    const readyProjection = deepSeaProjection("ready-to-start-trick");
    readyProjection.tasks = [
      {
        ...deepSeaTask,
        ownerPlayerId: "player-1",
        ownerDisplayName: "Ada",
      },
      {
        ...deepSeaTask,
        id: "task-1",
        definitionId: "deep-sea-task-1",
        difficulty: 2,
        ownerPlayerId: "player-2",
        ownerDisplayName: "Grace",
        title: "I will win a trick using a 5",
      },
    ];
    readyProjection.legalActions.releasableTaskIds = [deepSeaTask.id];
    const readyMarkup = renderToStaticMarkup(
      <RoomShell
        actionPending={false}
        connection="connected"
        message=""
        projection={readyProjection}
        sendCommand={async () => true}
        onForget={() => undefined}
      />,
    );

    expectSiblingBoot(readyMarkup, "Deselect I will win exactly two 9s");
    expect(readyMarkup).toContain(
      'aria-label="Difficulty 2. View details for I will win a trick using a 5"',
    );
  });

  it("opens Deep Sea details from difficulty during an active trick", () => {
    const projection = deepSeaProjection("playing-trick");
    projection.tasks = [
      {
        ...deepSeaTask,
        ownerPlayerId: "player-1",
        ownerDisplayName: "Ada",
      },
    ];

    const markup = renderToStaticMarkup(
      <RoomShell
        actionPending={false}
        connection="connected"
        message=""
        projection={projection}
        sendCommand={async () => true}
        onForget={() => undefined}
      />,
    );

    expect(markup).toContain('data-slot="task-boot"');
    expect(markup).toContain('data-slot="task-status"');
    expect(markup).toContain('data-slot="deep-sea-task-difficulty"');
    expect(markup).toContain(
      'aria-label="Difficulty 3. View details for I will win exactly two 9s"',
    );
    expect(markup).not.toContain('data-slot="task-info"');
  });
});
