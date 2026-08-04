"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { StoredCredential } from "./credentials";
import {
  apiErrorMessage,
  type ActorProjection,
  type ApiErrorBody,
  type PlayerCommand,
  unwrapProjection,
} from "./types";

type ConnectionState =
  | "loading"
  | "connected"
  | "reconnecting"
  | "unauthorized"
  | "not-found"
  | "restart-required";

type FetchResult = "success" | "retry" | "terminal";

export function useRoomProjection(
  roomName: string,
  credential: StoredCredential | undefined,
) {
  const [projection, setProjection] = useState<ActorProjection | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("loading");
  const [message, setMessage] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const failures = useRef(0);
  const projectionRef = useRef<ActorProjection | null>(null);
  const requestSequence = useRef(0);
  const appliedSequence = useRef(0);
  const actionGeneration = useRef(0);
  const actionInFlight = useRef(false);
  const terminal = useRef(false);

  const fetchProjection = useCallback(
    async (background = false): Promise<FetchResult> => {
      if (!credential) {
        return "terminal";
      }
      if (actionInFlight.current) return "success";

      const sequence = ++requestSequence.current;
      const generation = actionGeneration.current;
      try {
        const response = await fetch(`/api/rooms/${encodeURIComponent(roomName)}`, {
          headers: {
            "X-Crew-Player-Name": credential.playerName,
          },
          cache: "no-store",
        });
        const body = (await response.json().catch(() => ({}))) as ApiErrorBody | ActorProjection;

        if (!response.ok) {
          if ((body as ApiErrorBody).error?.code === "LEVEL_RESTART_REQUIRED") {
            terminal.current = true;
            setConnection("restart-required");
            setMessage(apiErrorMessage(body as ApiErrorBody, "This room needs to be returned to preflight."));
          } else if (response.status === 401 || response.status === 403) {
            terminal.current = true;
            setConnection("unauthorized");
          } else if (response.status === 404) {
            terminal.current = true;
            setConnection("not-found");
          } else {
            throw new Error(apiErrorMessage(body as ApiErrorBody, "Could not refresh the room."));
          }
          return "terminal";
        }

        if (generation !== actionGeneration.current) return "success";
        const next = unwrapProjection(body);
        if (sequence < appliedSequence.current) return "success";
        appliedSequence.current = sequence;
        projectionRef.current = next;
        setProjection(next);
        failures.current = 0;
        terminal.current = false;
        setConnection("connected");
        if (background) setMessage("");
        return "success";
      } catch (caught) {
        if (generation !== actionGeneration.current) return "success";
        if (sequence < appliedSequence.current) return "success";
        failures.current += 1;
        if (projectionRef.current) setConnection("reconnecting");
        else setConnection("reconnecting");
        setMessage(
          caught instanceof Error
            ? caught.message
            : "The room is temporarily unreachable. Retrying…",
        );
        return "retry";
      }
    },
    [credential, roomName],
  );

  useEffect(() => {
    terminal.current = false;
    failures.current = 0;
    let stopped = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let polling = false;

    async function poll() {
      if (stopped || polling || document.visibilityState === "hidden") return;
      polling = true;
      const result = await fetchProjection(true);
      polling = false;
      if (stopped || result === "terminal") return;
      const delay =
        result === "success" ? 1_000 : Math.min(1_000 * 2 ** failures.current, 15_000);
      timeout = setTimeout(poll, delay);
    }

    function visibilityChanged() {
      if (document.visibilityState === "visible") {
        if (timeout) clearTimeout(timeout);
        timeout = undefined;
        if (!terminal.current) void poll();
      } else if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
    }

    void poll();
    document.addEventListener("visibilitychange", visibilityChanged);

    return () => {
      stopped = true;
      if (timeout) clearTimeout(timeout);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [fetchProjection]);

  const sendCommand = useCallback(
    async (command: PlayerCommand) => {
      if (!credential || actionPending) return false;

      setActionPending(true);
      actionInFlight.current = true;
      actionGeneration.current += 1;
      setMessage("");
      const sequence = ++requestSequence.current;
      try {
        const response = await fetch(`/api/rooms/${encodeURIComponent(roomName)}/actions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Crew-Player-Name": credential.playerName,
          },
          body: JSON.stringify(command),
        });
        const body = (await response.json().catch(() => ({}))) as ApiErrorBody | ActorProjection;

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) setConnection("unauthorized");
          setMessage(apiErrorMessage(body as ApiErrorBody, "That move is no longer available."));
          actionInFlight.current = false;
          await fetchProjection(true);
          return false;
        }

        const next = unwrapProjection(body);
        appliedSequence.current = sequence;
        projectionRef.current = next;
        setProjection(next);
        terminal.current = false;
        setConnection("connected");
        return true;
      } catch {
        setConnection("reconnecting");
        setMessage("We could not confirm that action. Refreshing the room before you try again.");
        actionInFlight.current = false;
        await fetchProjection(true);
        return false;
      } finally {
        actionInFlight.current = false;
        setActionPending(false);
      }
    },
    [actionPending, credential, fetchProjection, roomName],
  );

  return {
    projection,
    connection,
    message,
    actionPending,
    refresh: fetchProjection,
    sendCommand,
  };
}
