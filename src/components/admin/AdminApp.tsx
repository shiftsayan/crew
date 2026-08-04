"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Shuffle,
  Trash2,
} from "lucide-react";

import { CrewEdition } from "@/components/ui/CrewEdition";
import { CrewLogo } from "@/components/ui/CrewLogo";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Passport } from "@/components/ui/Passport";
import { PLAYER_TAGS, type PlayerTag } from "@/game/player-tags";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
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

function AdminTopbar({ room }: { room: AdminRoomDetail | null }) {
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);

  if (!room) return null;

  const roomId = room.id;
  const roomName = room.name;
  const copied = copiedRoomId === roomId;

  async function copyRoomName() {
    try {
      await navigator.clipboard.writeText(roomName);
      setCopiedRoomId(roomId);
      window.setTimeout(() => {
        setCopiedRoomId((current) => (current === roomId ? null : current));
      }, 1_600);
    } catch {
      setCopiedRoomId(null);
    }
  }

  return (
    <header className="shrink-0 pb-4">
      <div className="mx-auto w-full max-w-6xl px-1">
        <div className="flex min-w-0 items-center gap-1">
          <h1
            className="flex min-w-0 items-baseline gap-2 text-[1.3rem] leading-none font-normal tracking-tight"
            data-slot="admin-room-title"
          >
            <span className="select-none text-muted-foreground">Rooms</span>
            <span className="select-none text-muted-foreground" aria-hidden="true">
              /
            </span>
            <span
              className="min-w-0 select-text truncate font-mono"
              data-slot="admin-room-title-name"
            >
              {room.name}
            </span>
          </h1>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label={copied ? `${room.name} copied` : `Copy ${room.name}`}
            title={copied ? "Room name copied" : "Copy room name"}
            onClick={() => void copyRoomName()}
          >
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>
      </div>
    </header>
  );
}

export function AdminApp() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [editions, setEditions] = useState<EditionOption[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<AdminRoomDetail | null>(null);
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
    }
  }

  async function adminRequest<T>(path: string, init: RequestInit) {
    setBusy(true);
    setError("");
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
      const message =
        caught instanceof Error
          ? caught.message
          : "The admin action could not be completed.";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function refreshAfterMutation(roomId?: string) {
    await loadRooms();
    if (roomId) await loadRoom(roomId);
  }

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setSelectedRoom(null);
    setAuthState("locked");
  }

  async function createRoom(input: {
    name: string;
    editionKey: string;
    missionKey: string;
  }) {
    const created = await adminRequest<AdminRoom | { room: AdminRoom }>(
      "/api/admin/rooms",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );
    if (!created) return false;
    const room = "room" in created ? created.room : created;
    await refreshAfterMutation(room.id);
    toast.success("Room created");
    return true;
  }

  if (authState === "checking") {
    return (
      <main
        className="grid h-dvh min-h-0 w-full place-items-center overflow-hidden"
        id="main-content"
        aria-busy="true"
      >
        <Spinner className="text-white" label="Checking admin session" />
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
    <div className="mx-auto h-dvh min-h-0 w-full max-w-8xl overflow-hidden p-8">
      <SidebarProvider
        className="h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-admin-border bg-transparent text-admin-ink [--sidebar-width:18rem] [--sidebar:var(--color-admin-surface)] [--sidebar-foreground:var(--color-admin-ink)] [--sidebar-accent:var(--color-admin-accent)] [--sidebar-accent-foreground:var(--color-admin-ink)] [--sidebar-border:var(--color-admin-border)] md:flex-row"
      >
        <AdminSidebar
          rooms={rooms}
          editions={editions}
          selectedRoomId={selectedRoom?.id}
          disabled={busy}
          onCreate={createRoom}
          onSelect={(roomId) => void loadRoom(roomId)}
          onSignOut={() => void signOut()}
        />

        <SidebarInset
          className="min-h-0 min-w-0 w-auto border-t border-admin-border bg-admin-surface px-8 py-6 md:border-t-0 md:border-l"
          id="main-content"
        >
          <AdminTopbar room={selectedRoom} />

          <div
            className="mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-y-auto overscroll-contain px-1 pt-6 pb-1"
            data-testid="admin-detail-scroll"
          >
            {selectedRoom ? (
              <RoomEditor
                key={`${selectedRoom.id}:${selectedRoom.updatedAt}`}
                room={selectedRoom}
                editions={editions}
                disabled={busy}
                request={adminRequest}
                afterMutation={async () => {
                  await refreshAfterMutation(selectedRoom.id);
                }}
                afterDelete={async () => {
                  setSelectedRoom(null);
                  await loadRooms();
                }}
              />
            ) : null}
          </div>
        </SidebarInset>
      </SidebarProvider>
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
      className="grid h-dvh min-h-0 w-full place-items-center overflow-hidden p-4 md:p-6"
      id="main-content"
    >
      <Passport
        role="region"
        aria-label="Admin"
        title="Hello commander"
        subtitle="Enter the admin password."
      >
        <form onSubmit={submit}>
          <FieldGroup className="gap-5">
            <Field className="gap-2">
              <FieldLabel htmlFor={inputId}>Admin Password</FieldLabel>
              <Input
                className="bg-white"
                id={inputId}
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password..."
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoFocus
              />
            </Field>
            {error ? (
              <FieldError aria-live="polite">
                {error}
              </FieldError>
            ) : null}
            <Button disabled={busy} type="submit">
              {busy ? <Spinner label="Entering admin" /> : <LogIn />}
              {busy ? "Entering…" : "Enter"}
            </Button>
          </FieldGroup>
        </form>
      </Passport>
    </main>
  );
}

