export function loginController(username, password, state, setState, view, setView) {
    // if (username !== _username) {
    //     setView({
    //         ...view,
    //         toast: {
    //             style: "error",
    //             text: "Invalid Username",
    //         }
    //     })
    //     return;
    // }
    // if (password !== _password) {
    //     setView({
    //         ...view,
    //         toast: {
    //             style: "error",
    //             text: "Invalid Password",
    //         }
    //     });
    //     return;
    // }
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