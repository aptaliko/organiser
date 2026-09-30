#!/usr/bin/env bash
#
# Builds the installable Android debug APK (see docs/android.md).
#
#   npm run build:android
#   ORGANISER_URL=https://other.vercel.app npm run build:android   # a different deployment
#
# The app is a Capacitor shell that loads the live site (capacitor.config.ts), so there's no
# web build here — unlike glentify's build:mobile there is no static export. Needs a JDK 21 and
# the Android SDK (Android Studio installs it; ANDROID_HOME or android/local.properties).
set -euo pipefail
cd "$(dirname "$0")/.."

# Gradle finds the Android SDK through android/local.properties (not committed — it's
# machine-specific) or ANDROID_HOME. Write local.properties on first run when we can find it.
if [ ! -f android/local.properties ]; then
  SDK_DIR="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
  if [ -z "$SDK_DIR" ] && [ -d "$HOME/Library/Android/sdk" ]; then SDK_DIR="$HOME/Library/Android/sdk"; fi
  if [ -z "$SDK_DIR" ] && [ -d "$HOME/Android/Sdk" ]; then SDK_DIR="$HOME/Android/Sdk"; fi
  if [ -z "$SDK_DIR" ]; then
    echo "build-android: Android SDK not found. Install Android Studio (it installs the SDK), or set" >&2
    echo "build-android: ANDROID_HOME, or create android/local.properties with: sdk.dir=/path/to/sdk" >&2
    exit 1
  fi
  echo "sdk.dir=$SDK_DIR" > android/local.properties
  echo "▶ Using Android SDK at $SDK_DIR (saved to android/local.properties)"
fi

echo "▶ Syncing Capacitor (config, plugins) into android/ — site: ${ORGANISER_URL:-https://organiser-aptaliko.vercel.app}"
npx cap sync android

# @capacitor/android 8.x needs Java 21. Like glentify, point Gradle at a JDK 21 for just this
# invocation instead of touching a machine-wide ~/.gradle/gradle.properties pin.
JAVA21_HOME="$(/usr/libexec/java_home -v 21 2>/dev/null || true)"
if [ -z "$JAVA21_HOME" ] && [ -n "${JAVA_HOME:-}" ] && "$JAVA_HOME/bin/java" -version 2>&1 | grep -q '"21'; then
  JAVA21_HOME="$JAVA_HOME"
fi
if [ -z "$JAVA21_HOME" ]; then
  echo "build-android: no JDK 21 found (macOS: /usr/libexec/java_home -v 21, or set JAVA_HOME)." >&2
  echo "build-android: android/ is synced; install a JDK 21 and rerun, or build manually:" >&2
  echo "build-android:   cd android && GRADLE_OPTS=\"-Dorg.gradle.java.home=/path/to/jdk21\" ./gradlew assembleDebug" >&2
  exit 1
fi

(cd android && GRADLE_OPTS="-Dorg.gradle.java.home=$JAVA21_HOME" ./gradlew assembleDebug)
APK=android/app/build/outputs/apk/debug/app-debug.apk
echo
echo "✓ Debug APK: $APK"
echo "  Install: adb install -r $APK   (or copy it to the phone and open it)"
echo "  For QR labels to open the app, see docs/android.md → App Links (one-time setup)."
