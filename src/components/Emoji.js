import classNames from "classnames";

export function CrewEmoji({ emoji, size = "text-3xl" }) {
    return (
        <span role="img" className={size}>
            {emoji}
        </span>
    )
}