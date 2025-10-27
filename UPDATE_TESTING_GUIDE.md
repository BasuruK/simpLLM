# Auto-Update Testing Guide

## How the Update Mechanism Works

Your app uses **electron-updater** with the following workflow:

1. **Check for Updates**: Checks GitHub Releases every 5 minutes + on app startup (after 3 seconds)
2. **GitHub Release Detection**: Looks for releases in `BasuruK/simpLLM` repository
3. **Download**: When update is found, user can click "Download Update" button
4. **Install**: After download, user clicks "Install and Restart" to apply update
5. **Auto-install on quit**: Update will also install when user quits the app

## Configuration Details

- **Provider**: GitHub Releases
- **Repository**: `BasuruK/simpLLM`
- **Private Repo**: Yes (requires `GH_TOKEN`)
- **Auto-download**: Disabled (user must confirm)
- **Auto-install on quit**: Enabled
- **Check Interval**: 5 minutes

## Testing Locally

### Option 1: Using dev-app-update.yml (Easiest for Development)

**electron-updater** supports a special file for testing updates without publishing to GitHub.

1. **Create a test update configuration**:
   
   Create `dev-app-update.yml` in your project root:

   ```yaml
   provider: github
   owner: BasuruK
   repo: simpLLM
   updaterCacheDirName: simpLLM-updater
   ```

2. **Build two versions**:

   ```powershell
   # Current version (0.0.2) - Install this first
   npm run electron:build:win
   
   # Update package.json version to 0.0.3
   # Then build again
   npm run electron:build:win
   ```

3. **Set up local update server**:

   Place the newer version files in a directory structure that mimics GitHub releases:
   
   ```
   local-updates/
   ├── latest.yml
   ├── simpLLM-0.0.3-x64.exe
   └── simpLLM-0.0.3-x64.nsis.7z
   ```

4. **Update dev-app-update.yml** to point to local server:

   ```yaml
   provider: generic
   url: http://localhost:8080
   ```

5. **Run a simple HTTP server**:

   ```powershell
   # In the local-updates directory
   npx http-server -p 8080 --cors
   ```

6. **Test**: Run the older installed version - it should detect the update!

---

### Option 2: Using GitHub Releases (Production-like Testing)

This is the **recommended approach** for realistic testing.

#### Step 1: Create a GitHub Release

1. **Update version in package.json**:
   ```json
   {
     "version": "0.0.3"
   }
   ```

2. **Build and publish to GitHub**:

   ```powershell
   # Set your GitHub token
   $env:GH_TOKEN="your_github_personal_access_token"
   
   # Build and publish
   npm run electron:publish:win
   ```

   This will:
   - Build the app
   - Create a draft release on GitHub
   - Upload the build artifacts

3. **Publish the release on GitHub**:
   - Go to: https://github.com/BasuruK/simpLLM/releases
   - Find the draft release
   - Edit and publish it

#### Step 2: Test the Update

1. **Install the older version** (0.0.2):
   - Build version 0.0.2: `npm run electron:build:win`
   - Install it: `dist\simpLLM-0.0.2-x64.exe`

2. **Run the installed app**:
   - The app will check for updates after 3 seconds
   - Check the logs: `%APPDATA%\simpLLM\logs\main.log`

3. **Expected behavior**:
   - After 3 seconds, you should see the update notification modal
   - Shows: "Version 0.0.3" with download button
   - Click "Download Update" → progress bar appears
   - When complete → "Install and Restart" button appears
   - Click it → app restarts with new version

---

### Option 3: Force Check for Updates (Manual Testing)

Add a menu item or IPC handler to trigger update checks manually:

**In `electron/main.ts`**, add:

```typescript
import { ipcMain } from 'electron';
import { checkForUpdates } from './auto-updater';

// Add this in your createWindow function or after
ipcMain.on('check-for-updates', () => {
  checkForUpdates();
});
```

**In your renderer** (e.g., `app/page.tsx`), add a test button:

```typescript
// Add this button somewhere in your UI
<Button
  onClick={() => {
    if (window.electron?.updater) {
      // Trigger manual update check
      checkForUpdates();
    }
  }}
>
  Check for Updates
</Button>
```

---

## Testing Checklist

### Before Testing

- [ ] GitHub Personal Access Token created with `repo` scope
- [ ] Token set as environment variable: `$env:GH_TOKEN="your_token"`
- [ ] Repository is private and accessible with the token
- [ ] Two versions ready: current (0.0.2) and newer (0.0.3)

