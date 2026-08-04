import type { ComponentProps } from "react";

import type { EditionKey } from "@/game";
import { cn } from "@/lib/utils";

const editions = {
  "planet-nine": {
    emoji: "🚀",
    name: "The Quest for Planet Nine",
    shortName: "Planet Nine",
  },
  "deep-sea": {
    emoji: "🌊",
    name: "Mission Deep Sea",
    shortName: "Deep Sea",
  },
} satisfies Record<
  EditionKey,
  { emoji: string; name: string; shortName: string }
>;

type CrewEditionProps = ComponentProps<"span"> & {
  editionKey: EditionKey;
  compact?: boolean;
};

export function CrewEdition({
  editionKey,
  compact = false,
  className,
  ...props
}: CrewEditionProps) {
  const edition = editions[editionKey];

  return (
    <span
      className={cn("inline-flex min-w-0 items-center gap-1.5", className)}
      data-edition={editionKey}
      data-slot="crew-edition"
      {...props}
    >
      <span aria-hidden="true">{edition.emoji}</span>
      <span className="truncate">
        {compact ? edition.shortName : edition.name}
      </span>
    </span>
  );
}
