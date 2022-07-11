export function loginController(username, password, state, setState, view, setView) {
    setState({
        ...state,
        auth: true,
        crew: username,
    })
    setView({
        ...view,
        toast: {
            style: "success",
            text: "Logged In",
        }
    })
}