export function CrewLayout(props) {
    return (
        <div className="h-screen w-screen flex flex-col justify-between select-none bg-red-500 space-y-8">
            {props.children}
        </div>
    )
}