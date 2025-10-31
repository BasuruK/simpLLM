# simpLLM - Electron Desktop App

A desktop application built with Next.js, Hero UI, and Electron.

## Technologies Used

- [Next.js 15](https://nextjs.org/docs/getting-started)
- [HeroUI v2](https://heroui.com/)
- [Electron](https://www.electronjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Tailwind Variants](https://tailwind-variants.org)
- [TypeScript](https://www.typescriptlang.org/)
- [Framer Motion](https://www.framer.com/motion/)
- [next-themes](https://github.com/pacocoursey/next-themes)

## How to Use

### Install dependencies

```bash
npm install
```

### Development Mode

Run the app in development mode (opens Electron window with hot reload):

```bash
npm run electron:dev
```

This will:
1. Start the Next.js development server on http://localhost:3000
2. Wait for the server to be ready
3. Launch the Electron app pointing to the dev server

### Build for Production

Build the app for your current platform:

```bash
npm run electron:build
```

Or build for specific platforms:

```bash
# Windows
npm run electron:build:win

# macOS
npm run electron:build:mac

# Linux
npm run electron:build:linux
```

The built application will be in the `dist` folder.

### Web Development (without Electron)

You can still run the Next.js app in the browser for development:

```bash
npm run dev
```

## Security Checks

Run the pre-release security checklist before shipping builds:

```bash
npm run security:check
```

The command is proxied through a small Node wrapper that sets the PowerShell execution policy to `RemoteSigned` for local runs, ensuring only trusted scripts execute. In CI environments (`CI=true`), the wrapper scopes the temporary `Bypass` policy to the spawned process so global machine policies remain intact.

## Project Structure

```
simpLLM/
├── app/                    # Next.js app directory
├── components/             # React components
├── electron/              # Electron main process files
│   ├── main.ts           # Main process entry point
│   ├── preload.ts        # Preload script for context isolation
│   └── tsconfig.json     # TypeScript config for Electron
├── public/                # Static assets
├── styles/                # Global styles
├── build/                 # Electron app icons
├── electron-builder.json  # Electron Builder configuration
└── next.config.js         # Next.js configuration (static export)
```

## Adding App Icons

Place your app icons in the `build` folder:
- **Windows**: `icon.ico` (256x256)
- **macOS**: `icon.icns`
- **Linux**: `icon.png` (512x512)

You can generate these from a source PNG using tools like [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder).

## Electron API

The app uses context isolation for security. To expose Node.js APIs to the renderer:

1. Edit `electron/preload.ts` to expose specific APIs
2. Access them in your React components via `window.electron`

Example in a React component:

```typescript
if (typeof window !== 'undefined' && window.electron) {
  console.log('Electron version:', window.electron.versions.electron);
  console.log('Platform:', window.electron.platform);
}
```

## Notes

- The app uses Next.js static export (`output: 'export'`) to work with Electron
- Images are set to `unoptimized: true` since Electron doesn't need Next.js image optimization
- In development, the app connects to the Next.js dev server
- In production, the app loads from the static `out` folder

## License

Licensed under the MIT license.
