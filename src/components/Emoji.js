import classNames from "classnames";

export function CrewEmoji(props) {
    return (
        <span role="img" className={classNames({
            "text-3xl m-auto select-none": true,
            "transform rotate-0": props.pi === 0,
            "transform -rotate-90": props.pi === 1,
            "transform rotate-180": props.pi === 2,
            "transform rotate-90": props.pi === 3,
        })}>
            {props.emoji}
        </span>
    )
}