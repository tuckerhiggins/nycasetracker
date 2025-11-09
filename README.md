# NYC Case Tracker

A lightweight, browser-based tracker for CPL § 30.30 (speedy trial) clocks and next court dates in New York criminal cases.  
Live version: **[nycasetracker.com](https://nycasetracker.com)**

---

## 🌐 Overview

NYC Case Tracker helps users monitor 30.30 clocks, excluded time, and statutory deadlines for multiple cases.  
The app runs entirely client-side — no login, no backend, and no external data transmission.

---

## ⚙️ Features

- **Full CPL § 30.30 Clock Calculation**
  - Felony = 6 calendar months (per GCL § 30)  
  - Class A Misd = 90 days  
  - Class B Misd = 60 days  
  - Violation = 30 days  
  - Weekends and NY court holidays automatically adjusted (per GCL § 25-a)

- **Case Management**
  - Track multiple cases in local browser storage  
  - Fields: client name, docket #, charge level, start date, NCD, part, ADA, contact info  
  - Flags: clock stopped, warrant, closed, COC filed (date auto-stops clock)  
  - Add dated notes per case

- **Advanced Excludable Time**
  - Separate “definitely” and “arguably” excludable days  
  - Built-in calculator for excludable windows  
  - Option to include or exclude arguable days in totals

- **Visualization & Sorting**
  - Color-coded NCDs (red / yellow / green)  
  - “Busy day” summary (automatically detects days with multiple cases or parts)  
  - Sort by client or NCD

- **Quick 30.30 Calculator**
  - Compute deadlines without saving a case  
  - Displays weekday and applies weekend / holiday adjustments

- **Local Storage + Encrypted Backups**
  - All data remains in your browser’s `localStorage`
  - Optional AES-encrypted export/import for manual backup or transfer  
  - No data is ever transmitted to any server

---

## 🔐 Privacy and Data Handling

- NYC Case Tracker runs entirely in your browser.  
- No information is stored remotely or sent over the internet.  
- Backups are AES-encrypted locally with a user-chosen password.  
- Clearing your browser’s storage or using “Clear All Cases” will permanently erase all data.  
- The developer does not have access to or store any user data.  

> **Use only on personal, trusted devices.**  
---

## ⚖️ Legal Disclaimer

This tool is provided for reference and organizational purposes only.  
Attorneys must independently calculate and verify all CPL § 30.30 deadlines, excluded time, and related legal determinations.  
No guarantee of accuracy is provided, and this app does not constitute legal advice or create an attorney–client relationship.

---

## 🧩 Tech Stack

- **Frontend:** Vanilla HTML / CSS / JavaScript  
- **Crypto:** [CryptoJS v4.2.0](https://cdnjs.com/libraries/crypto-js) for optional AES encryption  
- **Hosting:** Static deployment (e.g. [Vercel](https://vercel.com/) or GitHub Pages)  

No build tools, databases, or APIs required.

---

## 🚀 Deployment

Already live at [nycasetracker.com](https://nycasetracker.com).  
To deploy elsewhere:
1. Push this repo to GitHub.
2. Connect to [Vercel](https://vercel.com/) or another static host.
3. Optional: add a custom domain.
4. Done — the site runs fully in-browser.

