"use client";

import Link from "next/link";
import {
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { LevelCompleteCelebration } from "@/components/celebration/LevelCompleteCelebration";
import { Notice } from "@/components/ui/Notice";
import { CARD_DECK } from "@/game/config/cards";

import { GameCard } from "./GameCard";
import { TaskTile } from "./TaskTile";
import type {
  ActorProjection,
  Card,
  CommunicationQualifier,
  PlayerCommand,
  Trick,
} from "./types";
import styles from "./CrewBoard.module.css";

type MobileView = "table" | "crew" | "tasks";
type ViewSelection = { scope: string; view: MobileView };

type CrewBoardProps = {
  projection: ActorProjection;
  connection:
    | "loading"
    | "connected"
    | "reconnecting"
    | "unauthorized"
    | "not-found"
    | "restart-required";
  message: string;
  actionPending: boolean;
  sendCommand: (command: PlayerCommand) => Promise<boolean>;
  onForget: () => void;
};

const phaseCopy: Record<ActorProjection["phase"], string> = {
  setup: "Waiting for launch",
  "assigning-tasks": "Choose objectives",
  "between-tricks": "Between tricks",
  "playing-trick": "Trick in progress",
  adjudicating: "Resolve the mission",
  finished: "Mission finished",
};

const qualifierCopy: Record<CommunicationQualifier, string> = {
  highest: "Highest",
  only: "Only",
  lowest: "Lowest",
};

const cardsById = new Map(CARD_DECK.map((card) => [card.id, card]));

function projectedCard(cardId: string | null | undefined): Card | null {
  if (!cardId) return null;
  return cardsById.get(cardId as Card["id"]) ?? null;
}

export function CrewBoard({
  projection,
  connection,
  message,
  actionPending,
  sendCommand,
  onForget,
}: CrewBoardProps) {
  const viewScope = `${projection.mission.attemptNumber}:${phaseViewScope(projection.phase)}`;
  const [viewSelection, setViewSelection] = useState<ViewSelection>(() => ({
    scope: viewScope,
    view: preferredView(projection.phase),
  }));
  const mobileView =
    viewSelection.scope === viewScope
      ? viewSelection.view
      : preferredView(projection.phase);
  const [communicatingCard, setCommunicatingCard] = useState<Card | null>(null);
  const currentPlayer = projection.players.find((player) => player.isCurrent);
  const won = projection.phase === "finished" && projection.result === "won";
  const showTaskView = mobileView === "tasks";

  return (
    <div className={`${styles.page} game-page`}>
      <LevelCompleteCelebration
        roomId={projection.room.id}
        attemptNumber={projection.mission.attemptNumber}
        active={won}
      />

      <main className={styles.board} id="main-content">
        {connection === "reconnecting" || message ? (
          <Notice tone={message ? "warning" : "info"} live>
            {message || "Connection interrupted. Showing the latest confirmed state while we retry."}
          </Notice>
        ) : null}

        <section className={styles.console} aria-label="Game console">
          <div className={styles.hud}>
            <GameView
              projection={projection}
              mobileView={mobileView}
              showTaskView={showTaskView}
              pending={actionPending}
              sendCommand={sendCommand}
            />
            <MissionSidebar
              projection={projection}
              connection={connection}
              currentPlayerName={currentPlayer?.displayName}
              mobileView={mobileView}
              setMobileView={(view) => setViewSelection({ scope: viewScope, view })}
              pending={actionPending}
              sendCommand={sendCommand}
              onForget={onForget}
            />
          </div>

          <CrewPanels
            projection={projection}
            activeOnMobile={mobileView === "crew"}
          />
        </section>

        <HandDock
          projection={projection}
          pending={actionPending}
          communicatingCard={communicatingCard}
          setCommunicatingCard={setCommunicatingCard}
          sendCommand={sendCommand}
        />
      </main>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {actionPending ? "Sending action" : message}
      </div>
    </div>
  );
}

function GameView({
  projection,
  mobileView,
  showTaskView,
  pending,
  sendCommand,
}: {
  projection: ActorProjection;
  mobileView: MobileView;
  showTaskView: boolean;
  pending: boolean;
  sendCommand: (command: PlayerCommand) => Promise<boolean>;
}) {
  const mobileCrew = mobileView === "crew";
  let content: ReactNode;

  if (projection.phase === "setup") {
    content = <WaitingView projection={projection} />;
  } else if (projection.phase === "finished") {
    content = <ResultView projection={projection} />;
  } else if (showTaskView) {
    content = (
      <TaskBoard projection={projection} pending={pending} sendCommand={sendCommand} />
    );
  } else {
    content = <TrickView projection={projection} />;
  }

  return (
    <section
      className={`${styles.view} ${mobileCrew ? styles.viewHiddenOnMobile : ""}`}
      aria-label="Game table"
    >
      {content}
    </section>
  );
}

function WaitingView({ projection }: { projection: ActorProjection }) {
  return (
    <div className={styles.centerView}>
      <span className={styles.viewIcon} aria-hidden="true">
        🧑‍🚀
      </span>
      <h1>Waiting for the room admin</h1>
      <p>
        You are seated in {projection.room.name}. The mission begins when the admin
        starts the attempt.
      </p>
      <div className={styles.waitingCrew} aria-label="Players in room">
        {projection.players.map((player) => (
          <span key={player.id}>{player.displayName}</span>
        ))}
      </div>
    </div>
  );
}

function ResultView({ projection }: { projection: ActorProjection }) {
  const won = projection.result === "won";
  return (
    <div className={`${styles.centerView} ${styles.resultView}`}>
      <span
        className={`${styles.resultMark} ${won ? styles.resultWon : styles.resultLost}`}
        aria-hidden="true"
      >
        {won ? "✓" : "×"}
      </span>
      <p className={styles.resultLabel}>{won ? "Level complete" : "Attempt complete"}</p>
      <h1>{won ? "Mission complete" : "Mission unsuccessful"}</h1>
      <p>
        {won
          ? `The crew completed Mission ${projection.mission.number}.`
          : "The room admin can restart the level when the crew is ready."}
      </p>
      {projection.tasks.length ? (
        <div className={styles.resultTasks} aria-label="Objective results">
          {projection.tasks.map((task) => (
            <TaskTile
              key={task.id}
              task={task}
              card={projectedCard(task.cardId)}
              ownerName={task.ownerDisplayName}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TrickView({ projection }: { projection: ActorProjection }) {
  const currentPlayer = projection.players.find((player) => player.isCurrent);
  const trick = projection.currentTrick;

  return (
    <div className={styles.tableView}>
      <header className={styles.viewHeading}>
        <div>
          <h1>Current trick</h1>
          <p>
            {currentPlayer
              ? `${currentPlayer.displayName} to play`
              : projection.phase === "between-tricks"
                ? "The leader can begin the next trick."
                : "Waiting for the lead card."}
          </p>
        </div>
        <span>
          Trick {trick?.number ?? (projection.lastTrick ? projection.lastTrick.number + 1 : 1)}
        </span>
      </header>

      <div className={styles.trick}>
        {projection.players.map((player) => {
          const play = trick?.plays.find((candidate) => candidate.playerId === player.id);
          const card = projectedCard(play?.cardId);
          return (
            <div className={styles.trickSeat} key={player.id}>
              <span>{player.displayName}</span>
              {card ? (
                <GameCard card={card} compact />
              ) : (
                <span
                  className={styles.cardSlot}
                  role="img"
                  aria-label={`${player.displayName} has not played`}
                />
              )}
            </div>
          );
        })}
      </div>

      {projection.lastTrick ? (
        <LastTrick trick={projection.lastTrick} players={projection.players} />
      ) : (
        <p className={styles.tableHint}>
          {projection.phase === "between-tricks"
            ? "Play a card from the hand dock below."
            : "Cards appear here as the crew plays."}
        </p>
      )}
    </div>
  );
}

function LastTrick({
  trick,
  players,
}: {
  trick: Trick;
  players: ActorProjection["players"];
}) {
  const winner = players.find((player) => player.id === trick.winnerPlayerId);
  return (
    <details className={styles.lastTrick}>
      <summary>Last trick{winner ? ` · ${winner.displayName} won` : ""}</summary>
      <div>
        {trick.plays.map((play) => {
          const card = projectedCard(play.cardId);
          return card ? (
            <GameCard card={card} compact key={`${play.playerId}-${play.cardId}`} />
          ) : null;
        })}
      </div>
    </details>
  );
}

function TaskBoard({
  projection,
  pending,
  sendCommand,
}: {
  projection: ActorProjection;
  pending: boolean;
  sendCommand: (command: PlayerCommand) => Promise<boolean>;
}) {
  if (!projection.tasks.length) {
    return (
      <div className={styles.centerView}>
        <h1>Manual mission</h1>
        <p>Use the printed mission rule, then record the outcome in the sidebar.</p>
      </div>
    );
  }

  return (
    <div className={styles.taskView}>
      <header className={styles.viewHeading}>
        <div>
          <h1>Objectives</h1>
          <p>
            {projection.phase === "assigning-tasks"
              ? "Choose a task when it is your turn."
              : "Resolve each objective using the printed mission rules."}
          </p>
        </div>
        <span>
          {projection.tasks.filter((task) => task.outcome === "success").length}/
          {projection.tasks.length}
        </span>
      </header>
      <ul className={styles.taskGrid}>
        {projection.tasks.map((task) => {
          const owner = projection.players.find((player) => player.id === task.ownerPlayerId);
          const claimable = projection.legalActions.claimableTaskIds.includes(task.id);
          const canResolve = projection.legalActions.taskOutcomeTaskIds.includes(task.id);

          return (
            <li key={task.id}>
              <TaskTile
                task={task}
                card={projectedCard(task.cardId)}
                ownerName={owner?.displayName ?? null}
                emphasized={projection.phase === "assigning-tasks"}
                action={
                  claimable ? (
                    <button
                      className={styles.tileAction}
                      type="button"
                      disabled={pending}
                      onClick={() => void sendCommand({ type: "claim-task", taskId: task.id })}
                    >
                      Claim
                    </button>
                  ) : canResolve ? (
                    <span
                      className={styles.tileOutcomeActions}
                      role="group"
                      aria-label={`Resolve ${task.title}`}
                    >
                      <button
                        type="button"
                        disabled={pending}
                        aria-pressed={task.outcome === "pending"}
                        aria-label={`Mark ${task.title} pending`}
                        onClick={() =>
                          void sendCommand({
                            type: "set-task-outcome",
                            taskId: task.id,
                            outcome: "pending",
                          })
                        }
                      >
                        ·
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        aria-pressed={task.outcome === "success"}
                        aria-label={`Mark ${task.title} successful`}
                        onClick={() =>
                          void sendCommand({
                            type: "set-task-outcome",
                            taskId: task.id,
                            outcome: "success",
                          })
                        }
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        aria-pressed={task.outcome === "failure"}
                        aria-label={`Mark ${task.title} failed`}
                        onClick={() =>
                          void sendCommand({
                            type: "set-task-outcome",
                            taskId: task.id,
                            outcome: "failure",
                          })
                        }
                      >
                        ×
                      </button>
                    </span>
                  ) : undefined
                }
              />
              <span className={styles.taskOwner}>{owner?.displayName ?? "Unassigned"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MissionSidebar({
  projection,
  connection,
  currentPlayerName,
  mobileView,
  setMobileView,
  pending,
  sendCommand,
  onForget,
}: {
  projection: ActorProjection;
  connection: CrewBoardProps["connection"];
  currentPlayerName?: string;
  mobileView: MobileView;
  setMobileView: (view: MobileView) => void;
  pending: boolean;
  sendCommand: (command: PlayerCommand) => Promise<boolean>;
  onForget: () => void;
}) {
  const edition =
    projection.mission.editionKey === "deep-sea"
      ? { icon: "🌊", title: "Mission Deep Sea" }
      : { icon: "🚀", title: "The Quest for Planet Nine" };

  return (
    <aside className={styles.sidebar} aria-label="Mission information">
      <div>
        <Link className={styles.brand} href="/" aria-label="Crew home">
          <span aria-hidden="true">🧑‍🚀</span> The Crew
        </Link>
        <p className={styles.edition}>
          <span aria-hidden="true">{edition.icon}</span> {edition.title}
        </p>

        <div className={styles.counters}>
          <Counter label="Mission" value={projection.mission.number} />
          <Counter label="Attempt" value={projection.mission.attemptNumber} />
        </div>

        <div className={styles.missionCopy}>
          <strong>{projection.mission.title}</strong>
          <span>{phaseCopy[projection.phase]}</span>
          {currentPlayerName ? <span>{currentPlayerName}&apos;s turn</span> : null}
        </div>

        <div className={styles.roomMeta}>
          <span>{projection.room.name}</span>
          <span className="player-identity">{projection.self.displayName}</span>
          <span className={connection === "reconnecting" ? styles.offline : styles.online}>
            {connection === "reconnecting" ? "Reconnecting" : "Live"}
          </span>
        </div>

        {projection.mission.manualRule || projection.mission.deadSpot ? (
          <div className={styles.ruleNotes}>
            {projection.mission.manualRule ? <span>Manual rule</span> : null}
            {projection.mission.deadSpot ? <span>No communication</span> : null}
          </div>
        ) : null}

        {projection.phase !== "setup" && projection.phase !== "finished" ? (
          <nav className={styles.mobileTabs} aria-label="Game views">
            {(["table", "crew", "tasks"] as const).map((view) => (
              <button
                key={view}
                type="button"
                aria-pressed={mobileView === view}
                onClick={() => setMobileView(view)}
              >
                {view === "tasks" ? `Tasks ${projection.tasks.length}` : capitalize(view)}
              </button>
            ))}
          </nav>
        ) : null}
      </div>

      <div className={styles.sidebarActions}>
        {projection.legalActions.canPassTask ? (
          <button
            className="button button--primary button--small"
            type="button"
            disabled={pending}
            onClick={() => void sendCommand({ type: "pass-task" })}
          >
            Pass task
          </button>
        ) : null}
        {projection.legalActions.canSetMissionOutcome ? (
          <MissionOutcomeActions pending={pending} sendCommand={sendCommand} />
        ) : projection.phase === "adjudicating" ? (
          <p className={styles.actionHint}>Mark every remaining objective in the Tasks view.</p>
        ) : null}
        <button className={styles.forgetButton} type="button" onClick={onForget}>
          Forget this room
        </button>
      </div>
    </aside>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function MissionOutcomeActions({
  pending,
  sendCommand,
}: {
  pending: boolean;
  sendCommand: (command: PlayerCommand) => Promise<boolean>;
}) {
  return (
    <section className={styles.missionOutcome} aria-labelledby="mission-outcome-title">
      <h2 id="mission-outcome-title">How did the mission go?</h2>
      <p>Check the printed rule, then record the result.</p>
      <button
        className="button button--primary button--small"
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm("Mark this mission complete?")) {
            void sendCommand({ type: "set-mission-outcome", outcome: "success" });
          }
        }}
      >
        Mission complete
      </button>
      <button
        className="button button--quiet button--small"
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm("Mark this attempt unsuccessful?")) {
            void sendCommand({ type: "set-mission-outcome", outcome: "failure" });
          }
        }}
      >
        Mission failed
      </button>
    </section>
  );
}

function CrewPanels({
  projection,
  activeOnMobile,
}: {
  projection: ActorProjection;
  activeOnMobile: boolean;
}) {
  return (
    <section
      className={`${styles.panels} ${activeOnMobile ? styles.panelsActiveOnMobile : ""}`}
      style={{ "--crew-count": projection.players.length } as CSSProperties}
      aria-label="Crew"
    >
      {projection.players.map((player) => {
        const played = projection.currentTrick?.plays.find(
          (play) => play.playerId === player.id,
        );
        const communicationCard = projectedCard(player.communication?.cardId);
        const tasks = projection.tasks.filter((task) => task.ownerPlayerId === player.id);

        return (
          <article className={styles.playerPanel} key={player.id}>
            <header className={styles.playerHeader}>
              <span className={player.id === projection.self.id ? styles.selfName : ""}>
                {player.displayName}
              </span>
              <span className={styles.playerBadges}>
                {player.isCaptain ? <span title="Captain">👑</span> : null}
                <span title={`${player.tricksWon} tricks won`}>{numberEmoji(player.tricksWon)}</span>
              </span>
            </header>

            <div className={styles.playerCards}>
              <CardStation
                label="Played"
                card={projectedCard(played?.cardId)}
                placeholder={player.isCurrent ? "Turn" : "—"}
              />
              <CardStation
                label="Communication"
                card={communicationCard}
                placeholder="—"
                qualifier={player.communication?.qualifier}
              />
            </div>

            <div className={styles.playerTasks} aria-label={`${player.displayName}'s objectives`}>
              {tasks.length ? (
                tasks.map((task) => (
                  <TaskTile
                    key={task.id}
                    task={task}
                    card={projectedCard(task.cardId)}
                    ownerName={player.displayName}
                  />
                ))
              ) : (
                <span
                  className={styles.emptyTaskSlot}
                  role="img"
                  aria-label="No assigned objectives"
                >
                  +
                </span>
              )}
            </div>

            <p className={styles.playerCounts}>
              {player.cardCount} cards · {player.tricksWon} tricks
            </p>
          </article>
        );
      })}
    </section>
  );
}

function CardStation({
  label,
  card,
  placeholder,
  qualifier,
}: {
  label: string;
  card: Card | null;
  placeholder: string;
  qualifier?: CommunicationQualifier;
}) {
  return (
    <span className={styles.cardStation}>
      <small>{label}</small>
      {card ? (
        <span className={styles.communicatedCard}>
          <GameCard card={card} compact />
          {qualifier ? <span>{qualifierCopy[qualifier]}</span> : null}
        </span>
      ) : (
        <span className={styles.miniCardSlot}>{placeholder}</span>
      )}
    </span>
  );
}

function HandDock({
  projection,
  pending,
  communicatingCard,
  setCommunicatingCard,
  sendCommand,
}: {
  projection: ActorProjection;
  pending: boolean;
  communicatingCard: Card | null;
  setCommunicatingCard: (card: Card | null) => void;
  sendCommand: (command: PlayerCommand) => Promise<boolean>;
}) {
  const communicationOption = projection.legalActions.communicationOptions.find(
    (option) => option.cardId === communicatingCard?.id,
  );

  return (
    <section className={styles.dock} aria-labelledby="hand-title">
      <header className={styles.dockHeading}>
        <h2 id="hand-title">Your hand</h2>
        <span>{projection.self.hand.length} cards</span>
      </header>

      {communicatingCard && communicationOption ? (
        <div className={styles.communicationPicker} role="group" aria-label="Choose communication">
          <GameCard card={communicatingCard} compact />
          <span>Communicate as</span>
          {communicationOption.qualifiers.map((qualifier) => (
            <button
              type="button"
              key={qualifier}
              disabled={pending}
              onClick={() => {
                void sendCommand({
                  type: "communicate",
                  cardId: communicatingCard.id,
                  qualifier,
                }).then((sent) => {
                  if (sent) setCommunicatingCard(null);
                });
              }}
            >
              {qualifierCopy[qualifier]}
            </button>
          ))}
          <button type="button" onClick={() => setCommunicatingCard(null)}>
            Cancel
          </button>
        </div>
      ) : null}

      <div className={styles.hand}>
        {projection.self.hand.length ? (
          projection.self.hand.map((card) => {
            const playable = projection.legalActions.playableCardIds.includes(card.id);
            const communicable = projection.legalActions.communicationOptions.some(
              (option) => option.cardId === card.id,
            );
            const readableCard = `${capitalize(card.suit)} ${card.value}`;

            return (
              <div className={styles.handCard} key={card.id}>
                <GameCard
                  card={card}
                  disabled={pending}
                  selected={communicatingCard?.id === card.id}
                  labelPrefix={playable ? "Play" : communicable ? "Card" : "Unavailable"}
                  onClick={
                    playable
                      ? () => void sendCommand({ type: "play-card", cardId: card.id })
                      : undefined
                  }
                />
                {communicable ? (
                  <button
                    className={styles.communicateButton}
                    type="button"
                    disabled={pending}
                    aria-label={`Communicate ${readableCard}`}
                    onClick={() => setCommunicatingCard(card)}
                  >
                    Communicate
                  </button>
                ) : playable ? (
                  <span>Play</span>
                ) : null}
              </div>
            );
          })
        ) : (
          <p className={styles.emptyHand}>
            {projection.phase === "setup"
              ? "Cards appear here when the mission starts."
              : "No cards remain in your hand."}
          </p>
        )}
      </div>
    </section>
  );
}

function numberEmoji(value: number) {
  const numerals = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];
  return numerals[value] ?? String(value);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function phaseViewScope(phase: ActorProjection["phase"]) {
  if (phase === "between-tricks" || phase === "playing-trick") return "gameplay";
  return phase;
}

function preferredView(phase: ActorProjection["phase"]): MobileView {
  return phase === "assigning-tasks" || phase === "adjudicating"
    ? "tasks"
    : "table";
}
