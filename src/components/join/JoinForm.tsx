"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useId, useState } from "react";

import { credentialStorageKey, normalizeRoomName } from "@/components/game/credentials";
import {
  apiErrorMessage,
  type ApiErrorBody,
} from "@/components/game/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { CrewMark } from "@/components/ui/CrewMark";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/Spinner";

type LoginResponse = {
  room?: { name?: string };
};

export function JoinForm() {
  const router = useRouter();
  const roomKeyId = useId();
  const playerKeyId = useId();
  const [roomKey, setRoomKey] = useState("");
  const [playerKey, setPlayerKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [rememberedRooms, setRememberedRooms] = useState<string[]>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const rooms = Object.keys(window.localStorage)
        .filter((key) => key.startsWith("crew:credentials:"))
        .flatMap((key) => {
          try {
            const parsed = JSON.parse(window.localStorage.getItem(key) ?? "{}") as {
              roomName?: string;
              roomKey?: string;
              playerKey?: string;
            };
            return parsed.roomName && parsed.roomKey && parsed.playerKey
              ? [parsed.roomName]
              : [];
          } catch {
            return [];
          }
        });
      setRememberedRooms([...new Set(rooms)].slice(0, 3));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedRoomKey = roomKey.replace(/\s/g, "").toUpperCase();
    const normalizedPlayerKey = playerKey.replace(/\s/g, "").toUpperCase();

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/rooms/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomKey: normalizedRoomKey,
          playerKey: normalizedPlayerKey,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as
        LoginResponse &
        ApiErrorBody;

      if (!response.ok) {
        throw new Error(
          apiErrorMessage(body, "Those room and player keys were not recognized."),
        );
      }

      const canonicalRoomName = body.room?.name;
      if (!canonicalRoomName) {
        throw new Error("The room response was incomplete.");
      }
      window.localStorage.setItem(
        credentialStorageKey(canonicalRoomName),
        JSON.stringify({
          roomName: canonicalRoomName,
          roomKey: normalizedRoomKey,
          playerKey: normalizedPlayerKey,
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
    <Card
      className="relative z-10 max-h-[calc(100dvh-1rem)] w-full max-w-sm gap-0 overflow-y-auto border-white/20 bg-card/95 py-0 shadow-2xl backdrop-blur-sm sm:max-h-[calc(100dvh-4rem)]"
      role="region"
      aria-label="Join a room"
    >
      <CardHeader className="gap-0 px-6 pt-6 sm:px-8 sm:pt-8">
        <CrewMark size="large" />
        <h1
          className="mt-6 mb-1.5 text-2xl font-semibold tracking-tight"
          data-slot="card-title"
          id="join-title"
        >
          Ready, crew?
        </h1>
        <CardDescription className="text-base">
          Enter your room key and player key.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pt-6 pb-6 sm:px-8 sm:pb-8">
        <form onSubmit={submit}>
          <FieldGroup className="gap-5">
            <Field className="gap-2">
              <FieldLabel htmlFor={roomKeyId}>Room key</FieldLabel>
              <Input
                className="h-11 bg-background font-[var(--font-display)] text-lg font-bold tracking-[0.2em] uppercase placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:normal-case"
                id={roomKeyId}
                name="roomKey"
                type="text"
                autoComplete="one-time-code"
                autoCapitalize="characters"
                spellCheck={false}
                minLength={6}
                maxLength={6}
                pattern="[A-HJ-NP-Za-hj-np-z2-9]{6}"
                placeholder="Enter your room key..."
                value={roomKey}
                onChange={(event) =>
                  setRoomKey(
                    event.target.value
                      .replace(/[^A-HJ-NP-Za-hj-np-z2-9]/g, "")
                      .toUpperCase(),
                  )
                }
                required
                autoFocus
              />
            </Field>

            <Field className="gap-2">
              <FieldLabel htmlFor={playerKeyId}>Player key</FieldLabel>
              <Input
                className="h-11 bg-background font-[var(--font-display)] text-lg font-bold tracking-[0.2em] uppercase placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:normal-case"
                id={playerKeyId}
                name="playerKey"
                type="text"
                autoComplete="one-time-code"
                autoCapitalize="characters"
                spellCheck={false}
                minLength={6}
                maxLength={6}
                pattern="[A-HJ-NP-Za-hj-np-z2-9]{6}"
                placeholder="Enter your player key..."
                value={playerKey}
                onChange={(event) =>
                  setPlayerKey(
                    event.target.value
                      .replace(/[^A-HJ-NP-Za-hj-np-z2-9]/g, "")
                      .toUpperCase(),
                  )
                }
                required
                aria-invalid={Boolean(error)}
              />
            </Field>

            {error ? (
              <FieldError aria-live="polite">{error}</FieldError>
            ) : null}

            <Button
              className="h-11 self-end"
              type="submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Spinner label="Joining room" /> Joining…
                </>
              ) : (
                "Join mission"
              )}
            </Button>
          </FieldGroup>
        </form>

        {rememberedRooms.length ? (
          <div className="mt-6">
            <Separator className="mb-5" />
            <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              On this device
            </p>
            <div className="flex flex-wrap gap-2">
              {rememberedRooms.map((name) => (
                <Button
                  variant="outline"
                  size="sm"
                  key={normalizeRoomName(name)}
                  type="button"
                  onClick={() => {
                    const raw = window.localStorage.getItem(
                      credentialStorageKey(name),
                    );
                    if (!raw) return;
                    try {
                      const stored = JSON.parse(raw) as {
                        roomName: string;
                        roomKey: string;
                        playerKey: string;
                      };
                      setRoomKey(stored.roomKey);
                      setPlayerKey(stored.playerKey);
                    } catch {
                      window.localStorage.removeItem(
                        credentialStorageKey(name),
                      );
                    }
                  }}
                >
                  {name}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
