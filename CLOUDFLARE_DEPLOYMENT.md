# Cloudflare Deployment Guide for vectricSpin

`vectricSpin` is configured and ready for zero-downtime deployment on **Cloudflare Pages**.

---

## Configuration Summary

The project includes pre-configured settings for Cloudflare:
- **`wrangler.toml`**: Cloudflare configuration specifying project name `vectricspin` and build directory `dist`.
- **`public/_headers`**: Configures Cloudflare edge cache control for static assets and security headers.
- **`public/_redirects`**: Redirect routing for clean URL handling.
- **`package.json`**: Added `"deploy"` and `"deploy:cf"` scripts for 1-command deployments.

---

## Method 1: Git-Connected Cloudflare Pages (Recommended)

1. Push or import your repository to **GitHub** or **GitLab**.
2. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Compute (Workers & Pages)** → **Pages** → **Connect to Git**.
3. Select your repository and configure the build settings:
   - **Project name:** `vectricspin`
   - **Framework preset:** `Vite` (or None)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/`
4. Click **Save and Deploy**.
5. Every time you push a git commit, Cloudflare will automatically build and publish your updates globally across their edge network.

---

## Method 2: Direct Deployment via Wrangler CLI

You can also deploy directly from your terminal using Wrangler (already installed in `devDependencies`):

```bash
# 1. Build the production files and deploy in one command:
npm run deploy:cf

# Or if you already built with `npm run build`:
npm run deploy
```

On first run, Wrangler will prompt you to authenticate with your Cloudflare account in your browser:
```bash
npx wrangler login
```

---

## Connecting Your Custom Domain (`vectric.online`)

1. In the Cloudflare Dashboard, navigate to **Workers & Pages** → **vectricspin** → **Custom domains**.
2. Click **Set up a custom domain**.
3. Enter `vectric.online` (or `www.vectric.online`).
4. Follow the automatic DNS record verification (Cloudflare will automatically manage SSL certificates and HTTP/2/3 acceleration).
