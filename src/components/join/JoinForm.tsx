"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useId, useState } from "react";
import { LogIn } from "lucide-react";

import { credentialStorageKey, normalizeRoomName } from "@/components/game/credentials";
import {
  apiErrorMessage,
  type ApiErrorBody,
} from "@/components/game/types";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Passport } from "@/components/ui/Passport";
import { Spinner } from "@/components/ui/Spinner";

type LoginResponse = {
  room?: { name?: string };
  player?: { displayName?: string };
};

type RememberedLogin = {
  roomName: string;
  playerName: string;
};

export function JoinForm() {
  const router = useRouter();
  const roomKeyId = useId();
  const playerKeyId = useId();
  const [roomName, setRoomName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [rememberedLogins, setRememberedLogins] = useState<RememberedLogin[]>(
    [],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const logins = Object.keys(window.localStorage)
        .filter((key) => key.startsWith("crew:credentials:"))
        .flatMap((key) => {
          try {
            const parsed = JSON.parse(window.localStorage.getItem(key) ?? "{}") as {
              roomName?: string;
              playerName?: string;
            };
            return typeof parsed.roomName === "string" &&
              parsed.roomName &&
              typeof parsed.playerName === "string" &&
              parsed.playerName
              ? [{ roomName: parsed.roomName, playerName: parsed.playerName }]
              : [];
          } catch {
            return [];
          }
        });
      const uniqueLogins = new Map(
        logins.map((login) => [normalizeRoomName(login.roomName), login]),
      );
      setRememberedLogins(
        Array.from(uniqueLogins.values()).slice(0, 3),
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedRoomName = roomName.trim();
    const normalizedPlayerName = playerName.trim();

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/rooms/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: normalizedRoomName,
          playerName: normalizedPlayerName,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as
        LoginResponse &
        ApiErrorBody;

      if (!response.ok) {
        throw new Error(
          apiErrorMessage(body, "Those room and player names were not recognized."),
        );
      }

      const canonicalRoomName = body.room?.name;
      const canonicalPlayerName = body.player?.displayName;
      if (!canonicalRoomName || !canonicalPlayerName) {
        throw new Error("The room response was incomplete.");
      }
      window.localStorage.setItem(
        credentialStorageKey(canonicalRoomName),
        JSON.stringify({
          roomName: canonicalRoomName,
          playerName: canonicalPlayerName,
        }),
      );
      router.push(`/rooms/${encodeURIComponent(canonicalRoomName)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not join the room.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Passport
      role="region"
      aria-label="Join a room"
      title="Hello crewmate"
      subtitle="Enter your room key and player key."
    >
      <form onSubmit={submit}>
        <FieldGroup className="gap-5">
          <Field className="gap-2">
            <FieldLabel htmlFor={roomKeyId}>Room Key</FieldLabel>
            <Input
              className="h-9"
              id={roomKeyId}
              name="roomName"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              minLength={2}
              maxLength={32}
              pattern="[A-Za-z0-9_-]{2,32}"
              placeholder="Enter your room key..."
              value={roomName}
              onChange={(event) =>
                setRoomName(event.target.value.replace(/[^A-Za-z0-9_-]/g, ""))
              }
              required
              autoFocus
            />
          </Field>

          <Field className="gap-2">
            <FieldLabel htmlFor={playerKeyId}>Player Key</FieldLabel>
            <Input
              className="h-9"
              id={playerKeyId}
              name="playerName"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              minLength={1}
              maxLength={32}
              pattern="[A-Za-z0-9_-]{1,32}"
              placeholder="Enter your player key..."
              value={playerName}
              onChange={(event) =>
                setPlayerName(event.target.value.replace(/[^A-Za-z0-9_-]/g, ""))
              }
              required
              aria-invalid={Boolean(error)}
            />
          </Field>

          {error ? (
            <FieldError aria-live="polite">{error}</FieldError>
          ) : null}

          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Spinner label="Entering room" /> Entering…
              </>
            ) : (
              <>
                <LogIn /> Enter
              </>
            )}
          </Button>
        </FieldGroup>
      </form>

      {rememberedLogins.length ? (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
            On this device
          </p>
          <div className="flex flex-wrap gap-2">
            {rememberedLogins.map((login) => (
              <Button
                variant="outline"
                key={normalizeRoomName(login.roomName)}
                type="button"
                onClick={() => {
                  const raw = window.localStorage.getItem(
                    credentialStorageKey(login.roomName),
                  );
                  if (!raw) return;
                  try {
                    const stored = JSON.parse(raw) as {
                      roomName: string;
                      playerName: string;
                    };
                    setRoomName(stored.roomName);
                    setPlayerName(stored.playerName);
                  } catch {
                    window.localStorage.removeItem(
                      credentialStorageKey(login.roomName),
                    );
                  }
                }}
              >
                {login.roomName} · {login.playerName}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </Passport>
  );
}
