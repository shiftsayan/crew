"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useId, useMemo, useState } from "react";

import { CrewMark } from "@/components/ui/CrewMark";
import { Notice } from "@/components/ui/Notice";
import { Spinner } from "@/components/ui/Spinner";

import {
  adminErrorMessage,
  type AdminApiError,
  type AdminBootstrap,
  type AdminPlayer,
  type AdminRoom,
  type AdminRoomDetail,
  type EditionOption,
} from "./types";

type AuthState = "checking" | "locked" | "authenticated";

export function AdminApp() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [editions, setEditions] = useState<EditionOption[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<AdminRoomDetail | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadRooms = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/rooms", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        setAuthState("locked");
        setRooms([]);
        return;
      }

      const body = (await response.json().catch(() => ({}))) as
        | AdminBootstrap
        | AdminRoom[]
        | AdminApiError;
      if (!response.ok) {
        throw new Error(adminErrorMessage(body as AdminApiError, "Could not load rooms."));
      }

      if (Array.isArray(body)) {
        setRooms(body);
      } else {
        const bootstrap = body as AdminBootstrap;
        setRooms(bootstrap.rooms ?? []);
        if (bootstrap.editions?.length) setEditions(bootstrap.editions);
      }
      setAuthState("authenticated");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load rooms.");
      setAuthState((current) => (current === "checking" ? "locked" : current));
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadRooms(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadRooms]);

  async function loadRoom(roomId: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/rooms/${roomId}`, { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as
        | AdminRoomDetail
        | { room?: AdminRoomDetail }
        | AdminApiError;
      if (!response.ok) {
        throw new Error(adminErrorMessage(body as AdminApiError, "Could not load this room."));
      }
      const room = "room" in body && body.room ? body.room : (body as AdminRoomDetail);
      setSelectedRoom(room);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load this room.");
    } finally {
      setBusy(false);
    }
  }

  async function adminRequest<T>(path: string, init: RequestInit) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(path, {
        ...init,
        headers: {
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
      });
      const body = (await response.json().catch(() => ({}))) as T & AdminApiError;
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) setAuthState("locked");
        throw new Error(adminErrorMessage(body, "The admin action could not be completed."));
      }
      return body as T;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The admin action could not be completed.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function refreshAfterMutation(roomId?: string) {
    await loadRooms();
    if (roomId) await loadRoom(roomId);
  }

  if (authState === "checking") {
    return (
      <main className="centered-state admin-loading console-frame" id="main-content">
        <CrewMark />
        <Spinner label="Checking admin session" />
        <p>Checking admin session…</p>
      </main>
    );
  }

  if (authState === "locked") {
    return (
      <AdminLogin
        error={error}
        onAuthenticated={() => {
          setAuthState("checking");
          setError("");
          void loadRooms();
        }}
      />
    );
  }

  return (
    <div className="admin-page console-frame">
      <header className="admin-header console-header">
        <Link href="/" className="brand-link" aria-label="Crew home">
          <CrewMark />
        </Link>
        <div className="admin-header__title">
          <p className="eyebrow">Administration</p>
          <h1>Room admin</h1>
        </div>
        <button
          className="button button--ghost button--small"
          type="button"
          onClick={async () => {
            await fetch("/api/admin/session", { method: "DELETE" });
            setSelectedRoom(null);
            setAuthState("locked");
          }}
        >
          Sign out
        </button>
      </header>

      <main className="admin-main" id="main-content">
        <section className="admin-toolbar console-toolbar" aria-labelledby="room-count-title">
          <div>
            <p className="eyebrow">Room list</p>
            <h2 id="room-count-title">
              {rooms.length ? `${rooms.length} active` : "No rooms yet"}
            </h2>
          </div>
          <CreateRoom
            editions={editions}
            disabled={busy}
            onCreate={async (input) => {
              const created = await adminRequest<AdminRoom | { room: AdminRoom }>("/api/admin/rooms", {
                method: "POST",
                body: JSON.stringify(input),
              });
              if (!created) return false;
              const room = "room" in created ? created.room : created;
              setMessage(`${room.name} is ready for players.`);
              await refreshAfterMutation(room.id);
              return true;
            }}
          />
        </section>

        {error ? (
          <Notice tone="error" live>
            {error}
          </Notice>
        ) : null}
        {message ? (
          <Notice tone="success" live>
            {message}
          </Notice>
        ) : null}

        <div
          className={`admin-workspace console-body ${
            selectedRoom ? "admin-workspace--detail" : ""
          }`}
        >
          <RoomList
            rooms={rooms}
            selectedRoomId={selectedRoom?.id}
            disabled={busy}
            onSelect={(roomId) => void loadRoom(roomId)}
          />

          {selectedRoom ? (
            <RoomEditor
              key={`${selectedRoom.id}:${selectedRoom.editionKey}:${selectedRoom.missionKey}`}
              room={selectedRoom}
              editions={editions}
              disabled={busy}
              onClose={() => setSelectedRoom(null)}
              request={adminRequest}
              afterMutation={async (successMessage) => {
                setMessage(successMessage);
                await refreshAfterMutation(selectedRoom.id);
              }}
              afterDelete={async () => {
                setSelectedRoom(null);
                setMessage("Room deleted.");
                await loadRooms();
              }}
            />
          ) : (
            <section className="surface admin-empty console-panel" aria-label="Room details">
              <h2>Select a room</h2>
              <p>Select a room to manage its roster, keys, mission, and current attempt.</p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function AdminLogin({
  error: initialError,
  onAuthenticated,
}: {
  error: string;
  onAuthenticated: () => void;
}) {
  const inputId = useId();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = (await response.json().catch(() => ({}))) as AdminApiError;
      if (!response.ok) throw new Error(adminErrorMessage(body, "Incorrect password."));
      setPassword("");
      onAuthenticated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-login-page console-frame" id="main-content">
      <section className="admin-login-intro console-header">
        <CrewMark />
        <p className="eyebrow">Administration</p>
        <h1>Room admin</h1>
        <p>Use the shared admin password to create rooms and manage players.</p>
      </section>
      <form className="join-card admin-login-card console-panel" onSubmit={submit}>
        <label htmlFor={inputId}>Admin password</label>
        <input
          id={inputId}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoFocus
        />
        {error ? (
          <Notice tone="error" live>
            {error}
          </Notice>
        ) : null}
        <button className="button button--primary button--wide" disabled={busy} type="submit">
          {busy ? (
            <>
              <Spinner label="Signing in" /> Signing in…
            </>
          ) : (
            "Enter mission control"
          )}
        </button>
        <Link className="text-link" href="/">
          Back to player join
        </Link>
      </form>
    </main>
  );
}

function CreateRoom({
  editions,
  disabled,
  onCreate,
}: {
  editions: EditionOption[];
  disabled: boolean;
  onCreate: (input: {
    name: string;
    editionKey: string;
    missionKey: string;
  }) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [editionKey, setEditionKey] = useState(editions[0]?.key ?? "planet-nine");
  const missions = editions.find((edition) => edition.key === editionKey)?.missions ?? [];
  const [missionKey, setMissionKey] = useState(missions[0]?.key ?? "planet-nine:1");
  const selectedMissionKey = missions.some((mission) => mission.key === missionKey)
    ? missionKey
    : (missions[0]?.key ?? "");

  if (!open) {
    return (
      <button className="button button--primary" type="button" onClick={() => setOpen(true)}>
        + New room
      </button>
    );
  }

  return (
    <form
      className="create-room-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onCreate({
          name: name.trim(),
          editionKey,
          missionKey: selectedMissionKey,
        }).then((created) => {
          if (created) {
            setName("");
            setOpen(false);
          }
        });
      }}
    >
      <label>
        <span>Room name</span>
        <input
          type="text"
          minLength={2}
          maxLength={32}
          pattern="[A-Za-z0-9 _-]{2,32}"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          autoFocus
        />
      </label>
      <label>
        <span>Edition</span>
        <select
          value={editionKey}
          onChange={(event) => {
            const nextEditionKey = event.target.value as EditionOption["key"];
            const nextMissions =
              editions.find((edition) => edition.key === nextEditionKey)?.missions ?? [];
            setEditionKey(nextEditionKey);
            setMissionKey(nextMissions[0]?.key ?? "");
          }}
        >
          {editions.map((edition) => (
            <option key={edition.key} value={edition.key}>
              {edition.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Mission</span>
        <select value={selectedMissionKey} onChange={(event) => setMissionKey(event.target.value)}>
          {missions.map((mission) => (
            <option key={mission.key} value={mission.key}>
              {mission.number} · {mission.title}
            </option>
          ))}
        </select>
      </label>
      <button className="button button--primary button--small" disabled={disabled} type="submit">
        Create
      </button>
      <button
        className="button button--quiet button--small"
        type="button"
        onClick={() => setOpen(false)}
      >
        Cancel
      </button>
    </form>
  );
}

function RoomList({
  rooms,
  selectedRoomId,
  disabled,
  onSelect,
}: {
  rooms: AdminRoom[];
  selectedRoomId?: string;
  disabled: boolean;
  onSelect: (roomId: string) => void;
}) {
  if (!rooms.length) {
    return (
      <section className="surface room-list room-list--empty console-panel">
        <h2>No rooms yet</h2>
        <p>Create one, then add three to five players before starting the mission.</p>
      </section>
    );
  }

  return (
    <section className="surface room-list console-panel" aria-labelledby="room-list-title">
      <h2 className="sr-only" id="room-list-title">
        Rooms
      </h2>
      <div className="room-table-wrap">
        <table className="room-table">
          <thead>
            <tr>
              <th scope="col">Room</th>
              <th scope="col">Mission</th>
              <th scope="col">Phase</th>
              <th scope="col">Crew</th>
              <th scope="col" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id} className={selectedRoomId === room.id ? "is-selected" : ""}>
                <th scope="row">
                  <strong>{room.name}</strong>
                  <small>{formatRelativeTime(room.updatedAt)}</small>
                </th>
                <td>
                  {room.editionKey === "deep-sea" ? "Deep Sea" : "Planet Nine"}{" "}
                  {room.missionNumber ?? room.missionKey}
                </td>
                <td>
                  <span className={`phase-pill phase-pill--${room.phase}`}>{formatPhase(room.phase)}</span>
                </td>
                <td>{room.playerCount}/5</td>
                <td>
                  <button
                    className="button button--quiet button--small"
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(room.id)}
                    aria-label={`Manage ${room.name}`}
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type AdminRequest = <T>(path: string, init: RequestInit) => Promise<T | null>;

function RoomEditor({
  room,
  editions,
  disabled,
  onClose,
  request,
  afterMutation,
  afterDelete,
}: {
  room: AdminRoomDetail;
  editions: EditionOption[];
  disabled: boolean;
  onClose: () => void;
  request: AdminRequest;
  afterMutation: (message: string) => Promise<void>;
  afterDelete: () => Promise<void>;
}) {
  const [name, setName] = useState(room.name);
  const [editionKey, setEditionKey] = useState(room.editionKey);
  const [missionKey, setMissionKey] = useState(room.missionKey);
  const [newPlayerName, setNewPlayerName] = useState("");
  const missionOptions = useMemo(
    () => editions.find((edition) => edition.key === editionKey)?.missions ?? [],
    [editionKey, editions],
  );
  const activeAttempt = room.phase !== "setup" && room.phase !== "finished";
  const selectedMissionKey = missionOptions.some((mission) => mission.key === missionKey)
    ? missionKey
    : (missionOptions[0]?.key ?? "");

  async function patchRoom(input: Record<string, unknown>, successMessage: string) {
    const requiresReset =
      activeAttempt &&
      ((typeof input.editionKey === "string" && input.editionKey !== room.editionKey) ||
        (typeof input.missionKey === "string" && input.missionKey !== room.missionKey));
    if (
      requiresReset &&
      !window.confirm("This change will restart the current attempt and return the room to setup. Continue?")
    ) {
      return;
    }
    const result = await request(`/api/admin/rooms/${room.id}`, {
      method: "PATCH",
      body: JSON.stringify({ ...input, confirmReset: requiresReset }),
    });
    if (result) await afterMutation(successMessage);
  }

  async function roomAction(type: "start" | "restart" | "advance") {
    if (
      (type === "restart" || type === "advance") &&
      !window.confirm(
        type === "restart"
          ? "Restart this level with a new deal and task draw?"
          : "Advance this room to the next configured mission?",
      )
    ) {
      return;
    }
    const result = await request(`/api/admin/rooms/${room.id}/actions`, {
      method: "POST",
      body: JSON.stringify({ type }),
    });
    if (result) {
      await afterMutation(
        type === "start" ? "Mission started." : type === "restart" ? "Level restarted." : "Room advanced.",
      );
    }
  }

  return (
    <section className="surface room-editor console-panel" aria-labelledby="room-editor-title">
      <div className="room-editor__header console-panel__header">
        <div>
          <p className="eyebrow">Room details</p>
          <h2 id="room-editor-title">{room.name}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose}>
          <span aria-hidden="true">×</span>
          <span className="sr-only">Close room details</span>
        </button>
      </div>

      <div className="admin-section console-section">
        <div className="admin-section__heading">
          <h3>Mission</h3>
          <span className={`phase-pill phase-pill--${room.phase}`}>{formatPhase(room.phase)}</span>
        </div>
        <form
          className="room-settings-form"
          onSubmit={(event) => {
            event.preventDefault();
            void patchRoom(
              { name, editionKey, missionKey: selectedMissionKey },
              "Room settings updated.",
            );
          }}
        >
          <label>
            <span>Room name</span>
            <input
              value={name}
              minLength={2}
              maxLength={32}
              pattern="[A-Za-z0-9 _-]{2,32}"
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label>
            <span>Edition</span>
            <select
              value={editionKey}
              onChange={(event) => {
                const nextEditionKey = event.target.value as EditionOption["key"];
                const nextMissions =
                  editions.find((edition) => edition.key === nextEditionKey)?.missions ?? [];
                setEditionKey(nextEditionKey);
                setMissionKey(nextMissions[0]?.key ?? "");
              }}
            >
              {editions.map((edition) => (
                <option key={edition.key} value={edition.key}>
                  {edition.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Mission</span>
            <select value={selectedMissionKey} onChange={(event) => setMissionKey(event.target.value)}>
              {missionOptions.map((mission) => (
                <option value={mission.key} key={mission.key}>
                  {mission.number} · {mission.title}
                </option>
              ))}
            </select>
          </label>
          <button className="button button--secondary button--small" type="submit" disabled={disabled}>
            Save settings
          </button>
        </form>

        <div className="room-action-row">
          {room.restartRequired ? (
            <button
              className="button button--secondary"
              type="button"
              disabled={disabled || room.players.length < 3 || room.players.length > 5}
              onClick={() => void roomAction("restart")}
            >
              Restart level
            </button>
          ) : room.phase === "setup" ? (
            <button
              className="button button--primary"
              type="button"
              disabled={disabled || room.players.length < 3 || room.players.length > 5}
              onClick={() => void roomAction("start")}
            >
              Start mission
            </button>
          ) : (
            <button
              className="button button--secondary"
              type="button"
              disabled={disabled}
              onClick={() => void roomAction("restart")}
            >
              Restart level
            </button>
          )}
          {room.phase === "finished" ? (
            <button
              className="button button--primary"
              type="button"
              disabled={disabled}
              onClick={() => void roomAction("advance")}
            >
              Advance mission
            </button>
          ) : null}
          {(room.phase === "setup" || room.restartRequired) && room.players.length < 3 ? (
            <span className="field-hint">Add at least three players to start.</span>
          ) : null}
        </div>
      </div>

      <div className="admin-section console-section">
        <div className="admin-section__heading">
          <h3>Players</h3>
          <span>{room.players.length}/5 seats</span>
        </div>
        <ol className="admin-player-list">
          {room.players
            .slice()
            .sort((a, b) => a.seat - b.seat)
            .map((player) => (
              <AdminPlayerRow
                key={player.id}
                player={player}
                roomId={room.id}
                playerCount={room.players.length}
                disabled={disabled}
                activeAttempt={activeAttempt}
                request={request}
                afterMutation={afterMutation}
              />
            ))}
        </ol>

        {room.players.length < 5 ? (
          <form
            className="add-player-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const requiresReset = activeAttempt;
              if (
                requiresReset &&
                !window.confirm("Adding a player will restart this attempt. Continue?")
              ) {
                return;
              }
              const result = await request(`/api/admin/rooms/${room.id}/players`, {
                method: "POST",
                body: JSON.stringify({
                  displayName: newPlayerName.trim(),
                  confirmReset: requiresReset,
                }),
              });
              if (result) {
                setNewPlayerName("");
                await afterMutation("Player added. Copy their key before they join.");
              }
            }}
          >
            <label>
              <span>New player</span>
              <input
                value={newPlayerName}
                minLength={1}
                maxLength={32}
                onChange={(event) => setNewPlayerName(event.target.value)}
                placeholder="Display name"
                required
              />
            </label>
            <button className="button button--secondary button--small" disabled={disabled} type="submit">
              Add player
            </button>
          </form>
        ) : null}
      </div>

      <div className="admin-section admin-danger-zone console-section">
        <h3>Danger zone</h3>
        <p>Deleting a room permanently removes its current attempt and player keys.</p>
        <button
          className="button button--danger button--small"
          type="button"
          disabled={disabled}
          onClick={async () => {
            if (!window.confirm(`Permanently delete ${room.name}? This cannot be undone.`)) return;
            const result = await request(`/api/admin/rooms/${room.id}`, { method: "DELETE" });
            if (result) await afterDelete();
          }}
        >
          Delete room
        </button>
      </div>
    </section>
  );
}

function AdminPlayerRow({
  player,
  roomId,
  playerCount,
  disabled,
  activeAttempt,
  request,
  afterMutation,
}: {
  player: AdminPlayer;
  roomId: string;
  playerCount: number;
  disabled: boolean;
  activeAttempt: boolean;
  request: AdminRequest;
  afterMutation: (message: string) => Promise<void>;
}) {
  const [name, setName] = useState(player.displayName);
  const [copied, setCopied] = useState(false);

  async function update(input: Record<string, unknown>, successMessage: string) {
    if (
      activeAttempt &&
      !window.confirm("Changing the roster will restart this attempt. Continue?")
    ) {
      return;
    }
    const result = await request(`/api/admin/rooms/${roomId}/players/${player.id}`, {
      method: "PATCH",
      body: JSON.stringify({ ...input, confirmReset: activeAttempt }),
    });
    if (result) await afterMutation(successMessage);
  }

  return (
    <li className="admin-player-row">
      <span className="seat-number" aria-label={`Seat ${player.seat}`}>
        {player.seat}
      </span>
      <form
        className="player-name-form"
        onSubmit={(event) => {
          event.preventDefault();
          void update({ displayName: name.trim() }, `${name.trim()} updated.`);
        }}
      >
        <input
          aria-label={`Display name for seat ${player.seat}`}
          value={name}
          maxLength={32}
          onChange={(event) => setName(event.target.value)}
          required
        />
        {name !== player.displayName ? (
          <button className="text-button" type="submit" disabled={disabled}>
            Save
          </button>
        ) : null}
      </form>

      <div className="player-key">
        <code aria-label={`Login key for ${player.displayName}`}>{player.loginKey}</code>
        <button
          className="icon-button icon-button--light"
          type="button"
          title={`Copy key for ${player.displayName}`}
          onClick={async () => {
            await navigator.clipboard.writeText(player.loginKey);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1_500);
          }}
        >
          <span aria-hidden="true">{copied ? "✓" : "⧉"}</span>
          <span className="sr-only">{copied ? "Copied" : "Copy key"}</span>
        </button>
        <button
          className="text-button"
          type="button"
          disabled={disabled}
          onClick={async () => {
            if (!window.confirm(`Rotate ${player.displayName}'s key? Their old key will stop working.`)) {
              return;
            }
            const result = await request(
              `/api/admin/rooms/${roomId}/players/${player.id}/rotate-key`,
              { method: "POST" },
            );
            if (result) await afterMutation(`Key rotated for ${player.displayName}.`);
          }}
        >
          Rotate
        </button>
      </div>

      <label className="seat-select">
        <span className="sr-only">Seat for {player.displayName}</span>
        <select
          value={player.seat}
          disabled={disabled}
          onChange={(event) =>
            void update({ seat: Number(event.target.value) }, `${player.displayName} reseated.`)
          }
        >
          {Array.from({ length: playerCount }).map((_, index) => (
            <option key={index + 1} value={index + 1}>
              Seat {index + 1}
            </option>
          ))}
        </select>
      </label>

      <button
        className="icon-button icon-button--danger"
        type="button"
        disabled={disabled}
        onClick={async () => {
          const prompt = activeAttempt
            ? `Remove ${player.displayName}? This will discard the current attempt and return the room to setup.`
            : `Remove ${player.displayName} from this room?`;
          if (!window.confirm(prompt)) return;
          const result = await request(`/api/admin/rooms/${roomId}/players/${player.id}`, {
            method: "DELETE",
            body: JSON.stringify({ confirmReset: activeAttempt }),
          });
          if (result) await afterMutation(`${player.displayName} removed.`);
        }}
      >
        <span aria-hidden="true">×</span>
        <span className="sr-only">Remove {player.displayName}</span>
      </button>
    </li>
  );
}

function formatPhase(phase: AdminRoom["phase"]) {
  return phase.replaceAll("-", " ");
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
