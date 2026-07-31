"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clipboard,
  LogOut,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import { CrewMark } from "@/components/ui/CrewMark";
import { Notice } from "@/components/ui/Notice";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

const selectClassName =
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

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
      <main
        className="admin-artwork-bg grid min-h-dvh place-items-center p-4"
        data-testid="admin-artwork"
        id="main-content"
      >
        <Card className="w-full max-w-sm border-white/40 bg-background/95 shadow-2xl">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <CrewMark />
            <Spinner label="Checking admin session" />
            <p className="text-sm text-muted-foreground">Checking admin session…</p>
          </CardContent>
        </Card>
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
    <div
      className="admin-artwork-bg min-h-dvh p-2 sm:p-4 lg:p-6"
      data-testid="admin-artwork"
    >
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-[96rem] flex-col overflow-hidden rounded-2xl border border-white/40 bg-background/95 shadow-2xl sm:min-h-[calc(100dvh-2rem)] lg:min-h-[calc(100dvh-3rem)]">
        <header className="flex min-h-20 items-center gap-3 border-b bg-background px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            aria-label="Crew home"
          >
            <CrewMark />
          </Link>
          <div className="min-w-0 flex-1 border-l pl-3 sm:pl-4">
            <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Administration
            </p>
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
              Room admin
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            type="button"
            aria-label="Sign out"
            onClick={async () => {
              await fetch("/api/admin/session", { method: "DELETE" });
              setSelectedRoom(null);
              setAuthState("locked");
            }}
          >
            <LogOut />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </header>

        <main className="flex min-h-0 flex-1 flex-col gap-4 p-3 sm:p-5" id="main-content">
          <section
            className="flex flex-col gap-4 rounded-xl border bg-muted/25 p-4 lg:flex-row lg:items-start lg:justify-between"
            aria-labelledby="room-count-title"
          >
            <div className="shrink-0">
              <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                Rooms
              </p>
              <h2 className="text-xl font-semibold tracking-tight" id="room-count-title">
                {rooms.length ? `${rooms.length} active` : "No rooms yet"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a room, add its crew, then start the mission.
              </p>
            </div>
            <CreateRoom
              editions={editions}
              disabled={busy}
              onCreate={async (input) => {
                const created = await adminRequest<AdminRoom | { room: AdminRoom }>(
                  "/api/admin/rooms",
                  {
                    method: "POST",
                    body: JSON.stringify(input),
                  },
                );
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
            className={cn(
              "grid min-h-0 flex-1 gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]",
              selectedRoom && "admin-has-room-detail",
            )}
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
              <Card className="min-h-64 justify-center border-dashed shadow-none">
                <CardContent className="mx-auto max-w-md text-center">
                  <div className="mx-auto mb-4 grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
                    <ChevronRight className="size-5" />
                  </div>
                  <h2 className="text-lg font-semibold">Select a room</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose a room to manage its roster, login keys, mission, and current attempt.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
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
    <main
      className="admin-artwork-bg grid min-h-dvh place-items-center p-4 sm:p-6"
      data-testid="admin-artwork"
      id="main-content"
    >
      <Card className="w-full max-w-md border-white/40 bg-background/95 shadow-2xl">
        <CardHeader className="border-b">
          <CrewMark />
          <div className="mt-5">
            <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Administration
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Room admin</h1>
            <CardDescription className="mt-2">
              Create rooms, manage player keys, and control active missions.
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent className="py-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={inputId}>Admin password</FieldLabel>
                <Input
                  id={inputId}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoFocus
                />
              </Field>
              {error ? (
                <Notice tone="error" live>
                  {error}
                </Notice>
              ) : null}
              <Button className="w-full" disabled={busy} type="submit">
                {busy ? (
                  <>
                    <Spinner label="Signing in" /> Signing in…
                  </>
                ) : (
                  "Enter room admin"
                )}
              </Button>
            </FieldGroup>
          </CardContent>
          <CardFooter className="border-t">
            <Button asChild className="w-full" variant="ghost">
              <Link href="/">
                <ArrowLeft />
                Back to player join
              </Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
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
      <Button className="w-full lg:w-auto" type="button" onClick={() => setOpen(true)}>
        <Plus />
        New room
      </Button>
    );
  }

  return (
    <form
      className="grid w-full min-w-0 gap-3 rounded-lg border bg-background p-3 shadow-sm lg:max-w-4xl lg:grid-cols-[minmax(9rem,1fr)_minmax(9rem,1fr)_minmax(12rem,1.35fr)_auto_auto] lg:items-end"
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
      <Field>
        <FieldLabel htmlFor="new-room-name">Room name</FieldLabel>
        <Input
          id="new-room-name"
          type="text"
          minLength={2}
          maxLength={32}
          pattern="[A-Za-z0-9 _-]{2,32}"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          autoFocus
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="new-room-edition">Edition</FieldLabel>
        <select
          id="new-room-edition"
          className={selectClassName}
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
      </Field>
      <Field>
        <FieldLabel htmlFor="new-room-mission">Mission</FieldLabel>
        <select
          id="new-room-mission"
          className={selectClassName}
          value={selectedMissionKey}
          onChange={(event) => setMissionKey(event.target.value)}
        >
          {missions.map((mission) => (
            <option key={mission.key} value={mission.key}>
              {mission.number} · {mission.title}
            </option>
          ))}
        </select>
      </Field>
      <Button disabled={disabled} type="submit">
        Create
      </Button>
      <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
        Cancel
      </Button>
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
      <Card className="min-h-48 justify-center border-dashed shadow-none">
        <CardContent className="text-center">
          <h2 className="font-semibold">No rooms yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create one, then add three to five players before starting the mission.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-none" aria-labelledby="room-list-title">
      <CardHeader className="border-b py-4">
        <h2 className="font-semibold" id="room-list-title">
          All rooms
        </h2>
        <CardDescription>Recently updated first</CardDescription>
      </CardHeader>
      <nav className="max-h-[31rem] overflow-y-auto p-2" aria-label="Room management">
        <ul className="grid gap-1">
          {rooms.map((room) => {
            const selected = selectedRoomId === room.id;
            return (
              <li key={room.id}>
                <button
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-3 text-left outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
                    selected && "border-primary/20 bg-primary/8 hover:bg-primary/10",
                  )}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(room.id)}
                  aria-label={`Manage ${room.name}`}
                  aria-current={selected ? "page" : undefined}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <strong className="truncate text-sm font-semibold">{room.name}</strong>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {room.playerCount}/5
                      </span>
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">
                        {room.editionKey === "deep-sea" ? "Deep Sea" : "Planet Nine"}{" "}
                        {room.missionNumber ?? room.missionKey}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="shrink-0">{formatRelativeTime(room.updatedAt)}</span>
                    </span>
                    <span className="mt-2 block">
                      <PhaseBadge phase={room.phase} />
                    </span>
                  </span>
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      selected && "translate-x-0.5 text-primary",
                    )}
                    aria-hidden="true"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </Card>
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
    <Card className="min-w-0 gap-0 overflow-hidden py-0 shadow-none" aria-labelledby="room-editor-title">
      <CardHeader className="border-b py-5">
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Room details
        </p>
        <h2 className="text-xl font-semibold" id="room-editor-title">
          {room.name}
        </h2>
        <CardDescription>
          {room.editionKey === "deep-sea" ? "Mission Deep Sea" : "The Quest for Planet Nine"} ·
          Mission {room.missionNumber ?? room.missionKey}
        </CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon" type="button" onClick={onClose}>
            <X />
            <span className="sr-only">Close room details</span>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="grid gap-6 py-6">
        <section aria-labelledby="room-mission-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold" id="room-mission-title">
                Mission
              </h3>
              <p className="text-sm text-muted-foreground">
                Change the room name or select the configured mission.
              </p>
            </div>
            <PhaseBadge phase={room.phase} />
          </div>
        <form
          className="grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-2 xl:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(13rem,1.35fr)_auto] xl:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void patchRoom(
              { name, editionKey, missionKey: selectedMissionKey },
              "Room settings updated.",
            );
          }}
        >
          <Field>
            <FieldLabel htmlFor={`room-name-${room.id}`}>Room name</FieldLabel>
            <Input
              id={`room-name-${room.id}`}
              value={name}
              minLength={2}
              maxLength={32}
              pattern="[A-Za-z0-9 _-]{2,32}"
              onChange={(event) => setName(event.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`room-edition-${room.id}`}>Edition</FieldLabel>
            <select
              id={`room-edition-${room.id}`}
              className={selectClassName}
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
          </Field>
          <Field>
            <FieldLabel htmlFor={`room-mission-${room.id}`}>Mission</FieldLabel>
            <select
              id={`room-mission-${room.id}`}
              className={selectClassName}
              value={selectedMissionKey}
              onChange={(event) => setMissionKey(event.target.value)}
            >
              {missionOptions.map((mission) => (
                <option value={mission.key} key={mission.key}>
                  {mission.number} · {mission.title}
                </option>
              ))}
            </select>
          </Field>
          <Button variant="secondary" type="submit" disabled={disabled}>
            Save settings
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {room.restartRequired ? (
            <Button
              variant="secondary"
              type="button"
              disabled={disabled || room.players.length < 3 || room.players.length > 5}
              onClick={() => void roomAction("restart")}
            >
              <RefreshCw />
              Restart level
            </Button>
          ) : room.phase === "setup" ? (
            <Button
              type="button"
              disabled={disabled || room.players.length < 3 || room.players.length > 5}
              onClick={() => void roomAction("start")}
            >
              Start mission
            </Button>
          ) : (
            <Button
              variant="secondary"
              type="button"
              disabled={disabled}
              onClick={() => void roomAction("restart")}
            >
              <RefreshCw />
              Restart level
            </Button>
          )}
          {room.phase === "finished" ? (
            <Button type="button" disabled={disabled} onClick={() => void roomAction("advance")}>
              Advance mission
              <ChevronRight />
            </Button>
          ) : null}
          {(room.phase === "setup" || room.restartRequired) && room.players.length < 3 ? (
            <span className="text-sm text-muted-foreground">Add at least three players to start.</span>
          ) : null}
        </div>
        </section>

        <section className="border-t pt-6" aria-labelledby="room-players-title">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold" id="room-players-title">
                Players
              </h3>
              <p className="text-sm text-muted-foreground">
                Give each player their own six-character login key.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
              {room.players.length}/5 seats
            </span>
          </div>
        <ol className="grid gap-3">
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
            className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed bg-muted/20 p-4 sm:flex-row sm:items-end"
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
            <Field className="flex-1">
              <FieldLabel htmlFor={`new-player-${room.id}`}>New player</FieldLabel>
              <Input
                id={`new-player-${room.id}`}
                value={newPlayerName}
                minLength={1}
                maxLength={32}
                onChange={(event) => setNewPlayerName(event.target.value)}
                placeholder="Display name"
                required
              />
            </Field>
            <Button variant="secondary" disabled={disabled} type="submit">
              <Plus />
              Add player
            </Button>
          </form>
        ) : null}
        </section>

        <section
          className="flex flex-col gap-4 rounded-lg border border-destructive/25 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
          aria-labelledby="danger-zone-title"
        >
          <div>
            <h3 className="font-semibold text-red-800" id="danger-zone-title">
              Danger zone
            </h3>
            <p className="text-sm text-muted-foreground">
              Permanently remove this room, its current attempt, and all player keys.
            </p>
          </div>
          <Button
            className="shrink-0"
            variant="destructive"
            type="button"
            disabled={disabled}
            onClick={async () => {
              if (!window.confirm(`Permanently delete ${room.name}? This cannot be undone.`)) return;
              const result = await request(`/api/admin/rooms/${room.id}`, { method: "DELETE" });
              if (result) await afterDelete();
            }}
          >
            <Trash2 />
            Delete room
          </Button>
        </section>
      </CardContent>
    </Card>
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
    <li className="grid min-w-0 gap-3 rounded-lg border bg-background p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center">
      <span
        className="grid size-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
        aria-label={`Seat ${player.seat}`}
      >
        {player.seat}
      </span>
      <form
        className="flex min-w-0 items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void update({ displayName: name.trim() }, `${name.trim()} updated.`);
        }}
      >
        <Input
          aria-label={`Display name for seat ${player.seat}`}
          value={name}
          maxLength={32}
          onChange={(event) => setName(event.target.value)}
          required
        />
        {name !== player.displayName ? (
          <Button size="sm" type="submit" disabled={disabled}>
            Save
          </Button>
        ) : null}
      </form>

      <label>
        <span className="sr-only">Seat for {player.displayName}</span>
        <select
          className={cn(selectClassName, "w-auto min-w-24")}
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

      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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
        <Trash2 />
        <span className="sr-only">Remove {player.displayName}</span>
      </Button>

      <div className="col-span-full flex min-w-0 flex-wrap items-center gap-2 border-t pt-3">
        <span className="text-xs font-medium text-muted-foreground">Login key</span>
        <code
          className="rounded-md bg-muted px-2.5 py-1.5 font-mono text-sm font-semibold tracking-[0.16em]"
          aria-label={`Login key for ${player.displayName}`}
        >
          {player.loginKey}
        </code>
        <Button
          variant="outline"
          size="sm"
          type="button"
          title={`Copy key for ${player.displayName}`}
          onClick={async () => {
            await navigator.clipboard.writeText(player.loginKey);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1_500);
          }}
        >
          {copied ? <Check /> : <Clipboard />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
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
          <RefreshCw />
          Rotate
        </Button>
      </div>
    </li>
  );
}

function PhaseBadge({ phase }: { phase: AdminRoom["phase"] }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground",
        (phase === "playing-trick" || phase === "between-tricks") &&
          "bg-primary/10 text-primary",
        phase === "finished" && "bg-emerald-100 text-emerald-800",
        phase === "restart-required" && "bg-destructive/10 text-destructive",
      )}
    >
      {formatPhase(phase)}
    </span>
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
