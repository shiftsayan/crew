import classNames from 'classnames'
import '../styles/Layout.css'

export function CrewLayout(props) {
    return (
        <div className={classNames("h-screen w-screen flex flex-col p-6 justify-between select-none", props.color.bg.default)}>
            {props.children}
        </div>
    )
}