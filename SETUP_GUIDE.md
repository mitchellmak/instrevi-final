# Instrevi Setup Guide

## Prerequisites

Before you begin, make sure you have the following installed:

1. **Node.js** (v14 or higher)
2. **MongoDB** (local installation or MongoDB Atlas account)
3. **Cloudinary account** (for image storage)
4. **Git** (optional, for version control)

## Step 1: Clone and Navigate

```bash
cd Instrevi
```

## Step 2: Install Dependencies

### Backend Dependencies
```bash
npm install
```

### Frontend Dependencies
```bash
cd client
npm install
cd ..
```

Or use the convenience script:
```bash
npm run install-deps
```

## Step 3: Environment Setup

1. Copy the environment file:
```bash
cp .env.example .env
```

2. Edit the `.env` file with your configuration:

### Required Environment Variables:

```env
MONGODB_URI=mongodb://localhost:27017/instrevi
JWT_SECRET=your_super_secret_jwt_key_here
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key  
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
PORT=5000
```

### Getting Your Credentials:

**MongoDB:**
- Local: `mongodb://localhost:27017/instrevi`
- MongoDB Atlas: Get connection string from your Atlas dashboard

**Cloudinary:**
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to Dashboard → Account Details
3. Copy your Cloud name, API Key, and API Secret

**JWT Secret:**
- Generate a random string: `openssl rand -base64 32`
- Or use any long, random string

## Step 4: Start the Application

### Development Mode (Recommended)
```bash
npm run dev
```

This will start both servers:
- Backend: http://localhost:5000
- Frontend: http://localhost:3000

### Manual Start
```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend  
npm run client
```

## Step 5: Test the Application

1. Open your browser to http://localhost:3000
2. Register a new account
3. Try uploading an image
4. Test likes and comments
5. Follow other users

## Troubleshooting

### Common Issues:

**"npm command not found"**
- Install Node.js from [nodejs.org](https://nodejs.org)

**MongoDB connection failed**
- Ensure MongoDB is running locally
- Check your MONGODB_URI in .env file
- For Atlas, verify your IP is whitelisted

**Cloudinary upload errors**
- Verify your Cloudinary credentials
- Check your API key permissions

**Port already in use**
- Change PORT in .env file
- Or kill the process using the port: `taskkill /PID <process_id> /F` (Windows)

**TypeScript errors in client**
- These are normal before dependencies are installed
- Should resolve after `npm install` in client folder

### Development Tips:

1. **Hot Reload**: Both frontend and backend support hot reload in development
2. **Database**: Use MongoDB Compass to view your data
3. **Images**: Check Cloudinary Media Library for uploaded images
4. **API Testing**: Use Postman or curl to test API endpoints

## Production Deployment

For production deployment:

1. **Build the frontend:**
```bash
npm run build
```

2. **Set production environment variables**
3. **Use a production database (MongoDB Atlas)**
4. **Configure a reverse proxy (Nginx)**
5. **Set up SSL certificates**

## API Documentation

### Authentication Endpoints:
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login user

### Post Endpoints:
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create post (requires auth)
- `POST /api/posts/:id/like` - Like/unlike post (requires auth)
- `POST /api/posts/:id/comment` - Add comment (requires auth)

### User Endpoints:
- `GET /api/users/:id` - Get user profile
- `POST /api/users/:id/follow` - Follow/unfollow user (requires auth)
- `PUT /api/users/profile` - Update profile (requires auth)

## Need Help?

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure all dependencies are installed
4. Check that MongoDB and Cloudinary are accessible

Happy coding! 🚀
