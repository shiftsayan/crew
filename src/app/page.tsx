import { JoinForm } from "@/components/join/JoinForm";
import { CrewMark } from "@/components/ui/CrewMark";

export default function HomePage() {
  return (
    <main className="join-page" id="main-content">
      <section className="join-intro" aria-labelledby="join-title">
        <CrewMark size="large" />
        <div>
          <p className="eyebrow">Mission control</p>
          <h1 id="join-title">Ready, crew?</h1>
          <p className="lede">
            Join your room with the six-character key your mission admin gave you.
          </p>
        </div>
      </section>

      <JoinForm />
    </main>
  );
}
