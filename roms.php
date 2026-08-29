```php
<?php

header(
    "Content-Type: application/json; charset=utf-8"
);


$romDirectory =
    __DIR__ .
    DIRECTORY_SEPARATOR .
    "roms";


$roms = [];


if (
    is_dir($romDirectory)
) {

    $files =
        scandir($romDirectory);


    foreach (
        $files as $file
    ) {

        if (
            $file === "." ||
            $file === ".."
        ) {

            continue;

        }


        $path =
            $romDirectory .
            DIRECTORY_SEPARATOR .
            $file;


        if (
            is_file($path) &&
            preg_match(
                '/\.(gb|gbc)$/i',
                $file
            )
        ) {

            $roms[] =
                $file;

        }

    }

}


natcasesort($roms);


$roms =
    array_values($roms);


echo json_encode(
    $roms,
    JSON_UNESCAPED_UNICODE |
    JSON_UNESCAPED_SLASHES
);

?>
```
