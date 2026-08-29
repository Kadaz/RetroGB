```javascript
const canvas = document.getElementById("screen");
const romList = document.getElementById("rom-list");
const statusElement = document.getElementById("status");

let currentROM = null;
let currentROMName = null;


/*
============================================================
ROM LIST
============================================================
*/

async function findROMs() {

    romList.innerHTML = "";

    statusElement.textContent = "Loading ROM list...";

    try {

        const response = await fetch(
            "roms.json?v=" + Date.now()
        );

        if (!response.ok) {

            throw new Error(
                "roms.json HTTP " + response.status
            );

        }

        const roms = await response.json();

        if (!Array.isArray(roms)) {

            throw new Error(
                "roms.json is not a valid list"
            );

        }

        displayROMs(roms);

    }

    catch (error) {

        console.error(error);

        romList.innerHTML =
            "<div class='error'>" +
            "Could not load roms.json" +
            "</div>";

        statusElement.textContent =
            "ERROR: " + error.message;

    }

}


/*
============================================================
DISPLAY ROMS
============================================================
*/

function displayROMs(roms) {

    romList.innerHTML = "";

    if (roms.length === 0) {

        romList.innerHTML =
            "<div class='empty'>" +
            "No ROMs configured." +
            "</div>";

        statusElement.textContent =
            "Add ROM filenames to roms.json.";

        return;

    }


    roms.forEach(filename => {

        if (!/\.(gb|gbc)$/i.test(filename)) {
            return;
        }


        const button =
            document.createElement("button");


        button.className =
            "rom-button";


        button.textContent =
            filename;


        button.addEventListener(
            "click",
            () => loadROM(filename)
        );


        romList.appendChild(button);

    });


    statusElement.textContent =
        roms.length + " ROM(s) available.";

}


/*
============================================================
LOAD ROM
============================================================
*/

async function loadROM(filename) {

    try {

        statusElement.textContent =
            "Loading " + filename + "...";


        if (!/\.(gb|gbc)$/i.test(filename)) {

            throw new Error(
                "Unsupported ROM format"
            );

        }


        const url =
            "roms/" +
            encodeURIComponent(filename);


        const response =
            await fetch(
                url,
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "ROM HTTP " +
                response.status
            );

        }


        const buffer =
            await response.arrayBuffer();


        if (!buffer.byteLength) {

            throw new Error(
                "ROM is empty"
            );

        }


        currentROM =
            new Uint8Array(buffer);


        currentROMName =
            filename;


        /*
        --------------------------------------------------------
        IMPORTANT

        The ROM is now actually inside the browser.

        Expose it globally so the emulator can use it.
        --------------------------------------------------------
        */

        window.PS5_ROM =
            currentROM;


        window.PS5_ROM_NAME =
            currentROMName;


        console.log(
            "ROM loaded:",
            currentROMName,
            currentROM.length,
            "bytes"
        );


        /*
        --------------------------------------------------------
        RetroGB emulator hook
        --------------------------------------------------------
        */

        if (
            typeof window.startEmulatorWithROM ===
            "function"
        ) {

            await window.startEmulatorWithROM(
                currentROM
            );

        }

        else {

            statusElement.textContent =
                "ROM loaded: " +
                currentROMName;

        }

    }

    catch (error) {

        console.error(error);

        statusElement.textContent =
            "ERROR: " +
            error.message;

    }

}


/*
============================================================
KEYBOARD
============================================================
*/

const allowedKeys = [

    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",

    "x",
    "z",

    "Enter",
    "Shift"

];


document.addEventListener(
    "keydown",
    event => {

        if (
            allowedKeys.includes(event.key)
        ) {

            event.preventDefault();

        }

    }
);


document.addEventListener(
    "keyup",
    event => {

        if (
            allowedKeys.includes(event.key)
        ) {

            event.preventDefault();

        }

    }
);


/*
============================================================
ON-SCREEN CONTROLS
============================================================
*/

document
    .querySelectorAll("[data-key]")
    .forEach(button => {

        const key =
            button.dataset.key;


        button.addEventListener(
            "pointerdown",
            event => {

                event.preventDefault();

                window.dispatchEvent(
                    new KeyboardEvent(
                        "keydown",
                        {
                            key: key,
                            bubbles: true
                        }
                    )
                );

            }
        );


        button.addEventListener(
            "pointerup",
            event => {

                event.preventDefault();

                window.dispatchEvent(
                    new KeyboardEvent(
                        "keyup",
                        {
                            key: key,
                            bubbles: true
                        }
                    )
                );

            }
        );


        button.addEventListener(
            "pointercancel",
            event => {

                event.preventDefault();

                window.dispatchEvent(
                    new KeyboardEvent(
                        "keyup",
                        {
                            key: key,
                            bubbles: true
                        }
                    )
                );

            }
        );

    });


/*
============================================================
PS5 DUALSENSE GAMEPAD
============================================================
*/

const gamepadState =
    new Set();


function gamepadKey(
    key,
    pressed
) {

    if (pressed) {

        if (!gamepadState.has(key)) {

            gamepadState.add(key);

            window.dispatchEvent(
                new KeyboardEvent(
                    "keydown",
                    {
                        key: key,
                        bubbles: true
                    }
                )
            );

        }

    }

    else {

        if (gamepadState.has(key)) {

            gamepadState.delete(key);

            window.dispatchEvent(
                new KeyboardEvent(
                    "keyup",
                    {
                        key: key,
                        bubbles: true
                    }
                )
            );

        }

    }

}


function pollGamepad() {

    if (!navigator.getGamepads) {

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
        DualSense standard mapping
        */

        gamepadKey(
            "x",
            !!pad.buttons[0]?.pressed
        );


        gamepadKey(
            "z",
            !!pad.buttons[1]?.pressed
        );


        gamepadKey(
            "Enter",
            !!pad.buttons[9]?.pressed
        );


        gamepadKey(
            "Shift",
            !!pad.buttons[8]?.pressed
        );


        gamepadKey(
            "ArrowUp",
            !!pad.buttons[12]?.pressed
        );


        gamepadKey(
            "ArrowDown",
            !!pad.buttons[13]?.pressed
        );


        gamepadKey(
            "ArrowLeft",
            !!pad.buttons[14]?.pressed
        );


        gamepadKey(
            "ArrowRight",
            !!pad.buttons[15]?.pressed
        );


        /*
        Analog stick
        */

        const x =
            pad.axes[0] || 0;

        const y =
            pad.axes[1] || 0;


        gamepadKey(
            "ArrowLeft",
            x < -0.5
        );


        gamepadKey(
            "ArrowRight",
            x > 0.5
        );


        gamepadKey(
            "ArrowUp",
            y < -0.5
        );


        gamepadKey(
            "ArrowDown",
            y > 0.5
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

findROMs();
```
