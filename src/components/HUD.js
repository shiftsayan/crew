import { CrewEmoji } from "./Emoji"

function CrewHUDNamesPanelName(props) {
    return (
        <div className="flex align-middle">
            <div className="w-16 my-0.5 flex justify-end mr-2">
                {props.name}
            </div>
            <div>
                {props.commander ? <CrewEmoji emoji="🧑‍🚀" className="text-lg" /> : <></>}
            </div>
        </div>
    )
}

function CrewHUDNamesPanel(props) {
    const names = props.names.map((name, idx) => <CrewHUDNamesPanelName key={idx} name={name} commander={name === 'gamma'} />)

    return (
        <div className="flex flex-col">
            {names}
        </div>
    )
}

export function CrewHUD(props) {
    return (
        <div className="flex">
            <CrewHUDNamesPanel names={['alpha', 'beta', 'gamma', 'delta']} />
        </div>
    )
}