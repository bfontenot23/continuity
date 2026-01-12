# Deployment Guide - Continuity

This guide covers deploying the Continuity app to Firebase Hosting.

## Prerequisites

1. **Firebase CLI** - Already installed (`/opt/homebrew/bin/firebase`)
2. **Firebase Project** - Must be initialized in the project (already done)
3. **Node.js** - v18+ (already installed)

## Pre-Deployment Checklist

- [ ] Code is tested locally with `npm run dev`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] Project builds successfully: `npm run build`
- [ ] All changes are committed to git

## Deployment Steps

### 1. Build the Project

```bash
npm run build
```

This compiles TypeScript and creates optimized files in `public/dist/`

### 2. Test the Build Locally

To preview the production build locally before deploying:

```bash
npm run preview
```

This serves the `public/dist/` folder at http://localhost:4173/

### 3. Deploy to Firebase

```bash
firebase deploy
```

This will:
- Upload the contents of `public/dist/` to Firebase Hosting
- Make your app live at the configured Firebase URL
- Update any active users with the latest version

### 4. Verify Deployment

Visit your Firebase hosting URL (found in the deploy output) to verify:
- App loads without errors
- Can create new projects
- Can import .cty files
- UI is responsive on different screen sizes

## Firebase Project Details

- **Project Directory**: `/Users/beaufontenot/continuity`
- **Firebase Config**: `firebase.json`
- **Hosting Directory**: `public/dist/` (built files only)
- **Entry Point**: `public/dist/index.html`

## Environment Variables

Currently, the app doesn't use Firebase services (Auth, Firestore, etc.). All data is stored locally:
- Browser Local Storage (auto-save)
- .cty files (manual export/import)

If you add Firebase services in the future:
1. Update `firebase.json` with service configuration
2. Create `.env` files for different environments
3. Update deployment scripts as needed

## Rollback Strategy

If deployment has issues:

```bash
# Revert to previous version
firebase hosting:rollback
```

Or redeploy the previous git commit:

```bash
git checkout <commit-hash>
npm run build
firebase deploy
```

## Deployment History

To view deployment history:

```bash
firebase hosting:list
```

## Troubleshooting

### Build Fails

```bash
# Clean and rebuild
rm -rf public/dist
npm install
npm run build
```

### Deploy Fails

```bash
# Check Firebase login status
firebase login:status

# Re-authenticate if needed
firebase login

# Check project ID
firebase projects:list
```

### App Not Updating

1. Hard refresh browser (Cmd+Shift+R on Mac)
2. Clear browser cache
3. Check that build output is in `public/dist/`
4. Verify no old tabs are loading cached version

## Monitoring

After deployment:
- Check Firebase Console at https://console.firebase.google.com/
- View hosting analytics and deployment history
- Monitor app performance and user traffic

## CI/CD Integration (Optional)

For automatic deployments on git push:

1. Connect GitHub repository to Firebase Console
2. Set up automatic deploys from specific branch
3. Builds and deploys automatically on push

## Local Development vs Production

| Aspect | Development | Production |
|--------|-------------|-----------|
| Command | `npm run dev` | `npm run build` + `firebase deploy` |
| Server | Vite dev server | Firebase Hosting |
| Port | 3000 | Your Firebase URL |
| Hot reload | Yes | No (requires refresh) |
| File watching | Yes | No |
| TypeScript | Via esbuild | Pre-compiled |

## Development Tips

- Keep `npm run dev` running while developing
- Use browser dev tools to debug issues
- Test on multiple browsers before deployment
- Always build and test locally before deploying

## Support Files

- Build output: `public/dist/` (auto-generated)
- Source files: `src/` (TypeScript)
- Config files: `firebase.json`, `vite.config.ts`, `tsconfig.json`
