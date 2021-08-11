import Particles from "react-tsparticles"

import '../styles/Layout.css'

export function CrewLayout(props) {

    return (
        <>
            <div className="absolute h-full w-full">
                <Particles
                    id="particles"
                    options={{
                        fpsLimit: 60,
                        particles: {
                            color: {
                                value: "#ffffff",
                            },
                            collisions: {
                                enable: true,
                            },
                            move: {
                                direction: "none",
                                enable: true,
                                outMode: "bounce",
                                random: false,
                                speed: 0.1,
                                straight: false,
                            },
                            number: {
                                density: {
                                    enable: true,
                                    value_area: 800,
                                },
                                value: 80,
                            },
                            opacity: {
                                value: 0.7,
                            },
                            shape: {
                                type: "circle",
                            },
                            size: {
                                random: true,
                                value: 2,
                            },
                        },
                        detectRetina: true,
                    }}
                />
            </div>
            <div className="absolute z-10">
                {props.children}
            </div>
        </>
        )
    }