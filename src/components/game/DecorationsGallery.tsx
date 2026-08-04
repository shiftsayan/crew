"use client";

import { Bug as BugIcon, PartyPopper } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { passportHeadingClassName } from "@/components/ui/Passport";

import {
  RoomDecorations,
  type RoomDecorationTrigger,
} from "./RoomDecorations";
import { RoomConsoleImpl, RoomDockImpl, RoomShellImpl } from "./RoomShell";

const decorationNames: Record<RoomDecorationTrigger["kind"], string> = {
  bug: "Bug",
  "mission-complete": "Mission Complete",
};

export function DecorationsGallery() {
  const nextTriggerId = useRef(0);
  const [trigger, setTrigger] = useState<RoomDecorationTrigger | null>(null);
  const [bugTriggerId, setBugTriggerId] = useState<number | null>(null);

  function previewDecoration(kind: RoomDecorationTrigger["kind"]) {
    nextTriggerId.current += 1;
    const id = nextTriggerId.current;

    if (kind === "bug") {
      setBugTriggerId((current) => current ?? id);
    }

    setTrigger({ id, kind });
  }

  return (
    <RoomShellImpl
      decorations={
        <RoomDecorations trigger={trigger} bugTriggerId={bugTriggerId} />
      }
      console={
        <RoomConsoleImpl aria-label="Decoration controls">
          <div className="grid min-h-0 flex-1 place-items-center overflow-auto p-8 max-[700px]:p-4">
            <div className="w-full max-w-2xl">
              <h1
                className={`mb-6 ${passportHeadingClassName}`}
                data-slot="decorations-title"
              >
                Decorations Preview
              </h1>
              <div className="flex flex-wrap gap-3" aria-label="Decoration previews">
                <Button
                  data-decoration-kind="mission-complete"
                  type="button"
                  variant="default"
                  onClick={() => previewDecoration("mission-complete")}
                >
                  <PartyPopper />
                  Preview &apos;Mission Complete&apos;
                </Button>
                <Button
                  data-decoration-kind="bug"
                  type="button"
                  variant="default"
                  onClick={() => previewDecoration("bug")}
                >
                  <BugIcon />
                  Preview &apos;Bug&apos;
                </Button>
              </div>
            </div>
          </div>
        </RoomConsoleImpl>
      }
      dock={<RoomDockImpl aria-label="Empty room dock" />}
      announcement={
        trigger
          ? `${decorationNames[trigger.kind]} decoration played`
          : ""
      }
    />
  );
}
