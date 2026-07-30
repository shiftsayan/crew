type CrewMarkProps = {
  size?: "small" | "large";
};

export function CrewMark({ size = "small" }: CrewMarkProps) {
  return (
    <div className={`crew-mark crew-wordmark crew-mark--${size}`} aria-label="Crew">
      <span
        aria-hidden="true"
        className="crew-mark__astronaut crew-wordmark__icon"
      >
        🧑‍🚀
      </span>
      <span className="crew-mark__word crew-wordmark__text">The Crew</span>
    </div>
  );
}
