"use client";

import { useEffect, useState, type ReactNode } from "react";

import { RoomFallback } from "@/components/game/RoomFallback";
import { Spinner } from "@/components/ui/Spinner";

const minimumRoomViewport =
  "(min-width: 1024px) and (min-height: 640px)";

export default function RoomsLayout({ children }: { children: ReactNode }) {
  const viewportAllowed = useRoomViewport();

  if (viewportAllowed === null) {
    return (
      <main
        className="grid h-dvh min-h-0 w-full place-items-center overflow-hidden"
        id="main-content"
        aria-busy="true"
      >
        <Spinner
          className="text-white **:data-[slot=spinner]:size-12 **:data-[slot=spinner]:border-4"
          label="Loading game"
        />
      </main>
    );
  }

  if (!viewportAllowed) {
    return (
      <RoomFallback
        containerClassName="fixed inset-0 z-[1000]"
        role="alert"
        aria-labelledby="room-viewport-title"
        title="Size Matters"
        titleId="room-viewport-title"
        subtitle="The game room requires a window at least 1024 × 640."
      />
    );
  }

  return children;
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
