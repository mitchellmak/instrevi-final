# 🚀 Instrevi Deployment Guide

## 📋 What You Need:
- GitHub account ✅
- GoDaddy domain (instrevi.com) ✅
- MongoDB Atlas ✅
- Cloudinary ✅

## 🌐 Deployment Steps:

### Step 1: Push to GitHub
1. Create a new repository on GitHub
2. Push your code to the repository

### Step 2: Deploy Frontend (Vercel)
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Select the `client` folder as root directory
5. Deploy!

### Step 3: Deploy Backend (Render)
1. Go to [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Select the `server` folder as root directory
5. Add environment variables
6. Deploy!

### Step 4: Connect Domain
1. Update GoDaddy DNS to point to Vercel
2. Configure API endpoints in frontend

## 🔧 Environment Variables for Render:
- MONGODB_URI: `<your_mongodb_atlas_uri>`
- JWT_SECRET: `<strong_random_secret>`
- CLOUDINARY_CLOUD_NAME: `<your_cloudinary_cloud_name>`
- CLOUDINARY_API_KEY: `<your_cloudinary_api_key>`
- CLOUDINARY_API_SECRET: `<your_cloudinary_api_secret>`
- FRONTEND_URL: `https://www.instrevi.com`
- SMTP_HOST: `<smtp_host>`
- SMTP_PORT: `<465_or_587>`
- SMTP_DNS_FAMILY: `<optional: 4 or 6; leave unset for auto>`
- SMTP_USER: `<smtp_username>`
- SMTP_PASS: `<smtp_password>`
- SMTP_FROM: `Instrevi <<same_as_smtp_user>>`
- RESEND_API_KEY: `<optional_resend_key>`
- RESEND_FROM: `<optional_resend_from_address>`
- EMAIL_PROVIDER: `<optional: smtp or resend>`
- BLOCK_UNVERIFIED_LOGIN: `true`

Important:
- `FRONTEND_URL` must be your public app domain (for example `https://www.instrevi.com`).
- Do not use Vercel deploy hook or dashboard URLs in `FRONTEND_URL`.
- Production verification emails are pinned to `https://www.instrevi.com` for safety.
- If SMTP/Resend is not configured in production, signup/resend now returns `503` instead of silently skipping email delivery.
- In Render, paste `SMTP_USER` and `SMTP_PASS` as raw values (no surrounding quotes and no extra spaces).

## 🔐 Security Note
- Do not store real secrets in the repository.
- Keep all production credentials only in Render/Vercel environment settings.
- If any credentials were previously committed, rotate them immediately.

## 🎯 Result:
- Live app at instrevi.com
- Free hosting forever
- SSL included
- Global CDN
