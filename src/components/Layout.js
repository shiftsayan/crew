import classNames from 'classnames'
import '../styles/Layout.css'

export function CrewLayout(props) {
    return (
        <div className={classNames("h-screen w-screen flex flex-col-reverse p-12 justify-between", props.color.bg.default)}>
            {props.children}
        </div>
    )
}