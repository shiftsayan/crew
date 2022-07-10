import { TextField, Button } from "@mui/material";
import { useState } from "react";
import { loginController } from "../util/controllers/login";


export function Home({ state, setState, view, setView }) {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")

    return (
        <div className="flex justify-center">
            <div className="bg-gray-100 rounded-2xl p-12">
                <Form>
                    <TextField label="Team Name" value={username} onChange={e => setUsername(e.target.value)} required />
                    <TextField label="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                    <div className="w-32">
                        <Button
                            variant="contained"
                            size="large"
                            color={view.accent}
                            onClick={() => loginController(username, password, state, setState, view, setView)}
                            disableElevation
                        >
                            Login
                        </Button>
                    </div>
                </Form>
            </div>
        </div>
    )
}

function Form({ children }) {
    return (
        <form className="w-72 mx-auto flex flex-col space-y-4">
            {children}
        </form>
    )
}
