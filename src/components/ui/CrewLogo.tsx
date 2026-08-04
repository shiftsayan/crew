import { cn } from "@/lib/utils";

type CrewLogoProps = {
  size?: "small" | "large";
  text?: string;
  alt?: string;
  className?: string;
};

export function CrewLogo({
  size = "large",
  text = "The Crew",
  alt = text,
  className,
}: CrewLogoProps) {
  return (
    <div
      className={cn(
        "inline-flex select-none items-center gap-1.5 font-semibold leading-none text-inherit",
        size === "small" ? "text-base" : "text-[1.3rem]",
        className,
      )}
      aria-label={alt}
      data-slot="crew-logo"
      role="img"
    >
      <span
        aria-hidden="true"
        data-slot="crew-logo-icon"
      >
        🧑‍🚀
      </span>
      <span
        aria-hidden="true"
        data-slot="crew-logo-text"
      >
        {text}
      </span>
    </div>
  );
}
