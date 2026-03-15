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
  isBanned?: boolean;
  followers: User[];
  following: User[];
  followersCount: number;
  followingCount: number;
}

export interface Stat {
  label: string;
  value: number;
}

export type MediaKind = 'image' | 'video';
export type MediaFrameStyle = 'clean' | 'polaroid' | 'cinema' | 'glow';
export type MediaAspectRatio = 'original' | 'square' | 'portrait' | 'landscape';
export type MediaOverlayPosition = 'top' | 'center' | 'bottom';

export interface MediaEditSettings {
  kind: MediaKind;
  frameStyle: MediaFrameStyle;
  aspectRatio: MediaAspectRatio;
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotate: number;
  brightness: number;
  contrast: number;
  saturation: number;
  clarity: number;
  overlayText: string;
  overlayPosition: MediaOverlayPosition;
  trimStart: number;
  trimEnd: number;
}

export interface PostSoundtrack {
  url: string;
  originalName?: string;
  volume?: number;
}

export interface Post {
  _id: string;
  postType: 'review' | 'unboxing' | 'general';
  title?: string;
  category?: string;
  subjectName?: string;
  subjectKey?: string;
  shopName?: string;
  businessLocation?: string;
  visitDate?: string;
  visitTime?: string;
  caption: string;
  image: string;
  images?: string[];
  video?: string;
  videos?: string[];
  mediaEditSettings?: MediaEditSettings[];
  soundtrack?: PostSoundtrack;
  user: User;
  likes: User[];
  comments: Comment[];
  rating?: number;
  customRating?: number;
  customRatingName?: string;
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

export type NotificationType =
  | 'friend_request'
  | 'friend_request_accepted'
  | 'follow'
  | 'like'
  | 'comment'
  | 'mention'
  | 'tag'
  | 'notification'
  | 'general';

export interface NotificationActor {
  _id?: string;
  id?: string;
  username?: string;
  profilePicture?: string;
}

export interface NotificationPost {
  _id?: string;
  id?: string;
  title?: string;
  image?: string;
  postType?: 'review' | 'unboxing' | 'general';
}

export interface NotificationItem {
  _id: string;
  recipient: string;
  actor?: NotificationActor | null;
  type: NotificationType;
  post?: NotificationPost | string | null;
  commentId?: string;
  message?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}
