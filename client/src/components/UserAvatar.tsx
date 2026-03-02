import React from 'react';
import { useAuth } from '../hooks/useAuth';

type AvatarUser = {
  id?: string;
  _id?: string;
  username?: string;
  profilePicture?: string;
};

interface UserAvatarProps {
  user?: AvatarUser;
  size?: number;
  fontSize?: number;
  srcOverride?: string | null;
  alt?: string;
  style?: React.CSSProperties;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 32,
  fontSize,
  srcOverride,
  alt,
  style,
}) => {
  const { user: authUser } = useAuth();

  // If no user is provided, use authUser
  const targetUser = user || authUser;
  const displayName = targetUser?.username || authUser?.username || 'User';

  const targetId = targetUser?.id || (targetUser as any)?._id;
  const authId = authUser?.id;

  const isCurrentUser = !!authUser && !!targetUser && (
    (targetId && targetId === authId) ||
    targetUser.username === authUser.username
  );

  // Always prefer authUser's profilePicture for current user (ensures live sync)
  const resolvedSrc =
    srcOverride ??
    (isCurrentUser
      ? (authUser?.profilePicture || targetUser?.profilePicture)
      : targetUser?.profilePicture) ??
    '';

  if (resolvedSrc) {
    return (
      <img
        src={resolvedSrc}
        alt={alt || displayName}
        key={resolvedSrc}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          objectFit: 'cover',
          ...style,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: '#e1306c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: `${fontSize || Math.max(12, Math.floor(size * 0.45))}px`,
        fontWeight: 'bold',
        ...style,
      }}
      aria-label={alt || displayName}
    >
      {displayName?.charAt(0).toUpperCase()}
    </div>
  );
};

export default UserAvatar;
