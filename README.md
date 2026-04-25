# Home Route PWA

A personal commute decision helper for a multi-leg subway + Citi Bike commute in NYC.

## What it does

Shows live, ranked route options for getting home from Upper Manhattan to Brooklyn, using:

- **Live MTA subway arrivals** (4/5, 2/3, B/Q, 6, F)
- **Live Citi Bike availability** (e-bike counts, dock availability)
- **Walking time estimates** for each leg

## Routes

| # | Route | Via |
|---|-------|-----|
| 1 | F Train | Subway → transfer → F train → walk |
| 2 | 2/3 + Park | Subway → transfer → Citi Bike through park |
| 3 | B/Q + Parkside | Subway → transfer → Citi Bike via protected lane |

## Deploying to GitHub Pages

### Step 1: Create a GitHub repo

1. Go to https://github.com and sign in (or create a free account)
2. Click the **+** → **New repository**
3. Name it `commute-app` (or anything you like)
4. Leave it **Public** (required for free GitHub Pages)
5. Click **Create repository**

### Step 2: Upload files

**Option A: Drag and drop (easiest)**
1. Open your new repo on GitHub
2. Click **uploading an existing file**
3. Drag all files from this folder into the upload area:
   - `index.html`
   - `style.css`
   - `app.js`
   - `stations.js`
   - `manifest.json`
   - `icon-192.png`
   - `icon-512.png`
4. Click **Commit changes**

**Option B: GitHub CLI**
```bash
cd commute-app
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/commute-app.git
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. In your repo, go to **Settings** → **Pages**
2. Under **Source**, select **Deploy from a branch**
3. Choose **main** branch, **/ (root)** folder
4. Click **Save**

Your app will be live at:
**`https://YOUR_USERNAME.github.io/commute-app`**

> **Privacy note:** This repo is public. Avoid adding specific addresses or personal location details to any files.

(Takes 1-2 minutes to deploy the first time)

### Step 4: Add to your home screen

**On iPhone:**
1. Open the URL in Safari
2. Tap the Share button (box with arrow)
3. Tap **Add to Home Screen**
4. Tap **Add**

**On Android:**
1. Open the URL in Chrome
2. Tap the three-dot menu
3. Tap **Add to Home Screen** or **Install app**

---

## Customizing station names

If any Citi Bike station names don't match, edit `stations.js` — the names must match exactly what Citi Bike's API returns. You can look up exact names at https://gbfs.citibikenyc.com/gbfs/en/station_information.json

## Data sources

- Citi Bike GBFS: https://gbfs.citibikenyc.com/gbfs/en/
- MTA Subway JSON: https://api.wheresthefuckingtrain.com (community wrapper, no key required)
