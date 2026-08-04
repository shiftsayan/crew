import { Spinner } from "@/components/ui/Spinner";

export default function Loading() {
  return (
    <main
      className="grid h-dvh min-h-0 w-full place-items-center overflow-hidden"
      id="main-content"
      aria-busy="true"
    >
      <Spinner
        className="text-white **:data-[slot=spinner]:size-12 **:data-[slot=spinner]:border-4"
        label="Loading"
      />
    </main>
  );
}
