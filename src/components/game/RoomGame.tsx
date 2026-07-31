"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { CrewMark } from "@/components/ui/CrewMark";
import { Spinner } from "@/components/ui/Spinner";

import { CrewBoard } from "./CrewBoard";
import { forgetCredential, readCredential, type StoredCredential } from "./credentials";
import { useRoomProjection } from "./useRoomProjection";

const minimumRoomViewport =
  "(min-width: 1024px) and (min-height: 640px)";

export function RoomGame() {
  const viewportAllowed = useRoomViewport();

  if (viewportAllowed !== true) {
    return <RoomViewportGate checking={viewportAllowed === null} />;
  }

  return <RoomGameContent />;
}

function RoomGameContent() {
  const params = useParams<{ name: string }>();
  const router = useRouter();
  const routeName = decodeURIComponent(params.name);
  const [credential, setCredential] = useState<StoredCredential | null>(null);
  const [credentialLoaded, setCredentialLoaded] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCredential(readCredential(routeName));
      setCredentialLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [routeName]);

  const { projection, connection, message, actionPending, sendCommand } =
    useRoomProjection(routeName, credential);

  function forgetRoom() {
    forgetCredential(routeName);
    router.replace("/");
  }

  if (!credentialLoaded || (connection === "loading" && !projection)) {
    return (
      <RoomState>
        <Spinner label="Loading room" />
        <h1>Loading room</h1>
      </RoomState>
    );
  }

  if (!credential || connection === "unauthorized") {
    return (
      <RoomState>
        <p className="state-label">Credentials needed</p>
        <h1>Join {routeName}</h1>
        <p>This device does not have a valid player key for the room.</p>
        <Link className="button button--primary" href="/">
          Return to join
        </Link>
        {credential ? (
          <button className="button button--quiet" type="button" onClick={forgetRoom}>
            Forget saved key
          </button>
        ) : null}
      </RoomState>
    );
  }

  if (connection === "not-found") {
    return (
      <RoomState>
        <p className="state-label">Room unavailable</p>
        <h1>{routeName} was not found</h1>
        <p>It may have been renamed or deleted by the room admin.</p>
        <button className="button button--primary" type="button" onClick={forgetRoom}>
          Forget room and go home
        </button>
      </RoomState>
    );
  }

  if (connection === "restart-required") {
    return (
      <RoomState>
        <p className="state-label">Restart required</p>
        <h1>The game rules changed</h1>
        <p>
          {message ||
            "Ask the room admin to restart this level. Your room and player key are safe."}
        </p>
        <button className="button button--quiet" type="button" onClick={forgetRoom}>
          Return home
        </button>
      </RoomState>
    );
  }

  if (!projection) {
    return (
      <RoomState>
        <h1>Room unavailable</h1>
        <p>{message || "Crew will keep trying to reach the room."}</p>
        <button className="button button--quiet" type="button" onClick={forgetRoom}>
          Return home
        </button>
      </RoomState>
    );
  }

  return (
    <CrewBoard
      projection={projection}
      connection={connection}
      message={message}
      actionPending={actionPending}
      sendCommand={sendCommand}
      onForget={forgetRoom}
    />
  );
}

function RoomViewportGate({ checking }: { checking: boolean }) {
  return (
    <div
      className={`room-viewport-gate ${
        checking ? "room-viewport-gate--checking" : ""
      }`}
      id="main-content"
      role="alert"
      aria-labelledby="room-viewport-title"
    >
      <section className="room-viewport-gate__panel">
        <CrewMark size="large" />
        <h1 id="room-viewport-title">Screen too small</h1>
        <p>The game room requires a window at least 1024 × 640.</p>
      </section>
    </div>
  );
}

function RoomState({ children }: { children: ReactNode }) {
  return (
    <main className="centered-state" id="main-content">
      <CrewMark size="large" />
      <section className="state-panel">{children}</section>
    </main>
  );
}

function useRoomViewport() {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia(minimumRoomViewport);
    const update = () => setAllowed(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return allowed;
}
