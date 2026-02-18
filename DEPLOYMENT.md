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
- MONGODB_URI: `mongodb+srv://mitchellmak_db_user:swFexHe1hbMYHUsf@instrevi.b0l6nkn.mongodb.net/instrevi?appName=Instrevi`
- JWT_SECRET: `InstreviSuperSecretKey2024!@#$%^&*()_+SecureJWTTokenForAuth`
- CLOUDINARY_CLOUD_NAME: `diie3bl9z`
- CLOUDINARY_API_KEY: `469939416852124`
- CLOUDINARY_API_SECRET: `mOF7Ai3kzeqM6r-uDIRyexBroIg`

## 🎯 Result:
- Live app at instrevi.com
- Free hosting forever
- SSL included
- Global CDN
