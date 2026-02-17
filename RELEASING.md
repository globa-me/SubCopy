# Releasing to Chrome Web Store

Releases are automated via `.github/workflows/release.yml`. Push a semver tag to trigger it:

```bash
git tag v1.1.0
git push origin v1.1.0
```

The workflow zips the extension files and uploads them to the Chrome Web Store via the `browser-actions/release-chrome-extension` action. Google's review still runs on their side after upload.

## Required GitHub repository secrets

| Secret | Where to get it |
|---|---|
| `EXTENSION_ID` | CWS Developer Dashboard URL (32-char ID) |
| `OAUTH_CLIENT_ID` | Google Cloud Console → Credentials → OAuth client |
| `OAUTH_CLIENT_SECRET` | Same OAuth client |
| `OAUTH_REFRESH_TOKEN` | Exchange an auth code via the OAuth flow (see below) |

## One-time OAuth setup

1. [Google Cloud Console](https://console.cloud.google.com) → new project → enable **Chrome Web Store API**
2. **Credentials → Create OAuth client ID → Desktop App** → save `CLIENT_ID` + `CLIENT_SECRET`
3. Open in browser, log in with the CWS publisher account, copy the code:
   ```
   https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=YOUR_CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob
   ```
4. Exchange the code for a refresh token:
   ```bash
   curl "https://accounts.google.com/o/oauth2/token" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "code=CODE_FROM_STEP_3" \
     -d "grant_type=authorization_code" \
     -d "redirect_uri=urn:ietf:wg:oauth:2.0:oob"
   # Copy refresh_token from the response
   ```
5. Add all four values as GitHub repository secrets (**Settings → Secrets and variables → Actions**).

## MV3 compliance

The extension meets all CWS requirements — no `eval()`, no remotely-hosted code, all logic self-contained. The `executeScript({ func: ... })` pattern is permitted as it serializes local code from the extension package.
