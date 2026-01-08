#!/bin/bash
ADB_PATH=~/Library/Android/sdk/platform-tools/adb
APK_PATH="./android/app/build/outputs/apk/release/app-release.apk"

if [ ! -f "$APK_PATH" ]; then
    echo "Error: APK not found at $APK_PATH"
    exit 1
fi

$ADB_PATH devices | grep -v "List" | grep "device$" | cut -f1 | while read -r device; do
    echo "Installing to $device..."
    $ADB_PATH -s "$device" install "$APK_PATH"
done