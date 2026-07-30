"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormEvent, useEffect, useId, useState } from "react";

import { credentialStorageKey, normalizeRoomName } from "@/components/game/credentials";
import {
  apiErrorMessage,
  type ApiErrorBody,
} from "@/components/game/types";
import { Notice } from "@/components/ui/Notice";
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
    <section className="join-card" aria-label="Join a room">
      <form onSubmit={submit}>
        <label htmlFor={roomId}>Room name</label>
        <input
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

        <label htmlFor={keyId}>Your player key</label>
        <input
          className="key-input"
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
            setPlayerKey(event.target.value.replace(/[^A-HJ-NP-Za-hj-np-z2-9]/g, "").toUpperCase())
          }
          required
          aria-describedby={`${keyId}-hint`}
        />
        <p className="field-hint" id={`${keyId}-hint`}>
          Keys use six letters and numbers.
        </p>

        {error ? (
          <Notice tone="error" live>
            {error}
          </Notice>
        ) : null}

        <button className="button button--primary button--wide" type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner label="Joining room" /> Joining…
            </>
          ) : (
            "Join mission"
          )}
        </button>
      </form>

      {rememberedRooms.length ? (
        <div className="remembered-rooms">
          <p className="eyebrow">On this device</p>
          <div className="chip-row">
            {rememberedRooms.map((name) => (
              <button
                className="chip"
                key={normalizeRoomName(name)}
                type="button"
                onClick={() => {
                  const raw = window.localStorage.getItem(credentialStorageKey(name));
                  if (!raw) return;
                  try {
                    const stored = JSON.parse(raw) as { roomName: string; key: string };
                    setRoomName(stored.roomName);
                    setPlayerKey(stored.key);
                  } catch {
                    window.localStorage.removeItem(credentialStorageKey(name));
                  }
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Link className="text-link join-admin-link" href="/admin">
        Room admin
      </Link>
    </section>
  );
}
