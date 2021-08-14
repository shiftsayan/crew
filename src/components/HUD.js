import { CrewEmoji } from "./Emoji"

function CrewHUDNamesPanelName(props) {
    return (
        // TODO
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
        <div className="w-full h-1/2 mb-12 bg-gray-100 flex justify-center rounded-3xl">
            <div className="m-auto">
                HUD
            </div>
        </div>
    )
}