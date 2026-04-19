# Analytics dashboard React example

A runnable Next.js dashboard example showing how Askable can annotate complex product surfaces like metrics grids, charts, tables, and sidebars.

## Local development

```bash
npm ci
npm run dev
```

To verify the production build locally:

```bash
npm run build
npm run start
```

## Vercel deployment

This example is deployed by GitHub Actions through `.github/workflows/deploy_analytics_dashboard_react.yml`.

### What the workflow does

- Pull requests touching `examples/analytics-dashboard-react/**` create a **Vercel preview deployment**.
- The workflow posts the preview URL back onto the pull request.
- Pushes to `main` that modify this example deploy the same app to the **production Vercel project**.
- Forked pull requests do **not** get preview deployments because GitHub does not expose repository secrets to forked PR workflows.

### Required GitHub secrets

Configure these repository secrets before relying on the workflow:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_ANALYTICS_DASHBOARD_REACT`

### Required Vercel project setup

Create a dedicated Vercel project for this example and configure it with:

- **Root Directory:** `examples/analytics-dashboard-react`
- **Framework Preset:** Next.js
- **Automatic Git deployments:** disabled

The workflow uses the Vercel CLI (`vercel pull`, `vercel build`, `vercel deploy --prebuilt`) so deploys stay CI-controlled and deterministic.

### Notes

- The example currently depends on the published `@askable-ui/react` package version from npm.
- If you need Vercel previews to validate unpublished Askable package changes as well, pair this workflow with preview-package wiring in a follow-up change.
