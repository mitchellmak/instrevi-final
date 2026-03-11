# Instrevi - Instagram-like Social Media App

A full-stack Instagram clone built with React, Node.js, and MongoDB.

## Features

- User authentication (signup/login)
- Email verification and resend flow
- Photo upload and sharing
- User profiles
- Feed with posts from followed users
- Likes and comments
- Follow/unfollow functionality
- Responsive design

## Tech Stack

### Frontend
- React with TypeScript
- React Router for navigation
- Axios for API calls
- CSS for styling

### Backend
- Node.js with Express
- MongoDB with Mongoose
- JWT authentication
- Multer for file uploads
- Cloudinary for image storage

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- Cloudinary account (for image storage)

### Installation

1. Clone the repository and navigate to the project directory

2. Install dependencies:
```bash
npm run install-deps
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: A secret key for JWT tokens
- `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Your Cloudinary API key
- `CLOUDINARY_API_SECRET`: Your Cloudinary API secret

4. Start the development servers:
```bash
npm run dev
```

This will start both the backend server (port 5000) and frontend dev server (port 3000).

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify-email` - Verify account email
- `POST /api/auth/resend-verification` - Resend verification email
- `POST /api/auth/forgot-password` - Request reset link
- `POST /api/auth/reset-password` - Reset password with token

### Posts
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create a new post (with image)
- `POST /api/posts/:postId/like` - Like/unlike a post
- `POST /api/posts/:postId/comment` - Add comment to post

### Users
- `GET /api/users/:userId` - Get user profile
- `POST /api/users/:userId/follow` - Follow/unfollow user
- `PUT /api/users/profile` - Update user profile

## Project Structure

```
Instrevi/
├── server/
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── middleware/      # Express middleware
│   └── index.js         # Server entry point
├── client/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   ├── types/       # TypeScript types
│   │   └── App.tsx      # Main App component
│   └── public/          # Static files
├── package.json
└── README.md
```

## Future Enhancements

- Real-time notifications
- Stories feature
- Direct messaging
- Explore/discover page
- Advanced image filters
- Video upload support
- Mobile app development
