#!/bin/bash
EMULATOR_PATH=~/Library/Android/sdk/emulator/emulator
$EMULATOR_PATH -list-avds | while read -r avd; do
    echo "Starting $avd..."
    $EMULATOR_PATH -avd "$avd" &
done
