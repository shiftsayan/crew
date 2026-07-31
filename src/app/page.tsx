import { Artwork } from "@/components/artwork/Artwork";
import { JoinForm } from "@/components/join/JoinForm";
import { CrewMark } from "@/components/ui/CrewMark";

export default function HomePage() {
  return (
    <main className="join-page" id="main-content">
      <Artwork src="/crew-clouds.jpg" />
      <section className="join-console" aria-labelledby="join-title">
        <header className="join-intro">
          <CrewMark size="large" />
          <h1 id="join-title">Ready, crew?</h1>
          <p className="lede">
            Enter your room name and player key.
          </p>
        </header>
        <JoinForm />
      </section>
    </main>
  );
}
