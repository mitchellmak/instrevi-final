export interface User {
  id: string;
  username: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email: string;
  emailVerified?: boolean;
  profilePicture?: string;
  bio?: string;
  followers: User[];
  following: User[];
  followersCount: number;
  followingCount: number;
}

export interface Stat {
  label: string;
  value: number;
}

export interface Post {
  _id: string;
  postType: 'review' | 'unboxing' | 'general';
  title?: string;
  category?: string;
  caption: string;
  image: string;
  images?: string[];
  video?: string;
  user: User;
  likes: User[];
  comments: Comment[];
  rating?: number;
  totalRating?: number;
  totalRatingsCount?: number;
  stats?: Stat[];
  tags?: string[];
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
