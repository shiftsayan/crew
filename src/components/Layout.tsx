import classnames from "classnames"

import { Snackbar, Alert } from "@mui/material"


export function Layout({ children, view }) {
    return (
        <div className={classnames("h-screen w-screen animate-gradient bg-[length:400%_400%] bg-gradient-to-tl", view.background)}>
            <div className="h-full w-full flex flex-col space-y-8 justify-center">
                {children}
            </div>
            {view.toast && <div>
                <Snackbar open={true} autoHideDuration={1} >
                    <Alert severity={view.toast.style}>
                        {view.toast.text}
                    </Alert>
                </Snackbar>
            </div>}
        </div>
    )
}