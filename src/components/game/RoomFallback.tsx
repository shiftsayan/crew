import { Passport, type PassportProps } from "@/components/ui/Passport";
import { cn } from "@/lib/utils";

type RoomFallbackProps = PassportProps & {
  containerClassName?: string;
};

export function RoomFallback({
  containerClassName,
  ...passportProps
}: RoomFallbackProps) {
  return (
    <main
      className={cn(
        "relative isolate grid h-dvh min-h-0 w-full place-items-center overflow-hidden p-8",
        containerClassName,
      )}
      data-room-fallback=""
      id="main-content"
    >
      <Passport {...passportProps} />
    </main>
  );
}
