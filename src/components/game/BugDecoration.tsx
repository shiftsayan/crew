import styles from "./BugDecoration.module.css";

export function BugDecoration({ triggerId }: { triggerId: number }) {
  return (
    <div
      aria-hidden="true"
      className={styles.root}
      data-room-decoration="bug"
      data-trigger-id={triggerId}
    >
    <svg
        className={styles.blob}
        data-dead-pixel-blob="true"
        viewBox="0 0 32 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          className={styles.core}
          d="M4.2 11.8C2.1 8.9 4.7 5.1 8.2 5.4C9.7 2.3 14.7 1.8 17 4.5C20.2 3.4 24 5.8 23.6 9C27.8 9.7 28.2 14.5 25 16.3C23.8 19.8 19 20.5 16.8 18.4C13.8 21.5 9.2 19.2 9 16.8C5.2 17.2 2.7 14.8 4.2 11.8Z"
        />
        <path
          className={styles.edge}
          d="M8.4 15.1C12.6 17.8 18.8 18.4 24.5 14.9C23.7 18.7 18.8 20.5 16.7 18.4C13.9 21.2 9.7 19.5 9 16.8C7.9 16.9 7 16.7 6.2 16.4Z"
        />
        <circle className={styles.speck} cx="28.2" cy="6.1" r="1.25" />
        <circle className={styles.speck} cx="3" cy="19.2" r="0.75" />
      </svg>
    </div>
  );
}
