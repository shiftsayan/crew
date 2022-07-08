import classnames from "classnames"

import { Snackbar, Alert } from "@mui/material"


export function Layout({ children, view }) {
    return (
        <div className={classnames("h-screen w-screen", view.background)}>
            <div className="h-full w-full flex flex-col space-y-8 justify-center">
                {children}
            </div>
            {view.text && <div>
                <Snackbar open={false} autoHideDuration={1} >
                    <Alert severity="success" sx={{ width: '100%' }}>
                        {view.text}
                    </Alert>
                </Snackbar>
            </div>}
        </div>
    )
}