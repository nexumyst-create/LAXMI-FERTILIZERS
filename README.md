# Laksmi Fertilizers Pesticides and Seeds – E-Commerce Platform

Full-stack Indian agricultural e-commerce storefront and administrative operations console built with React, TypeScript, Tailwind CSS, Express, Firebase Authentication, and Cloud Firestore.

## Features
- **Bilingual Storefront (English & Telugu)**: Complete product catalog, categories, seasonal/crop filters, search suggestions, cart drawer, wishlist, checkout, order tracking, and printable GST tax invoices.
- **Agricultural Compliance**: Product registration info, approved label instructions, safety precautions, and checkout verification/declaration gates for regulated crop protection products.
- **Server-Side Payment Verification**: Express `/api/payments/*` routes validate payment references and perform HMAC-SHA256 Razorpay signature verification when `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are configured.
- **Role-Based Admin Console (`/admin`)**: 21-module sidebar with KPI analytics, Recharts visualizations, product CRUD + CSV import/export, category/brand management, inventory & supplier movements, order status & tracking management, coupons, homepage banners, reviews & Q&A moderation, GST/sales/profit reports (CSV, Excel, Print/PDF), staff RBAC, configurable business/license settings, and audit logs.

## Environment Variables
Configure secrets in the server environment (see `.env.example`):
- `RAZORPAY_KEY_ID`: Razorpay Key ID (optional, enables live Razorpay checkout)
- `RAZORPAY_KEY_SECRET`: Razorpay Secret Key for server-side HMAC-SHA256 verification
- `NOTIFICATION_WEBHOOK_URL`: Optional SMS/WhatsApp/Email relay webhook URL
- `NOTIFICATION_WEBHOOK_TOKEN`: Optional Bearer token for the notification webhook
- `APP_URL`: Public URL used for `sitemap.xml` and `robots.txt`

## Firebase Configuration & Security Rules
- Client Firebase configuration is stored in `firebase-applet-config.json`.
- Data schema blueprint is documented in `firebase-blueprint.json`.
- Hardened Firestore Security Rules are defined in `firestore.rules` (linted with `@firebase/eslint-plugin-security-rules`).
- In Firebase Console → Authentication → Sign-in method:
  - **Google Sign-In** is enabled by default.
  - Enable **Email/Password** and **Phone** providers if you wish to use email/password or SMS OTP sign-in flows.

## Commands
- `npm run dev` — Starts the full-stack Express + Vite server on port `3000`.
- `npm run build` — Builds the production frontend into `dist/`.
- `npm run start` — Serves the production build via `server.ts`.
- `npm run lint` — Runs TypeScript type checking (`tsc --noEmit`).
