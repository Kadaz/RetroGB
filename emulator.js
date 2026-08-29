```javascript
/*
    PS5 Game Boy / Game Boy Color frontend

    ROMs are loaded directly from:

        /roms/*.gb
        /roms/*.gbc

    No file picker is required.

    IMPORTANT:
    The actual Game Boy CPU/emulation core is expected to be provided
    by Atlantis. This file handles the PS5-friendly ROM loading frontend.
*/


const canvas = document.getElementById("screen");

const romList = document.getElementById("rom-list");

const statusElement = document.getElementById("status");


let currentROM = null;

let currentROMName = null;


/*
    ------------------------------------------------------------
    ROM DISCOVERY
    ------------------------------------------------------------
*/


async function findROMs() {

    romList.innerHTML = "";

    statusElement.textContent =
        "Scanning roms folder...";


    /*
        Try PHP first.

        This is the most reliable solution because a normal
        browser cannot list directory contents by itself.
    */

    try {

        const response =
            await fetch("roms.php", {
                cache: "no-store"
            });


        if (response.ok) {

            const roms =
                await response.json();

            if (Array.isArray(roms)) {

                displayROMs(roms);

                return;
            }
        }

    } catch (error) {

        console.log(
            "roms.php unavailable",
            error
        );

    }


    /*
        Fallback.

        If PHP is unavailable, try a predefined list.
        You can put filenames here manually.
    */

    const fallbackROMs = [

        "game.gb",
        "game.gbc",

        "tetris.gb",
        "pokemon.gbc",
        "zelda.gbc"

    ];


    displayROMs(fallbackROMs);

}


/*
    ------------------------------------------------------------
    DISPLAY ROM LIST
    ------------------------------------------------------------
*/


function displayROMs(roms) {

    romList.innerHTML = "";


    if (!roms.length) {

        romList.innerHTML = `
            <div>
                No .GB or .GBC ROMs found.
            </div>
        `;

        statusElement.textContent =
            "Put ROMs inside the roms folder.";

        return;
    }


    roms.forEach(
        filename => {

            const button =
                document.createElement("button");


            button.className =
                "rom-button";


            button.textContent =
                filename;


            button.addEventListener(
                "click",
                () => {

                    loadROM(filename);

                }
            );


            romList.appendChild(button);

        }
    );


    statusElement.textContent =
        roms.length +
        " ROM(s) found.";
}


/*
    ------------------------------------------------------------
    LOAD ROM
    ------------------------------------------------------------
*/


async function loadROM(filename) {

    try {

        statusElement.textContent =
            "Loading " + filename + "...";


        /*
            Security:
            only allow GB / GBC files.
        */

        if (!/\.(gb|gbc)$/i.test(filename)) {

            throw new Error(
                "Invalid ROM format."
            );
        }


        /*
            Prevent path traversal.
        */

        filename =
            filename
                .replaceAll("/", "")
                .replaceAll("\\", "");


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
                "ROM could not be loaded. HTTP " +
                response.status
            );

        }


        const buffer =
            await response.arrayBuffer();


        if (!buffer.byteLength) {

            throw new Error(
                "ROM file is empty."
            );

        }


        currentROM =
            new Uint8Array(buffer);


        currentROMName =
            filename;


        /*
            ------------------------------------------------
            ATLANTIS CONNECTION
            ------------------------------------------------

            Atlantis builds differ.

            We expose the ROM globally so the emulator core
            can consume it without requiring a browser
            file-selection dialog.
        */


        window.PS5_ROM =
            currentROM;


        window.PS5_ROM_NAME =
            currentROMName;


        /*
            Try known Atlantis-style APIs.
        */

        if (
            window.atlantis &&
            typeof window.atlantis.loadROM === "function"
        ) {

            await window.atlantis.loadROM(
                currentROM
            );

        }

        else if (
            window.Atlantis &&
            typeof window.Atlantis.loadROM === "function"
        ) {

            await window.Atlantis.loadROM(
                currentROM
            );

        }

        else if (
            typeof window.loadROM === "function" &&
            window.loadROM !== loadROM
        ) {

            await window.loadROM(
                currentROM
            );

        }

        else {

            /*
                The ROM is successfully downloaded.

                If your Atlantis build exposes its emulator
                through another function, this is the only
                integration point that needs changing.
            */

            console.log(
                "ROM loaded:",
                currentROMName,
                currentROM.length,
                "bytes"
            );

        }


        statusElement.textContent =
            "Running: " +
            currentROMName;


        document.title =
            currentROMName +
            " - Game Boy";


    } catch (error) {

        console.error(error);


        statusElement.textContent =
            "ERROR: " +
            error.message;

    }

}


/*
    ------------------------------------------------------------
    KEYBOARD
    ------------------------------------------------------------
*/


document.addEventListener(
    "keydown",
    event => {

        const allowed = [

            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",

            "z",
            "x",

            "Enter",
            "Shift"

        ];


        if (
            allowed.includes(event.key)
        ) {

            event.preventDefault();

        }

    }
);


document.addEventListener(
    "keyup",
    event => {

        const allowed = [

            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",

            "z",
            "x",

            "Enter",
            "Shift"

        ];


        if (
            allowed.includes(event.key)
        ) {

            event.preventDefault();

        }

    }
);


/*
    ------------------------------------------------------------
    TOUCH BUTTONS
    ------------------------------------------------------------
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
    ------------------------------------------------------------
    GAMEPAD
    ------------------------------------------------------------

    PS5 DualSense is exposed through the browser's
    Gamepad API when supported.
*/


const gamepadState =
    new Set();


function sendGamepadKey(
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
            Standard Gamepad mapping.

            Cross   = A
            Circle  = B
            Options = Start
            Create  = Select
        */


        sendGamepadKey(
            "x",
            !!pad.buttons[0]?.pressed
        );


        sendGamepadKey(
            "z",
            !!pad.buttons[1]?.pressed
        );


        sendGamepadKey(
            "Enter",
            !!pad.buttons[9]?.pressed
        );


        sendGamepadKey(
            "Shift",
            !!pad.buttons[8]?.pressed
        );


        sendGamepadKey(
            "ArrowUp",
            !!pad.buttons[12]?.pressed
        );


        sendGamepadKey(
            "ArrowDown",
            !!pad.buttons[13]?.pressed
        );


        sendGamepadKey(
            "ArrowLeft",
            !!pad.buttons[14]?.pressed
        );


        sendGamepadKey(
            "ArrowRight",
            !!pad.buttons[15]?.pressed
        );


        /*
            Analog stick.
        */

        const x =
            pad.axes[0] || 0;


        const y =
            pad.axes[1] || 0;


        sendGamepadKey(
            "ArrowLeft",
            x < -0.5
        );


        sendGamepadKey(
            "ArrowRight",
            x > 0.5
        );


        sendGamepadKey(
            "ArrowUp",
            y < -0.5
        );


        sendGamepadKey(
            "ArrowDown",
            y > 0.5
        );

    }


    requestAnimationFrame(
        pollGamepad
    );

}


/*
    Start Gamepad polling.
*/

requestAnimationFrame(
    pollGamepad
);


/*
    Start ROM discovery.
*/

findROMs();
```
