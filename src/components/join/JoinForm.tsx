"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
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
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { CrewMark } from "@/components/ui/CrewMark";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/Spinner";

type LoginResponse = {
  room?: { name?: string };
  roomName?: string;
};

export function JoinForm() {
  const router = useRouter();
  const roomId = useId();
  const keyId = useId();
  const [roomName, setRoomName] = useState("");
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
            };
            return parsed.roomName ? [parsed.roomName] : [];
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
    const normalizedRoom = roomName.trim();
    const normalizedKey = playerKey.replace(/\s/g, "").toUpperCase();

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/rooms/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: normalizedRoom, key: normalizedKey }),
      });

      const body = (await response.json().catch(() => ({}))) as
        LoginResponse &
        ApiErrorBody;

      if (!response.ok) {
        throw new Error(
          apiErrorMessage(body, "That room or key was not recognized."),
        );
      }

      const canonicalRoomName = body.room?.name ?? body.roomName ?? normalizedRoom;
      window.localStorage.setItem(
        credentialStorageKey(canonicalRoomName),
        JSON.stringify({ roomName: canonicalRoomName, key: normalizedKey }),
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
          Enter your room name and player key.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pt-6 sm:px-8">
        <form onSubmit={submit}>
          <FieldGroup className="gap-5">
            <Field className="gap-2">
              <FieldLabel htmlFor={roomId}>Room name</FieldLabel>
              <Input
                className="h-11 bg-background text-base"
                id={roomId}
                name="roomName"
                type="text"
                autoComplete="off"
                minLength={2}
                maxLength={32}
                pattern="[A-Za-z0-9 _-]{2,32}"
                placeholder="Europa"
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                required
                autoFocus
              />
            </Field>

            <Field className="gap-2">
              <FieldLabel htmlFor={keyId}>Your player key</FieldLabel>
              <Input
                className="h-11 bg-background font-[var(--font-display)] text-lg font-bold tracking-[0.2em] uppercase"
                id={keyId}
                name="playerKey"
                type="text"
                autoComplete="one-time-code"
                autoCapitalize="characters"
                spellCheck={false}
                minLength={6}
                maxLength={6}
                pattern="[A-HJ-NP-Za-hj-np-z2-9]{6}"
                placeholder="6FJ9KP"
                value={playerKey}
                onChange={(event) =>
                  setPlayerKey(
                    event.target.value
                      .replace(/[^A-HJ-NP-Za-hj-np-z2-9]/g, "")
                      .toUpperCase(),
                  )
                }
                required
                aria-describedby={`${keyId}-hint`}
                aria-invalid={Boolean(error)}
              />
              <FieldDescription id={`${keyId}-hint`}>
                Keys use six letters and numbers.
              </FieldDescription>
            </Field>

            {error ? (
              <FieldError aria-live="polite">{error}</FieldError>
            ) : null}

            <Button
              className="h-11 w-full"
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
                        key: string;
                      };
                      setRoomName(stored.roomName);
                      setPlayerKey(stored.key);
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
      <CardFooter className="px-6 pt-3 pb-6 sm:px-8 sm:pb-8">
        <Button
          asChild
          className="h-9 px-0 text-xs font-semibold"
          variant="link"
        >
          <Link href="/admin">Room admin</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
