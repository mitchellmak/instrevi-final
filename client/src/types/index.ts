export interface User {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  followers: User[];
  following: User[];
  followersCount: number;
  followingCount: number;
}

export interface Post {
  _id: string;
  caption: string;
  image: string;
  user: User;
  likes: User[];
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  user: User;
  text: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
