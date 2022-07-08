import { CrewDock } from "./Dock"
import { CrewConsole } from "./Console"

export function CrewBoard({ state, setState }) {
	return (
		<>
			<CrewConsole state={state} setState={setState} />
			<CrewDock state={state} setState={setState} />
		</>
	)
}

