type CrewMarkProps = {
  size?: "small" | "large";
};

export function CrewMark({ size = "small" }: CrewMarkProps) {
  return (
    <div className={`crew-mark crew-mark--${size}`} aria-label="Crew">
      <span aria-hidden="true" className="crew-mark__orbit">
        <span className="crew-mark__planet" />
      </span>
      <span className="crew-mark__word">CREW</span>
    </div>
  );
}
