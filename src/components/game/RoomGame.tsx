"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

import { LevelCompleteCelebration } from "@/components/celebration/LevelCompleteCelebration";
import { CrewMark } from "@/components/ui/CrewMark";
import { Notice } from "@/components/ui/Notice";
import { Spinner } from "@/components/ui/Spinner";
import { CARD_DECK } from "@/game/config/cards";

import { forgetCredential, readCredential, type StoredCredential } from "./credentials";
import { GameCard } from "./GameCard";
import styles from "./RoomGame.module.css";
import type {
  ActorProjection,
  Card,
  CommunicationQualifier,
  PlayerCommand,
  ProjectedTask,
  Trick,
} from "./types";
import { useRoomProjection } from "./useRoomProjection";

type MobileView = "table" | "crew" | "tasks";

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

export function RoomGame() {
  const params = useParams<{ name: string }>();
  const router = useRouter();
  const routeName = decodeURIComponent(params.name);
  const [credential, setCredential] = useState<StoredCredential | null>(null);
  const [credentialLoaded, setCredentialLoaded] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("table");
  const [communicatingCard, setCommunicatingCard] = useState<Card | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCredential(readCredential(routeName));
      setCredentialLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [routeName]);

  const { projection, connection, message, actionPending, sendCommand } =
    useRoomProjection(routeName, credential);

  const communicationOption = projection?.legalActions.communicationOptions.find(
    (option) => option.cardId === communicatingCard?.id,
  );

  function forgetRoom() {
    forgetCredential(routeName);
    router.replace("/");
  }

  if (!credentialLoaded || (connection === "loading" && !projection)) {
    return (
      <main className="centered-state" id="main-content">
        <CrewMark size="large" />
        <Spinner label="Loading room" />
        <p>Opening the airlock…</p>
      </main>
    );
  }

  if (!credential || connection === "unauthorized") {
    return (
      <main className="centered-state" id="main-content">
        <CrewMark size="large" />
        <p className="eyebrow">Credentials needed</p>
        <h1>Join {routeName}</h1>
        <p className="lede">This device does not have a valid player key for the room.</p>
        <Link className="button button--primary" href="/">
          Return to join
        </Link>
        {credential ? (
          <button className="button button--ghost" type="button" onClick={forgetRoom}>
            Forget saved key
          </button>
        ) : null}
      </main>
    );
  }

  if (connection === "not-found") {
    return (
      <main className="centered-state" id="main-content">
        <CrewMark size="large" />
        <p className="eyebrow">Room unavailable</p>
        <h1>{routeName} was not found</h1>
        <p className="lede">It may have been renamed or deleted by the room admin.</p>
        <button className="button button--primary" type="button" onClick={forgetRoom}>
          Forget room and go home
        </button>
      </main>
    );
  }

  if (connection === "restart-required") {
    return (
      <main className="centered-state" id="main-content">
        <CrewMark size="large" />
        <p className="eyebrow">Restart required</p>
        <h1>The game rules changed</h1>
        <p className="lede">
          {message ||
            "Ask the room admin to restart this level. Your room and player key are safe."}
        </p>
        <button className="button button--ghost" type="button" onClick={forgetRoom}>
          Return home
        </button>
      </main>
    );
  }

  if (!projection) {
    return (
      <main className="centered-state" id="main-content">
        <CrewMark size="large" />
        <h1>We lost contact</h1>
        <p className="lede">{message || "Crew will keep trying to reach the room."}</p>
        <button className="button button--ghost" type="button" onClick={forgetRoom}>
          Return home
        </button>
      </main>
    );
  }

  const currentPlayer = projection.players.find((player) => player.isCurrent);
  const isWon = projection.phase === "finished" && projection.result === "won";

  return (
    <div className={`${styles.root} game-page`}>
      <LevelCompleteCelebration
        roomId={projection.room.id}
        attemptNumber={projection.mission.attemptNumber}
        active={isWon}
      />

      <header className="game-header">
        <Link href="/" className="brand-link" aria-label="Crew home">
          <CrewMark />
        </Link>
        <div className="game-header__mission">
          <p className="eyebrow">
            {projection.mission.editionKey === "deep-sea" ? "Mission Deep Sea" : "Planet Nine"}
          </p>
          <h1>
            Mission {projection.mission.number}
            <span aria-hidden="true"> · </span>
            <span className="mission-title">{projection.mission.title}</span>
          </h1>
        </div>
        <div className="game-header__status">
          <span
            className={`connection-pill ${
              connection === "reconnecting" ? "connection-pill--warning" : ""
            }`}
            role="status"
          >
            <span className="connection-pill__dot" aria-hidden="true" />
            {connection === "reconnecting" ? "Reconnecting" : "Live"}
          </span>
          <span className="player-identity">{projection.self.displayName}</span>
          <button className="icon-button" type="button" onClick={forgetRoom} title="Forget this room">
            <span aria-hidden="true">↗</span>
            <span className="sr-only">Forget this room on this device</span>
          </button>
        </div>
      </header>

      <main className="game-main" id="main-content">
        <section className="mission-bar" aria-label="Mission status">
          <div>
            <p className="eyebrow">Room {projection.room.name}</p>
            <p className="mission-status">
              {phaseCopy[projection.phase]}
              {currentPlayer ? ` · ${currentPlayer.displayName}'s turn` : ""}
            </p>
          </div>
          <div className="mission-flags">
            <span className="status-chip">Attempt {projection.mission.attemptNumber}</span>
            {projection.mission.manualRule ? (
              <span className="status-chip status-chip--manual">Manual rule</span>
            ) : null}
            {projection.mission.deadSpot ? (
              <span className="status-chip status-chip--warning">No communication</span>
            ) : null}
          </div>
        </section>

        {connection === "reconnecting" || message ? (
          <Notice tone={message ? "warning" : "info"} live>
            {message || "Connection interrupted. Showing the latest confirmed state while we retry."}
          </Notice>
        ) : null}

        {projection.phase === "setup" ? (
          <WaitingRoom projection={projection} />
        ) : projection.phase === "finished" ? (
          <ResultView
            projection={projection}
            pending={actionPending}
            sendCommand={sendCommand}
          />
        ) : (
          <>
            <nav className="mobile-game-tabs" aria-label="Game views">
              {(["table", "crew", "tasks"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  aria-pressed={mobileView === view}
                  onClick={() => setMobileView(view)}
                >
                  {view === "tasks" ? `Tasks (${projection.tasks.length})` : capitalize(view)}
                </button>
              ))}
            </nav>

            <div className="game-grid">
              <section
                className={`surface table-surface mobile-view ${
                  mobileView === "table" ? "mobile-view--active" : ""
                }`}
                aria-labelledby="table-title"
              >
                <div className="surface-heading">
                  <div>
                    <p className="eyebrow">Shared table</p>
                    <h2 id="table-title">Current trick</h2>
                  </div>
                  <span className="turn-copy">
                    {currentPlayer
                      ? `${currentPlayer.displayName} to play`
                      : "Waiting for the next trick"}
                  </span>
                </div>
                <TrickTable projection={projection} />
              </section>

              <aside
                className={`surface crew-surface mobile-view ${
                  mobileView === "crew" ? "mobile-view--active" : ""
                }`}
                aria-labelledby="crew-title"
              >
                <div className="surface-heading">
                  <div>
                    <p className="eyebrow">Flight crew</p>
                    <h2 id="crew-title">{projection.players.length} players</h2>
                  </div>
                </div>
                <CrewList projection={projection} />
              </aside>

              <aside
                className={`surface tasks-surface mobile-view ${
                  mobileView === "tasks" ? "mobile-view--active" : ""
                }`}
                aria-labelledby="tasks-title"
              >
                <div className="surface-heading">
                  <div>
                    <p className="eyebrow">Objectives</p>
                    <h2 id="tasks-title">
                      {projection.tasks.length
                        ? `${projection.tasks.filter((task) => task.outcome === "success").length}/${
                            projection.tasks.length
                          } complete`
                        : "Manual mission"}
                    </h2>
                  </div>
                  {projection.legalActions.canPassTask ? (
                    <button
                      className="button button--quiet button--small"
                      type="button"
                      disabled={actionPending}
                      onClick={() => void sendCommand({ type: "pass-task" })}
                    >
                      Pass
                    </button>
                  ) : null}
                </div>
                <TaskList
                  projection={projection}
                  pending={actionPending}
                  sendCommand={sendCommand}
                />
              </aside>
            </div>

            {projection.legalActions.canSetMissionOutcome ? (
              <MissionAdjudication pending={actionPending} sendCommand={sendCommand} />
            ) : projection.phase === "adjudicating" ? (
              <AdjudicationReminder />
            ) : null}

            <section className="hand-tray" aria-labelledby="hand-title">
              <div className="hand-tray__heading">
                <div>
                  <p className="eyebrow">Your hand</p>
                  <h2 id="hand-title">{projection.self.hand.length} cards</h2>
                </div>
                {projection.legalActions.communicationOptions.length ? (
                  <span className="field-hint">
                    Activate a card to play it, or use its separate Communicate action.
                  </span>
                ) : null}
              </div>

              {communicatingCard && communicationOption ? (
                <div className="communication-picker" role="group" aria-label="Choose communication">
                    <GameCard card={communicatingCard} compact />
                  <div>
                    <p>
                      Communicate{" "}
                      <strong>
                        {communicatingCard.suit} {communicatingCard.value}
                      </strong>{" "}
                      as:
                    </p>
                    <div className="button-row">
                      {communicationOption.qualifiers.map((qualifier) => (
                        <button
                          className="button button--secondary button--small"
                          type="button"
                          key={qualifier}
                          disabled={actionPending}
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
                      <button
                        className="button button--quiet button--small"
                        type="button"
                        onClick={() => setCommunicatingCard(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="hand-scroll">
                {projection.self.hand.map((card) => {
                  const playable = projection.legalActions.playableCardIds.includes(card.id);
                  const communicable = projection.legalActions.communicationOptions.some(
                    (option) => option.cardId === card.id,
                  );
                  const readableCard = `${capitalize(card.suit)} ${card.value}`;

                  return (
                    <div className="hand-card-action" key={card.id}>
                      <GameCard
                        card={card}
                        disabled={actionPending}
                        selected={communicatingCard?.id === card.id}
                        labelPrefix={playable ? "Play" : communicable ? "Card" : "Unavailable"}
                        onClick={
                          playable
                            ? () => {
                                void sendCommand({ type: "play-card", cardId: card.id });
                              }
                            : undefined
                        }
                      />
                      {communicable ? (
                        <button
                          className="card-text-action"
                          type="button"
                          disabled={actionPending}
                          aria-label={`Communicate ${readableCard}`}
                          onClick={() => setCommunicatingCard(card)}
                        >
                          Communicate
                        </button>
                      ) : playable ? (
                        <span className="card-caption">Play</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {actionPending ? "Sending action" : message}
      </div>
    </div>
  );
}

function WaitingRoom({ projection }: { projection: ActorProjection }) {
  return (
    <section className="surface waiting-room" aria-labelledby="waiting-title">
      <div className="waiting-illustration" aria-hidden="true">
        <span>✦</span>
      </div>
      <p className="eyebrow">Preflight</p>
      <h2 id="waiting-title">Waiting for the room admin</h2>
      <p>
        Your key works and you are in the crew. The mission will appear here as soon as the admin
        starts this attempt.
      </p>
      <div className="waiting-crew" aria-label="Players in room">
        {projection.players.map((player) => (
          <span className="avatar-chip" key={player.id}>
            <span aria-hidden="true">{initials(player.displayName)}</span>
            {player.displayName}
          </span>
        ))}
      </div>
    </section>
  );
}

function ResultView({
  projection,
  pending,
  sendCommand,
}: {
  projection: ActorProjection;
  pending: boolean;
  sendCommand: (command: PlayerCommand) => Promise<boolean>;
}) {
  const won = projection.result === "won";

  return (
    <section
      className={`surface result-view ${won ? "result-view--won" : "result-view--lost"}`}
      aria-labelledby="result-title"
    >
      <div className="result-icon" aria-hidden="true">
        {won ? "✓" : "×"}
      </div>
      <p className="eyebrow">{won ? "Level complete" : "Attempt complete"}</p>
      <h2 id="result-title">{won ? "Mission complete" : "Mission unsuccessful"}</h2>
      <p>
        {won
          ? `The crew completed Mission ${projection.mission.number}.`
          : "Regroup with your crew. The room admin can restart the level when everyone is ready."}
      </p>
      <div className="result-tasks">
        {projection.tasks.map((task) => (
          <TaskStatus key={task.id} task={task} />
        ))}
      </div>
      {projection.legalActions.canSetMissionOutcome && !projection.result ? (
        <MissionAdjudication pending={pending} sendCommand={sendCommand} />
      ) : null}
      <p className="field-hint">The room admin controls the next attempt or mission.</p>
    </section>
  );
}

function TrickTable({ projection }: { projection: ActorProjection }) {
  const trick = projection.currentTrick;
  if (!trick?.plays.length) {
    return (
      <div className="empty-table">
        <div className="empty-table__orbit" aria-hidden="true">
          ✦
        </div>
        <p>
          {projection.phase === "assigning-tasks"
            ? "Assign every objective before the first trick."
            : projection.phase === "between-tricks"
              ? "The next leader can play when the crew is ready."
              : "Waiting for the lead card."}
        </p>
        {projection.lastTrick ? <LastTrick trick={projection.lastTrick} players={projection.players} /> : null}
      </div>
    );
  }

  return (
    <div className="trick-table">
      {trick.plays.map((play) => {
        const player = projection.players.find((candidate) => candidate.id === play.playerId);
        const card = projectedCard(play.cardId);
        return (
          <div className="trick-play" key={play.playerId}>
            <span>{player?.displayName ?? "Crewmate"}</span>
            {card ? <GameCard card={card} compact /> : null}
          </div>
        );
      })}
      {Array.from({ length: projection.players.length - trick.plays.length }).map((_, index) => (
        <div className="trick-play trick-play--empty" key={`empty-${index}`} aria-hidden="true">
          <span>Waiting</span>
          <span className="card-placeholder" />
        </div>
      ))}
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
    <details className="last-trick">
      <summary>Last trick{winner ? ` · ${winner.displayName} won` : ""}</summary>
      <div className="mini-card-row">
        {trick.plays.map((play) => {
          const card = projectedCard(play.cardId);
          return card ? <GameCard card={card} compact key={`${play.playerId}-${play.cardId}`} /> : null;
        })}
      </div>
    </details>
  );
}

function CrewList({ projection }: { projection: ActorProjection }) {
  return (
    <ul className="crew-list">
      {projection.players.map((player) => (
        <li
          className={`crew-member ${player.isCurrent ? "crew-member--current" : ""}`}
          key={player.id}
        >
          <span className="avatar" aria-hidden="true">
            {initials(player.displayName)}
          </span>
          <span className="crew-member__name">
            <strong>
              {player.displayName}
              {player.id === projection.self.id ? " (you)" : ""}
            </strong>
            <small>
              {player.cardCount} cards · {player.tricksWon} tricks
            </small>
          </span>
          <span className="crew-member__signals">
            {player.isCaptain ? (
              <span className="mini-badge" title="Captain" aria-label="Captain">
                ★
              </span>
            ) : null}
            {player.communication ? (
              <CommunicationSignal
                card={projectedCard(player.communication.cardId)}
                qualifier={player.communication.qualifier}
              />
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CommunicationSignal({
  card,
  qualifier,
}: {
  card: Card | null;
  qualifier: CommunicationQualifier;
}) {
  if (!card) return null;
  return (
    <span
      className={`signal-dot signal-dot--${card.suit}`}
      title={`${qualifier} ${card.suit} ${card.value}`}
      aria-label={`${qualifier} ${card.suit} ${card.value}`}
    >
      {card.value}
    </span>
  );
}

function TaskList({
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
      <div className="empty-tasks">
        <span aria-hidden="true">◎</span>
        <p>This mission uses a manual special rule instead of task cards.</p>
      </div>
    );
  }

  return (
    <ul className="task-list">
      {projection.tasks.map((task) => {
        const owner = projection.players.find((player) => player.id === task.ownerPlayerId);
        const claimable = projection.legalActions.claimableTaskIds.includes(task.id);
        const canResolve = projection.legalActions.taskOutcomeTaskIds.includes(task.id);
        const taskCard = projectedCard(task.cardId);

        return (
          <li className={`task-item task-item--${task.outcome}`} key={task.id}>
            <div className="task-item__content">
              {taskCard ? <GameCard card={taskCard} compact /> : <span className="task-number">◎</span>}
              <div>
                <strong>{task.title}</strong>
                <small>
                  {owner
                    ? owner.id === projection.self.id
                      ? "Assigned to you"
                      : `Assigned to ${owner.displayName}`
                    : "Unassigned"}
                  {task.order !== null ? ` · Order ${task.order}` : ""}
                  {task.difficulty !== null ? ` · Difficulty ${task.difficulty}` : ""}
                </small>
                {task.footnote ? <small className="task-footnote">{task.footnote}</small> : null}
              </div>
            </div>

            {claimable ? (
              <button
                className="button button--primary button--small"
                type="button"
                disabled={pending}
                onClick={() => void sendCommand({ type: "claim-task", taskId: task.id })}
              >
                Claim
              </button>
            ) : canResolve && task.outcome === "pending" ? (
              <div className="task-outcome-actions" role="group" aria-label={`Resolve ${task.title}`}>
                <button
                  className="outcome-button outcome-button--success"
                  type="button"
                  disabled={pending}
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
                  className="outcome-button outcome-button--failure"
                  type="button"
                  disabled={pending}
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
              </div>
            ) : (
              <TaskStatus task={task} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function TaskStatus({ task }: { task: ProjectedTask }) {
  return (
    <span className={`task-status task-status--${task.outcome}`}>
      <span aria-hidden="true">
        {task.outcome === "success" ? "✓" : task.outcome === "failure" ? "×" : "·"}
      </span>
      <span className="sr-only">{task.outcome}</span>
    </span>
  );
}

function MissionAdjudication({
  pending,
  sendCommand,
}: {
  pending: boolean;
  sendCommand: (command: PlayerCommand) => Promise<boolean>;
}) {
  return (
    <section className="manual-adjudication" aria-labelledby="adjudication-title">
      <div>
        <p className="eyebrow">Crew decision</p>
        <h2 id="adjudication-title">How did the mission go?</h2>
        <p>Use the printed manual to resolve any special rules, then record the result.</p>
      </div>
      <div className="button-row">
        <button
          className="button button--success"
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
          className="button button--danger"
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
      </div>
    </section>
  );
}

function AdjudicationReminder() {
  return (
    <section className="manual-adjudication" aria-labelledby="adjudication-title">
      <div>
        <p className="eyebrow">Crew decision</p>
        <h2 id="adjudication-title">Resolve the remaining objectives</h2>
        <p>
          No complete trick remains. Open Tasks and mark every pending objective
          using the printed mission rules.
        </p>
      </div>
    </section>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}
