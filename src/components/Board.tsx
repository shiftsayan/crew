import { CrewLayout } from "./Layout";
import { CrewDock } from "./Dock"
import { CrewConsole } from "./Console"

export function CrewBoard({ state, setState }) {
	return (
		<CrewLayout>
			<CrewConsole state={state} setState={setState} />
			<CrewDock state={state} setState={setState} />
		</CrewLayout>
	)
}

