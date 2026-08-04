import { JoinForm } from "@/components/join/JoinForm";

export default function HomePage() {
  return (
    <main
      className="relative isolate grid h-dvh min-h-0 w-full place-items-center overflow-hidden p-2 sm:p-8"
      id="main-content"
    >
      <div className="relative z-10 w-full max-w-sm">
        <JoinForm />
      </div>
    </main>
  );
}
