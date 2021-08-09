export function CrewLayout(props) {
    return (
        <>
            <div className="absolute h-full w-full bg-red-100">
                {/* TODO: Add Particles here */}
            </div>
            <div className="absolute z-10">
                {props.children}
            </div>
        </>
    )
}