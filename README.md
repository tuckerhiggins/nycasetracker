# Case Tracker v1.0

A browser-based criminal defense case management tool for tracking CPL § 30.30 speedy trial deadlines.

## ✨ New in v1.0

### Enhanced Modal Design
- **Clean sectional organization** - WHO → WHAT → WHEN → STATUS → WORK
- **Visual hierarchy** - Color-coded sections for easy scanning
- **Better mobile experience** - Responsive design throughout

### Contact Management
- **Multiple phone numbers** - Add several phones with notes (e.g., "Mother's phone - call after 6pm")
- **Multiple email addresses** - Track multiple emails with context notes
- **Physical address field** - Store client address
- **Collapsible contacts section** - Keeps modal clean, expand when needed

### Charges Display
- **Visual charge cards** - Prominent display with statute and class
- **Primary charge indicator** - Star icon shows which charge drives 30.30 cap
- **Color-coded badges** - Felony (red), Class A (blue), Class B (green), Violation (yellow)

### Status Management
- **Color-coded status badges** - 🔴 Warrant, 🟡 Clock Stopped, 🟢 COC Filed, ⚫ Closed
- **Conditional date fields** - Warrant date appears when warrant checked
- **Visual feedback** - Clear indication of case status at a glance

### Quick Actions
- **📧 Email case** - Quick email with case details
- **🖨️ Print case** - Print individual case summary
- **📋 Copy docket** - One-click docket number copy

## 🔒 Security

- **Local storage only** - All data stays in your browser
- **AES-256-GCM encryption** - Military-grade backup encryption
- **No server transmission** - Nothing sent anywhere
- **CSP compliant** - Protected against XSS attacks

## 📋 Features

- 30.30 deadline calculations with holiday/weekend adjustments
- Track excludable time (definitely + arguably)
- Case notes with dates
- To-dos with deadlines
- Multiple charges per case
- Email/Print today's cases
- Export to calendar (.ics)
- Mobile-responsive design
- Encrypted backups

## 🚀 Deployment

This is a static web app. Upload to any web host:
- Vercel
- Netlify  
- GitHub Pages
- Or run locally by opening index.html

## ⚖️ Legal Disclaimer

This tool is for reference and organizational purposes only. Attorneys must independently calculate and verify all CPL § 30.30 deadlines and excluded time. No guarantee of accuracy is provided.

---

**Built for NY public defenders** 🗽