### Test Scenarios

#### 1. Fresh Install
- [ ] Install version 0.0.2
- [ ] Run the app
- [ ] Wait 3 seconds
- [ ] Update notification modal appears
- [ ] Shows correct version (0.0.3)

#### 2. Download Flow
- [ ] Click "Download Update" button
- [ ] Progress bar appears and updates
- [ ] Download speed shown
- [ ] When complete, "Install and Restart" button appears

#### 3. Install Flow
- [ ] Click "Install and Restart"
- [ ] App closes
- [ ] App restarts automatically
- [ ] Help → About shows version 0.0.3

#### 4. Background Checks
- [ ] Leave app running for 5+ minutes
- [ ] Publish a new release (0.0.4)
- [ ] After ~5 minutes, update notification appears

#### 5. Error Handling
- [ ] Disconnect internet
- [ ] Wait for update check
- [ ] Error message displayed in modal
- [ ] Reconnect internet
- [ ] Can retry download

---

## Viewing Logs

**Logs are saved to**:
```
Windows: %APPDATA%\simpLLM\logs\main.log
Mac:     ~/Library/Logs/simpLLM/main.log
Linux:   ~/.config/simpLLM/logs/main.log
```

**What to look for**:
```
[info] Checking for updates...
[info] Update available: { version: '0.0.3', ... }
[info] Download speed: 1048576 - Downloaded 45%
[info] Update downloaded: { version: '0.0.3' }
```

**Errors**:
```
[error] Error in auto-updater: Error: Cannot find latest.yml
[error] Failed to check for updates: HttpError: 404 Not Found
```

---

## Quick Test Using Staging Release

For the fastest test cycle:

1. **Create a test release tag**:
   ```powershell
   git tag v0.0.3-test
   git push origin v0.0.3-test
   ```

2. **Update package.json** to `0.0.3-test`

3. **Publish**:
   ```powershell
   $env:GH_TOKEN="your_token"
   npm run electron:publish:win
   ```

4. **Install 0.0.2** and test

5. **Clean up** after testing:
   ```powershell
   git tag -d v0.0.3-test
   git push origin :refs/tags/v0.0.3-test
   # Delete the release on GitHub
   ```

---

## Troubleshooting

### "Cannot find latest.yml"
- **Cause**: No published releases found
- **Fix**: Publish at least one release to GitHub

### "404 Not Found"
- **Cause**: Token doesn't have access to private repo
- **Fix**: Regenerate token with `repo` scope

### "Update not available"
- **Cause**: Installed version is same or newer
- **Fix**: Ensure `package.json` version is older than release version

### Progress bar stuck at 0%
- **Cause**: Download might be slow or stalled
- **Fix**: Check logs, verify internet connection, check GitHub release has correct files

### App doesn't restart after install
- **Cause**: `autoInstallOnAppQuit` might be disabled
- **Fix**: Already enabled in your config, check logs for errors

---

## Production Deployment

When ready to deploy:

1. **Bump version**: Update `package.json` → `0.1.0`
2. **Update changelog**: Document changes in release notes
3. **Build and publish**:
   ```powershell
   $env:GH_TOKEN="your_token"
   npm run electron:publish:win
   ```
4. **Publish release**: Go to GitHub, edit draft, publish release
5. **Notify users**: Existing users will auto-detect on next app launch

---

## Current Implementation Status

✅ **Configured**:
- electron-updater setup
- GitHub releases provider
- Private repository support
- Update notification UI component
- Download progress tracking
- Production-only update checks
- Logging to file

✅ **Features**:
- User confirmation before download
- Visual download progress
- Auto-install on app quit
- Periodic update checks (5 min)
- Startup update check (3 sec delay)
- Error handling and display

🔧 **Recommended Additions**:
- [ ] Manual "Check for Updates" menu item
- [ ] Release notes display in modal
- [ ] "Skip this version" option
- [ ] Update notification badge/icon
- [ ] Beta/Alpha channel support

---

## Developer Notes

**Auto-updater only runs in production** because of this check:
```typescript
if (process.env.NODE_ENV !== 'development') {
  autoUpdater.checkForUpdates();
}
```

**To test during development**, you need to:
1. Build the production version
2. Install it (not run via `npm run electron:dev`)
3. Run the installed .exe

**Or temporarily remove the development check** in `electron/auto-updater.ts` for testing.
