"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/button";

import { RoomFallback } from "./RoomFallback";
import { RoomShell } from "./RoomShell";
import { forgetCredential, readCredential, type StoredCredential } from "./credentials";
import { useRoomProjection } from "./useRoomProjection";

export function RoomPage({
  roomName,
  impersonatedPlayerName,
}: {
  roomName: string;
  impersonatedPlayerName?: string;
}) {
  const router = useRouter();
  const [credential, setCredential] = useState<
    StoredCredential | null | undefined
  >(undefined);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCredential(
        impersonatedPlayerName
          ? { roomName, playerName: impersonatedPlayerName }
          : readCredential(roomName),
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [impersonatedPlayerName, roomName]);

  const { projection, connection, message, actionPending, sendCommand } =
    useRoomProjection(roomName, credential ?? undefined);

  useEffect(() => {
    if (credential === undefined) return;

    if (credential === null) {
      router.replace("/");
      return;
    }

    if (connection !== "unauthorized") return;

    forgetCredential(roomName);
    router.replace("/");
  }, [connection, credential, roomName, router]);

  function forgetRoom() {
    forgetCredential(roomName);
    router.replace("/");
  }

  if (credential === undefined) {
    return <RoomLoading label="Loading room" />;
  }

  if (!credential || connection === "unauthorized") {
    return null;
  }

  if (connection === "loading" && !projection) {
    return <RoomLoading label="Loading room" />;
  }

  if (connection === "not-found") {
    return (
      <RoomFallback
        role="alert"
        aria-labelledby="room-not-found-title"
        title={`${roomName} was not found`}
        titleId="room-not-found-title"
        subtitle="It may have been renamed or deleted by the room admin."
      >
        <Button
          className="h-auto whitespace-normal bg-indigo-100 px-6 py-2 text-base leading-6 text-indigo-700 hover:bg-indigo-200 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-auto disabled:cursor-default disabled:opacity-100 forced-colors:border forced-colors:border-[CanvasText]"
          type="button"
          onClick={forgetRoom}
        >
          Forget room and go home
        </Button>
      </RoomFallback>
    );
  }

  if (connection === "restart-required") {
    return (
      <RoomFallback
        containerClassName="p-2 sm:p-8"
        role="alert"
        aria-labelledby="reset-required-title"
        title="Reset required"
        titleId="reset-required-title"
        subtitle="The game configuration has changed. Please ask an admin to reset the room."
      />
    );
  }

  if (connection === "missionless") {
    return <MissionlessRoomFallback message={message} />;
  }

  if (!projection) {
    return (
      <RoomFallback
        role="alert"
        aria-labelledby="room-unavailable-title"
        title="Room unavailable"
        titleId="room-unavailable-title"
        subtitle={message || "Crew will keep trying to reach the room."}
      >
        <Button
          className="h-auto whitespace-normal bg-gray-200 px-6 py-2 text-base leading-6 text-gray-700 hover:bg-gray-300 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-auto disabled:cursor-default disabled:opacity-100 forced-colors:border forced-colors:border-[CanvasText]"
          type="button"
          onClick={forgetRoom}
        >
          Return home
        </Button>
      </RoomFallback>
    );
  }

  return (
    <RoomShell
      projection={projection}
      connection={connection}
      message={message}
      actionPending={actionPending}
      sendCommand={sendCommand}
      onForget={forgetRoom}
    />
  );
}

export function MissionlessRoomFallback({ message = "" }: { message?: string }) {
  return (
    <RoomFallback
      containerClassName="p-2 sm:p-8"
      role="status"
      aria-labelledby="mission-needed-title"
      title="Mission needed"
      titleId="mission-needed-title"
      subtitle={message || "Ask the room admin to set a mission."}
    />
  );
}

function RoomLoading({ label }: { label: string }) {
  return (
    <main
      className="grid h-dvh min-h-0 w-full place-items-center overflow-hidden"
      id="main-content"
      aria-busy="true"
    >
      <Spinner
        className="text-white **:data-[slot=spinner]:size-12 **:data-[slot=spinner]:border-4"
        label={label}
      />
    </main>
  );
}
