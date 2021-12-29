import classnames from 'classnames'

import { mapSuiteToIcon, mapSuiteToBorderColor, mapSuiteToTextColor } from '../util/maps'

export function CrewLabelText({ num, suite }) {
    return (
        <div className={`m-auto w-2 h-6 text-lg font-display font-bold ${mapSuiteToTextColor[suite]}`}>
            {num}
        </div>
    )
}

export function CrewLabelIcon({ suite, size = "" }) {
    return (
        <div className={classnames("m-auto text-white opacity-20", size)}>
            {mapSuiteToIcon[suite]}
        </div>
    )
}

export function CrewLabelPendant({ icon, suite }) {
    return (
        <div className={classnames("w-5 h-5 bg-white absolute inset-x-1/2 inset-y-full -mx-2.5 -my-2.5 rounded-full flex justify-center border-2", mapSuiteToBorderColor[suite])}>
            <div className="text-xs m-auto">
                {icon}
            </div>
        </div>
    )
}