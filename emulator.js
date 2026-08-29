```javascript
import gameboy from "https://cdn.skypack.dev/gameboy@0.2.0";


const canvas =
    document.getElementById("screen");


const romList =
    document.getElementById("rom-list");


const status =
    document.getElementById("status");


let emulator = null;


/*
    ============================================================
    ROM LIST
    ============================================================
*/


async function loadROMList() {

    try {

        status.textContent =
            "Scanning ROM folder...";


        const response =
            await fetch(
                "roms.php",
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "roms.php returned HTTP " +
                response.status
            );

        }


        const roms =
            await response.json();


        romList.innerHTML = "";


        if (
            !Array.isArray(roms) ||
            roms.length === 0
        ) {

            romList.innerHTML =
                "<div class='empty'>" +
                "No .GB or .GBC ROMs found." +
                "</div>";


            status.textContent =
                "Put your ROMs inside the roms folder.";


            return;

        }


        roms.forEach(
            filename => {

                const button =
                    document.createElement(
                        "button"
                    );


                button.className =
                    "rom-button";


                button.textContent =
                    filename;


                button.addEventListener(
                    "click",
                    () => {

                        startROM(filename);

                    }
                );


                romList.appendChild(
                    button
                );

            }
        );


        status.textContent =
            roms.length +
            " ROM(s) found.";

    }

    catch (error) {

        console.error(error);


        romList.innerHTML =
            "<div class='error'>" +
            "Could not read roms folder." +
            "</div>";


        status.textContent =
            "ERROR: " +
            error.message;

    }

}


/*
    ============================================================
    LOAD ROM
    ============================================================
*/


async function startROM(filename) {

    try {

        status.textContent =
            "Loading " +
            filename +
            "...";


        /*
            Stop previous emulator.
        */

        if (emulator) {

            try {

                if (
                    typeof emulator.stop ===
                    "function"
                ) {

                    emulator.stop();

                }

            }

            catch (e) {

                console.log(
                    "Previous emulator stop:",
                    e
                );

            }


            emulator = null;

        }


        /*
            Load ROM directly from:

                roms/FILENAME
        */


        const response =
            await fetch(
                "roms/" +
                encodeURIComponent(filename),
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Could not load ROM. HTTP " +
                response.status
            );

        }


        const rom =
            await response.arrayBuffer();


        if (
            !rom ||
            rom.byteLength === 0
        ) {

            throw new Error(
                "ROM is empty."
            );

        }


        /*
            Convert to Uint8Array.

            The gameboy package accepts
            ArrayBuffer / typed ROM data.
        */

        const romData =
            new Uint8Array(rom);


        /*
            Create emulator.

            GameBoy-Online based emulator.
        */

        emulator =
            gameboy(
                canvas,
                romData,
                {

                    bootRom: false,

                    gbBootRom: false,

                    prioritizeGb: false,

                    interval: 4,

                    imageSmoothing: false,

                    colorizeGb: true,

                    typedArrays: true,

                    sound: true

                }
            );


        status.textContent =
            "Running: " +
            filename;


        document.title =
            filename +
            " - RetroGB";


        /*
            Make sure the emulator has focus.
        */

        canvas.focus();


    }

    catch (error) {

        console.error(
            "ROM ERROR:",
            error
        );


        status.textContent =
            "ERROR: " +
            error.message;

    }

}


/*
    ============================================================
    KEYBOARD
    ============================================================
*/


function keyboardEvent(
    type,
    key
) {

    window.dispatchEvent(
        new KeyboardEvent(
            type,
            {
                key: key,
                code: key,
                bubbles: true
            }
        )
    );

}


document.addEventListener(
    "keydown",
    event => {

        const keys = [

            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",

            "x",
            "z",

            "Enter",
            "Shift"

        ];


        if (
            keys.includes(event.key)
        ) {

            event.preventDefault();

        }

    }
);


document.addEventListener(
    "keyup",
    event => {

        const keys = [

            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",

            "x",
            "z",

            "Enter",
            "Shift"

        ];


        if (
            keys.includes(event.key)
        ) {

            event.preventDefault();

        }

    }
);


/*
    ============================================================
    ON-SCREEN BUTTONS
    ============================================================
*/


document
    .querySelectorAll(
        "[data-key]"
    )
    .forEach(
        button => {

            const key =
                button.dataset.key;


            button.addEventListener(
                "pointerdown",
                event => {

                    event.preventDefault();

                    keyboardEvent(
                        "keydown",
                        key
                    );

                }
            );


            button.addEventListener(
                "pointerup",
                event => {

                    event.preventDefault();

                    keyboardEvent(
                        "keyup",
                        key
                    );

                }
            );


            button.addEventListener(
                "pointercancel",
                event => {

                    event.preventDefault();

                    keyboardEvent(
                        "keyup",
                        key
                    );

                }
            );


            button.addEventListener(
                "pointerleave",
                event => {

                    event.preventDefault();

                    keyboardEvent(
                        "keyup",
                        key
                    );

                }
            );

        }
    );


/*
    ============================================================
    PS5 / DUALSENSE GAMEPAD
    ============================================================
*/


const gamepadKeys =
    new Set();


function setGamepadKey(
    key,
    pressed
) {

    if (pressed) {

        if (
            !gamepadKeys.has(key)
        ) {

            gamepadKeys.add(key);


            keyboardEvent(
                "keydown",
                key
            );

        }

    }

    else {

        if (
            gamepadKeys.has(key)
        ) {

            gamepadKeys.delete(key);


            keyboardEvent(
                "keyup",
                key
            );

        }

    }

}


function pollGamepad() {

    if (
        !navigator.getGamepads
    ) {

        requestAnimationFrame(
            pollGamepad
        );

        return;

    }


    const pads =
        navigator.getGamepads();


    let pad = null;


    for (
        let i = 0;
        i < pads.length;
        i++
    ) {

        if (pads[i]) {

            pad = pads[i];

            break;

        }

    }


    if (pad) {

        /*
            Standard DualSense mapping:

            Cross   = A
            Circle  = B
            Options = Start
            Create  = Select
        */


        setGamepadKey(
            "x",
            !!pad.buttons[0]?.pressed
        );


        setGamepadKey(
            "z",
            !!pad.buttons[1]?.pressed
        );


        setGamepadKey(
            "Enter",
            !!pad.buttons[9]?.pressed
        );


        setGamepadKey(
            "Shift",
            !!pad.buttons[8]?.pressed
        );


        /*
            D-Pad
        */


        setGamepadKey(
            "ArrowUp",
            !!pad.buttons[12]?.pressed
        );


        setGamepadKey(
            "ArrowDown",
            !!pad.buttons[13]?.pressed
        );


        setGamepadKey(
            "ArrowLeft",
            !!pad.buttons[14]?.pressed
        );


        setGamepadKey(
            "ArrowRight",
            !!pad.buttons[15]?.pressed
        );


        /*
            Left analog stick.
        */


        const axisX =
            pad.axes[0] || 0;


        const axisY =
            pad.axes[1] || 0;


        setGamepadKey(
            "ArrowLeft",
            axisX < -0.5
        );


        setGamepadKey(
            "ArrowRight",
            axisX > 0.5
        );


        setGamepadKey(
            "ArrowUp",
            axisY < -0.5
        );


        setGamepadKey(
            "ArrowDown",
            axisY > 0.5
        );

    }


    requestAnimationFrame(
        pollGamepad
    );

}


requestAnimationFrame(
    pollGamepad
);


/*
    ============================================================
    START
    ============================================================
*/


loadROMList();
```
