export function CrewEmoji(props) {
    return (
        <span role="img" className={props.className || "text-3xl m-auto"}>
            {props.emoji}
        </span>
    )
}