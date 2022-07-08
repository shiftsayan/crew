import classnames from "classnames"

import { Snackbar, Alert } from "@mui/material"


export function Layout({ children, view }) {
    return (
        <div className="h-screen w-screen bg-[length:400%_400%] bg-gradient-to-br from-indigo-500 to-pink-500 animate-gradient">
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