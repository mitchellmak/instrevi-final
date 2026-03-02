import React from 'react';
import UserAvatar from './UserAvatar';

type ChipUser = {
  id?: string;
  _id?: string;
  username?: string;
  profilePicture?: string;
  firstName?: string;
  lastName?: string;
};

interface UserChipProps {
  user?: ChipUser;
  avatarSize?: number;
  primaryText?: string;
  secondaryText?: string;
  primaryStyle?: React.CSSProperties;
  secondaryStyle?: React.CSSProperties;
  containerStyle?: React.CSSProperties;
  textContainerStyle?: React.CSSProperties;
}

const UserChip: React.FC<UserChipProps> = ({
  user,
  avatarSize = 32,
  primaryText,
  secondaryText,
  primaryStyle,
  secondaryStyle,
  containerStyle,
  textContainerStyle,
}) => {
  const primary = primaryText || user?.username || 'User';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', ...containerStyle }}>
      <UserAvatar user={user as any} size={avatarSize} />
      <div style={{ display: 'flex', flexDirection: 'column', ...textContainerStyle }}>
        <span style={{ fontWeight: 600, color: '#262626', ...primaryStyle }}>{primary}</span>
        {secondaryText ? (
          <span style={{ fontSize: '12px', color: '#8e8e8e', ...secondaryStyle }}>{secondaryText}</span>
        ) : null}
      </div>
    </div>
  );
};

export default UserChip;
