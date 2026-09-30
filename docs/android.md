# Android app

The Android app is a [Capacitor](https://capacitorjs.com) shell around the live web app — same
tooling as glentify (Capacitor 8, committed `android/` project, debug APK from a script), but
**no static export**: the WebView loads `https://organiser-aptaliko.vercel.app`, so every web
deploy updates the app without reinstalling. Organiser's pages render on the server, so the app
needs a connection; without one it shows a friendly offline page (`native-shell/offline.html`).

What the shell adds over the website:

- An app icon and splash screen; opens full screen, Android back button navigates back.
- **App Links** — scanning a box's QR label (`/a/CODE`) or tapping an invite link (`/invite/…`)
  opens the app instead of the browser (after the one-time setup below).
- The phone's native **share sheet** for invite links (`@capacitor/share`).
- "Take photo" opens the camera directly (Capacitor's file chooser; no camera permission needed).

Printing labels isn't possible inside the app's WebView; the labels page says to open
`/labels` in a browser instead.

## Build the APK (on your Mac)

Needs what glentify needs: a **JDK 21** and the **Android SDK** (installed by Android Studio;
found through `ANDROID_HOME` or `android/local.properties`).

```bash
npm install
npm run build:android
# → android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk   # or copy the file to the phone
```

The APK is signed with your machine's debug key: fine for installing on your own phones (allow
"install unknown apps"), not for the Play Store.

To build for another deployment: `ORGANISER_URL=https://other.vercel.app npm run build:android`
(sets both the site the app loads and the App Links host).

You only need to rebuild the APK when something in the shell changes (icon, name, plugins,
Capacitor version) — not for app features, which come from the website.

## App Links: make QR labels open the app (one time)

Android only opens `https://organiser-aptaliko.vercel.app/a/…` links in the app once the site
vouches for the app's signing key, via `/.well-known/assetlinks.json`
(`src/app/api/assetlinks/route.ts`, fed by the `ANDROID_CERT_SHA256` environment variable).

1. Print the SHA-256 fingerprint of the key that signs your APK (the debug key on your Mac):

   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey \
     -storepass android -keypass android | grep SHA256
   ```

   It looks like `SHA256: 1A:2B:…:9F` (32 pairs). A fingerprint is public information, not a secret.
2. Vercel → organiser → Settings → Environment Variables → add `ANDROID_CERT_SHA256` with that
   value (several keys, e.g. from two computers: separate them with commas). Redeploy.
3. Check `https://organiser-aptaliko.vercel.app/.well-known/assetlinks.json` shows the fingerprint.
4. Reinstall the app (Android verifies links at install time). Check with
   `adb shell pm get-app-links com.organiser.app` — the host should say `verified`.
   Or on the phone: Settings → Apps → Organiser → Open by default → the link is listed as verified.

Until then everything else works; label scans just open in the browser.

## Play Store (later)

A store release needs a release keystore (`signingConfig` in `android/app/build.gradle`), its
fingerprint added to `ANDROID_CERT_SHA256`, and `./gradlew bundleRelease`. Note that Capacitor
documents `server.url` as meant for development, and Google Play may reject apps that are only a
website in a WebView — a store release would probably need the offline/static approach glentify
uses. For installing on your own and your family's phones, the debug APK is enough.