function AdminSidebar({
  rooms,
  editions,
  selectedRoomId,
  disabled,
  onCreate,
  onSelect,
  onSignOut,
}: {
  rooms: AdminRoom[];
  editions: EditionOption[];
  selectedRoomId?: string;
  disabled: boolean;
  onCreate: (input: {
    name: string;
    editionKey: string;
    missionKey: string;
  }) => Promise<boolean>;
  onSelect: (roomId: string) => void;
  onSignOut: () => void;
}) {
  return (
    <Sidebar
      className="h-auto max-h-[45dvh] w-full shrink-0 bg-sidebar/70 py-6 text-foreground backdrop-blur-lg md:h-full md:max-h-none md:w-(--sidebar-width)"
      collapsible="none"
    >
      <SidebarHeader className="px-4 py-0">
        <div className="flex h-9 w-fit items-center px-2">
          <CrewLogo text="Admin" alt="Crew administration" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-3 pt-6 pb-2">
          <SidebarGroupLabel className="px-3 text-base">Rooms</SidebarGroupLabel>
          <SidebarGroupContent className="pt-1">
            <RoomList
              rooms={rooms}
              selectedRoomId={selectedRoomId}
              disabled={disabled}
              onSelect={onSelect}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-4 py-0">
        <div
          className="flex items-center justify-between gap-2 px-2"
          data-testid="admin-sidebar-actions"
        >
          <Button variant="secondary" type="button" onClick={onSignOut}>
            <LogOut />
            Sign out
          </Button>
          <CreateRoom
            editions={editions}
            disabled={disabled}
            onCreate={onCreate}
          />
        </div>
      </SidebarFooter>
    </Sidebar>
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" disabled={disabled}>
          <Plus />
          New room
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a room</DialogTitle>
          <DialogDescription>
            Choose the edition and starting mission. You can add players next.
          </DialogDescription>
        </DialogHeader>
        <form
          aria-label="Create room"
          className="grid gap-4"
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
              className="font-mono"
              id="new-room-name"
              type="text"
              minLength={2}
              maxLength={32}
              pattern="[A-Za-z0-9_-]{2,32}"
              value={name}
              onChange={(event) =>
                setName(event.target.value.replace(/[^A-Za-z0-9_-]/g, ""))
              }
              required
              autoFocus
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-room-edition">Edition</FieldLabel>
            <Select
              value={editionKey}
              onValueChange={(value) => {
                const nextEditionKey = value as EditionOption["key"];
                const nextMissions =
                  editions.find((edition) => edition.key === nextEditionKey)
                    ?.missions ?? [];
                setEditionKey(nextEditionKey);
                setMissionKey(nextMissions[0]?.key ?? "");
              }}
            >
              <SelectTrigger className="w-full" id="new-room-edition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {editions.map((edition) => (
                  <SelectItem key={edition.key} value={edition.key}>
                    <CrewEdition editionKey={edition.key} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="new-room-mission">Mission</FieldLabel>
            <Select value={selectedMissionKey} onValueChange={setMissionKey}>
              <SelectTrigger className="w-full" id="new-room-mission">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {missions.map((mission) => (
                  <SelectItem key={mission.key} value={mission.key}>
                    {mission.number} · {mission.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button disabled={disabled} type="submit">
              Create room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
      <div className="rounded-lg bg-sidebar-accent/70 px-4 py-3 text-sm">
        <p className="font-medium">No rooms yet</p>
        <p className="mt-1 text-xs text-sidebar-foreground/80">
          Create one, then add three to five players.
        </p>
      </div>
    );
  }

  return (
    <nav aria-label="Room management">
      <SidebarMenu>
        {rooms.map((room) => {
          const selected = selectedRoomId === room.id;
          return (
            <SidebarMenuItem key={room.id}>
              <SidebarMenuButton
                className="h-auto cursor-pointer items-center px-3 py-2 hover:bg-black/7 active:bg-black/7 data-[active=true]:bg-black/7 data-[active=true]:font-normal data-[active=true]:hover:bg-black/7"
                disabled={disabled}
                isActive={selected}
                size="lg"
                type="button"
                onClick={() => onSelect(room.id)}
                aria-label={`Manage ${room.name}`}
                aria-current={selected ? "page" : undefined}
              >
                <div className="min-w-0 flex-1">
                  <span
                    className="block min-w-0 truncate font-mono text-sm font-normal"
                    data-slot="admin-room-name"
                  >
                    {room.name}
                  </span>
                  <span className="mt-1 block text-xs text-admin-muted">
                    Last active {formatRelativeTime(room.updatedAt)}
                  </span>
                </div>
                <ChevronRight
                  className="shrink-0 text-admin-muted"
                  data-slot="admin-room-chevron"
                  aria-hidden="true"
                />
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </nav>
  );
}

type AdminRequest = <T>(path: string, init: RequestInit) => Promise<T | null>;

type AdminPlayerDraft = {
  id?: string;
  displayName: string;
  tags: PlayerTag[];
  seat: number;
};

function RoomEditor({
  room,
  editions,
  disabled,
  request,
  afterMutation,
  afterDelete,
}: {
  room: AdminRoomDetail;
  editions: EditionOption[];
  disabled: boolean;
  request: AdminRequest;
  afterMutation: () => Promise<void>;
  afterDelete: () => Promise<void>;
}) {
  const [editionKey, setEditionKey] = useState(room.editionKey);
  const [missionKey, setMissionKey] = useState(room.missionKey);
  const [attemptNumber, setAttemptNumber] = useState(
    String(room.attemptNumber ?? 1),
  );
  const [playerDrafts, setPlayerDrafts] = useState<AdminPlayerDraft[]>(() =>
    playerDraftsForRoom(room),
  );
  const missionOptions = useMemo(
    () => editions.find((edition) => edition.key === editionKey)?.missions ?? [],
    [editionKey, editions],
  );
  const activeAttempt = room.phase !== "preflight" && room.phase !== "finished";
  const selectedMissionKey = missionOptions.some(
    (mission) => mission.key === missionKey,
  )
    ? missionKey
    : (missionOptions[0]?.key ?? "");
  const selectedMissionIndex = missionOptions.findIndex(
    (mission) => mission.key === selectedMissionKey,
  );
  const filledPlayerCount = playerDrafts.filter(
    (player) => player.displayName.trim().length > 0,
  ).length;
  const parsedAttemptNumber = Number(attemptNumber);
  const attemptNumberIsValid =
    Number.isInteger(parsedAttemptNumber) && parsedAttemptNumber >= 1;

  async function roomAction(type: "return-to-preflight" | "advance") {
    if (
      !window.confirm(
        type === "return-to-preflight"
          ? "Are you sure you want to reset the room?"
          : "Advance this room to the next configured mission and return it to preflight?",
      )
    ) {
      return;
    }
    const result = await request(`/api/admin/rooms/${room.id}/actions`, {
      method: "POST",
      body: JSON.stringify({ type }),
    });
    if (result) {
      await afterMutation();
      toast.success(
        type === "return-to-preflight" ? "Room returned to preflight" : "Mission advanced",
      );
    }
  }

  function updatePlayerDraft(
    seat: number,
    patch: Partial<Omit<AdminPlayerDraft, "seat">>,
  ) {
    setPlayerDrafts((current) =>
      current.map((player) =>
        player.seat === seat ? { ...player, ...patch } : player,
      ),
    );
  }

  function stepAttemptNumber(offset: -1 | 1) {
    setAttemptNumber((current) => {
      const parsed = Number(current);
      if (!Number.isInteger(parsed) || parsed < 1) return "1";
      return String(Math.max(1, parsed + offset));
    });
  }

  function shufflePlayers() {
    setPlayerDrafts((current) => {
      const filled = current.filter(
        (player) => player.displayName.trim().length > 0,
      );
      for (let index = filled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [filled[index], filled[swapIndex]] = [filled[swapIndex], filled[index]];
      }

      if (
        filled.length > 1 &&
        filled.every((player, index) => player === current[index])
      ) {
        filled.push(filled.shift()!);
      }

      return Array.from({ length: 5 }, (_, index) => {
        const player = filled[index];
        const seat = index + 1;
        return player
          ? { ...player, seat }
          : emptyPlayerDraft(seat);
      });
    });
    toast.success("Players shuffled");
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const missionChanged =
      editionKey !== room.editionKey || selectedMissionKey !== room.missionKey;
    const nextAttemptNumber = Number(attemptNumber);
    const attemptChanged = nextAttemptNumber !== (room.attemptNumber ?? 1);
    const rosterChanged = hasDraftRosterChanged(room.players, playerDrafts);
    const requiresReset =
      activeAttempt &&
      (missionChanged ||
        rosterChanged ||
        (attemptChanged && room.restartRequired));
    if (
      requiresReset &&
      !window.confirm(
        "These settings will discard the current attempt and return the room to preflight. Continue?",
      )
    ) {
      return;
    }

    const result = await request(`/api/admin/rooms/${room.id}`, {
      method: "PUT",
      body: JSON.stringify({
        editionKey,
        missionKey: selectedMissionKey,
        ...(attemptChanged ? { attemptNumber: nextAttemptNumber } : {}),
        confirmReset: requiresReset,
        players: playerDrafts.map((player) => ({
          ...(player.id ? { id: player.id } : {}),
          displayName: player.displayName.trim(),
          tags: player.displayName.trim() ? player.tags : [],
          seat: player.seat,
        })),
      }),
    });
    if (result) {
      await afterMutation();
      toast.success("Room settings saved");
    }
  }

  async function deleteRoom() {
    if (
      !window.confirm(`Permanently delete ${room.name}? This cannot be undone.`)
    ) {
      return;
    }
    const result = await request(`/api/admin/rooms/${room.id}`, {
      method: "DELETE",
    });
    if (result) {
      await afterDelete();
      toast.success("Room deleted");
    }
  }

  return (
    <form
      className="min-w-0 space-y-10 pb-8"
      data-slot="admin-room-editor"
      aria-label={`Manage ${room.name}`}
      onSubmit={(event) => void saveSettings(event)}
    >
      <section
        className="grid min-w-0 gap-6 lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-8"
        aria-labelledby="room-mission-title"
      >
        <h2
          className="text-lg font-semibold tracking-tight"
          data-slot="admin-section-title"
          id="room-mission-title"
        >
          Mission
        </h2>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            className="sm:col-span-1 sm:col-start-1 sm:row-start-1"
            data-admin-setting="phase"
          >
            <FieldTitle>Phase</FieldTitle>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div
                className="flex h-9 min-w-24 flex-1 items-center rounded-md border border-input bg-white px-3 font-mono text-sm shadow-xs"
                data-slot="admin-room-phase"
                aria-label="Room phase"
              >
                {room.phase}
              </div>
              <Button
                variant="secondary"
                type="button"
                disabled={disabled}
                onClick={() => void roomAction("return-to-preflight")}
              >
                <RefreshCw />
                Reset
              </Button>
              {room.phase === "finished" ? (
                <Button
                  type="button"
                  disabled={disabled}
                  onClick={() => void roomAction("advance")}
                >
                  Advance mission
                  <ChevronRight />
                </Button>
              ) : null}
            </div>
          </Field>

          <Field
            className="sm:col-span-1 sm:col-start-2 sm:row-start-1"
            data-admin-setting="edition"
          >
            <FieldLabel htmlFor={`room-edition-${room.id}`}>Edition</FieldLabel>
            <Select
              value={editionKey}
              onValueChange={(value) => {
                const nextEditionKey = value as EditionOption["key"];
                const nextMissions =
                  editions.find((edition) => edition.key === nextEditionKey)
                    ?.missions ?? [];
                setEditionKey(nextEditionKey);
                setMissionKey(nextMissions[0]?.key ?? "");
              }}
            >
              <SelectTrigger className="w-full" id={`room-edition-${room.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {editions.map((edition) => (
                  <SelectItem key={edition.key} value={edition.key}>
                    <CrewEdition editionKey={edition.key} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            className="sm:col-span-1 sm:col-start-1 sm:row-start-2"
            data-admin-setting="mission"
          >
            <FieldLabel htmlFor={`room-mission-${room.id}`}>Mission</FieldLabel>
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                type="button"
                aria-label="Previous mission"
                title="Previous mission"
                disabled={disabled || selectedMissionIndex <= 0}
                onClick={() => {
                  const previousMission =
                    missionOptions[selectedMissionIndex - 1];
                  if (previousMission) setMissionKey(previousMission.key);
                }}
              >
                <ChevronLeft />
              </Button>
              <Select
                value={selectedMissionKey}
                onValueChange={setMissionKey}
                disabled={disabled}
              >
                <SelectTrigger
                  className="min-w-0 flex-1"
                  id={`room-mission-${room.id}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {missionOptions.map((mission) => (
                    <SelectItem value={mission.key} key={mission.key}>
                      {mission.number} · {mission.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                type="button"
                aria-label="Next mission"
                title="Next mission"
                disabled={
                  disabled ||
                  selectedMissionIndex < 0 ||
                  selectedMissionIndex >= missionOptions.length - 1
                }
                onClick={() => {
                  const nextMission = missionOptions[selectedMissionIndex + 1];
                  if (nextMission) setMissionKey(nextMission.key);
                }}
              >
                <ChevronRight />
              </Button>
            </div>
          </Field>

          <Field
            className="sm:col-span-1 sm:col-start-2 sm:row-start-2"
            data-admin-setting="attempt"
          >
            <FieldLabel htmlFor={`room-attempt-${room.id}`}>Attempt</FieldLabel>
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                type="button"
                aria-label="Previous attempt"
                title="Previous attempt"
                disabled={
                  disabled || !attemptNumberIsValid || parsedAttemptNumber <= 1
                }
                onClick={() => stepAttemptNumber(-1)}
              >
                <ChevronLeft />
              </Button>
              <Input
                className="min-w-0 flex-1"
                id={`room-attempt-${room.id}`}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={attemptNumber}
                disabled={disabled}
                required
                onChange={(event) => setAttemptNumber(event.target.value)}
              />
              <Button
                variant="outline"
                size="icon"
                type="button"
                aria-label="Next attempt"
                title="Next attempt"
                disabled={disabled}
                onClick={() => stepAttemptNumber(1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </Field>
        </div>
      </section>

      <section
        className="grid min-w-0 gap-6 lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-8"
        aria-labelledby="room-players-title"
      >
        <h2
          className="self-start text-lg font-semibold tracking-tight"
          data-slot="admin-section-title"
          id="room-players-title"
        >
          Players
        </h2>
        <div className="min-w-0 space-y-2">
          <div
            className="grid grid-cols-2 gap-4 text-sm font-medium"
            data-slot="admin-player-column-labels"
          >
            <span>Player</span>
            <span>Tags</span>
          </div>
          <ol className="grid min-w-0 gap-2">
            {playerDrafts.map((player) => (
              <AdminPlayerSettingsRow
                key={player.seat}
                player={player}
                disabled={disabled}
                onChange={(patch) => updatePlayerDraft(player.seat, patch)}
              />
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              variant="secondary"
              type="button"
              disabled={disabled || filledPlayerCount < 2}
              onClick={shufflePlayers}
            >
              <Shuffle />
              Shuffle players
            </Button>
          </div>
        </div>
      </section>

      <section
        className="grid min-w-0 gap-6 lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-8"
        aria-labelledby="room-actions-title"
      >
        <h2
          className="text-lg font-semibold tracking-tight"
          data-slot="admin-section-title"
          id="room-actions-title"
        >
          Actions
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="destructive"
            type="button"
            disabled={disabled}
            onClick={() => void deleteRoom()}
          >
            <Trash2 />
            Delete Room
          </Button>
          <Button type="submit" disabled={disabled}>
            <Save />
            Save
          </Button>
        </div>
      </section>
    </form>
  );
}

function AdminPlayerSettingsRow({
  player,
  disabled,
  onChange,
}: {
  player: AdminPlayerDraft;
  disabled: boolean;
  onChange: (patch: Partial<Omit<AdminPlayerDraft, "seat">>) => void;
}) {
  const unused = player.displayName.trim().length === 0;
  const tagsAnchor = useComboboxAnchor();

  return (
    <li
      className={cn(
        "grid min-w-0 grid-cols-2 items-center gap-4 py-1 transition-opacity",
        unused && "opacity-50 hover:opacity-75 focus-within:opacity-100",
      )}
      data-admin-player-row
      data-empty={unused ? "true" : undefined}
    >
      <div className="min-w-0">
        <Input
          className="min-w-0"
          aria-label={`Display name for player ${player.seat}`}
          value={player.displayName}
          maxLength={32}
          pattern="[A-Za-z0-9_-]{0,32}"
          placeholder="Empty"
          disabled={disabled}
          onChange={(event) =>
            onChange({
              displayName: event.target.value.replace(/[^A-Za-z0-9_-]/g, ""),
            })
          }
        />
      </div>

      {!unused ? (
        <Combobox
          disabled={disabled}
          items={[...PLAYER_TAGS]}
          multiple
          value={player.tags}
          onValueChange={(tags) => onChange({ tags })}
        >
          <ComboboxChips className="min-w-0" ref={tagsAnchor}>
            <ComboboxValue>
              {player.tags.map((playerTag) => (
                <ComboboxChip key={playerTag}>{playerTag}</ComboboxChip>
              ))}
            </ComboboxValue>
            <ComboboxChipsInput
              aria-label={`Tags for ${player.displayName}`}
              placeholder="Add tags..."
            />
          </ComboboxChips>
          <ComboboxContent anchor={tagsAnchor}>
            <ComboboxEmpty>No tags found.</ComboboxEmpty>
            <ComboboxList>
              {(playerTag) => (
                <ComboboxItem key={playerTag} value={playerTag}>
                  {playerTag}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      ) : null}
    </li>
  );
}

function emptyPlayerDraft(seat: number): AdminPlayerDraft {
  return {
    displayName: "",
    tags: [],
    seat,
  };
}

function playerDraftsForRoom(room: AdminRoomDetail): AdminPlayerDraft[] {
  const drafts = Array.from({ length: 5 }, (_, index) =>
    emptyPlayerDraft(index + 1),
  );

  for (const player of room.players) {
    const preferredIndex = player.seat - 1;
    const openIndex = drafts[preferredIndex]?.id
      ? drafts.findIndex((draft) => !draft.id)
      : preferredIndex;
    if (openIndex < 0 || !drafts[openIndex]) continue;
    drafts[openIndex] = {
      ...player,
      seat: openIndex + 1,
    };
  }

  return drafts;
}

function hasDraftRosterChanged(
  currentPlayers: AdminPlayer[],
  drafts: AdminPlayerDraft[],
) {
  const desiredPlayers = drafts.filter(
    (player) => player.displayName.trim().length > 0,
  );
  if (currentPlayers.length !== desiredPlayers.length) return true;
  const currentPlayersById = new Map(
    currentPlayers.map((player) => [player.id, player]),
  );
  return desiredPlayers.some((player) => {
    if (!player.id) return true;
    const current = currentPlayersById.get(player.id);
    return (
      !current ||
      current.displayName !== player.displayName.trim() ||
      current.seat !== player.seat
    );
  });
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
