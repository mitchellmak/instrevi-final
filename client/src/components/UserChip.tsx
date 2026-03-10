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
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
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
  onClick,
  disabled,
  ariaLabel,
  primaryStyle,
  secondaryStyle,
  containerStyle,
  textContainerStyle,
}) => {
  const primary = primaryText || user?.username || 'User';

  const content = (
    <>
      <UserAvatar user={user as any} size={avatarSize} />
      <div style={{ display: 'flex', flexDirection: 'column', ...textContainerStyle }}>
        <span style={{ fontWeight: 600, color: 'var(--brand-accent)', ...primaryStyle }}>{primary}</span>
        {secondaryText ? (
          <span style={{ fontSize: '12px', color: 'var(--brand-primary)', ...secondaryStyle }}>{secondaryText}</span>
        ) : null}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel || `Open ${primary} profile`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          border: 'none',
          background: 'transparent',
          padding: 0,
          margin: 0,
          textAlign: 'left',
          cursor: disabled ? 'default' : 'pointer',
          ...containerStyle,
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', ...containerStyle }}>
      {content}
    </div>
  );
};

export default UserChip;
