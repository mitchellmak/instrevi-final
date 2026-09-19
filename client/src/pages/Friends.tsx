import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import SettingsLayout from '../components/SettingsLayout';
import UserChip from '../components/UserChip';
import { apiFetch } from '../utils/apiFetch';

type NetworkTab = 'requests' | 'following' | 'followers';

type NetworkUser = {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isFollower: boolean;
  isFriend: boolean;
  hasOutgoingFriendRequest: boolean;
  hasIncomingFriendRequest: boolean;
};

type NetworkResponse = {
  friends: NetworkUser[];
  followers: NetworkUser[];
  following: NetworkUser[];
  incomingFriendRequests: NetworkUser[];
  outgoingFriendRequests: NetworkUser[];
};

type DiscoverResponse = {
  users: NetworkUser[];
};

const userChipPrimaryStyle: React.CSSProperties = {
  fontWeight: 700,
  marginBottom: '1px',
  fontSize: '14px',
  lineHeight: 1.1,
};

const userChipSecondaryStyle: React.CSSProperties = {
  fontSize: '11px',
  lineHeight: 1.2,
};

const userChipContainerStyle: React.CSSProperties = {
  gap: '8px',
  minWidth: 0,
};

const userChipTextContainerStyle: React.CSSProperties = {
  gap: '1px',
  minWidth: 0,
};

const Friends: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const isBanned = Boolean(user?.isBanned);

  const [activeNetworkTab, setActiveNetworkTab] = useState<NetworkTab>('requests');
  const [friendsQuery, setFriendsQuery] = useState('');
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [network, setNetwork] = useState<NetworkResponse>({
    friends: [],
    followers: [],
    following: [],
    incomingFriendRequests: [],
    outgoingFriendRequests: [],
  });
  const [discoverUsers, setDiscoverUsers] = useState<NetworkUser[]>([]);
  const [loadingNetwork, setLoadingNetwork] = useState(true);
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const [error, setError] = useState('');
  const [busyByUserId, setBusyByUserId] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Friends | Instrevi';

    return () => {
      document.title = previousTitle;
    };
  }, []);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  const setUserBusy = (userId: string, busy: boolean) => {
    setBusyByUserId((prev) => ({ ...prev, [userId]: busy }));
  };

  const fetchNetwork = useCallback(async () => {
    if (!token) {
      setLoadingNetwork(false);
      return;
    }

    setLoadingNetwork(true);
    try {
      const response = await apiFetch('/api/users/network', {
        headers: authHeaders,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load network data');
      }

      const data = (await response.json()) as NetworkResponse;
      setNetwork({
        friends: Array.isArray(data.friends) ? data.friends : [],
        followers: Array.isArray(data.followers) ? data.followers : [],
        following: Array.isArray(data.following) ? data.following : [],
        incomingFriendRequests: Array.isArray(data.incomingFriendRequests) ? data.incomingFriendRequests : [],
        outgoingFriendRequests: Array.isArray(data.outgoingFriendRequests) ? data.outgoingFriendRequests : [],
      });
    } catch (requestError) {
      console.error(requestError);
      setError(requestError instanceof Error ? requestError.message : 'Failed to load network data');
    } finally {
      setLoadingNetwork(false);
    }
  }, [authHeaders, token]);

  const fetchDiscover = useCallback(async (query: string) => {
    if (!token) {
      setDiscoverUsers([]);
      return;
    }

    setLoadingDiscover(true);
    try {
      const response = await apiFetch(`/api/users/discover?q=${encodeURIComponent(query)}`, {
        headers: authHeaders,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load discover users');
      }

      const data = (await response.json()) as DiscoverResponse;
      setDiscoverUsers(Array.isArray(data.users) ? data.users : []);
    } catch (requestError) {
      console.error(requestError);
      setError(requestError instanceof Error ? requestError.message : 'Failed to load discover users');
    } finally {
      setLoadingDiscover(false);
    }
  }, [authHeaders, token]);

  useEffect(() => {
    fetchNetwork();
  }, [fetchNetwork]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchDiscover(discoverQuery.trim());
    }, 220);

    return () => window.clearTimeout(timer);
  }, [discoverQuery, fetchDiscover]);

  const refreshData = async () => {
    await Promise.all([fetchNetwork(), fetchDiscover(discoverQuery.trim())]);
  };

  const runUserAction = async (userId: string, requestFactory: () => Promise<Response>) => {
    if (!token || !userId) return;

    if (isBanned) {
      setError('Your account is banned from friend interactions.');
      return;
    }

    setUserBusy(userId, true);
    setError('');

    try {
      const response = await requestFactory();
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Action failed');
      }

      await refreshData();
    } catch (requestError) {
      console.error(requestError);
      setError(requestError instanceof Error ? requestError.message : 'Action failed');
    } finally {
      setUserBusy(userId, false);
    }
  };

  const handleFollowToggle = (userId: string) => runUserAction(userId, () =>
    apiFetch(`/api/users/${userId}/follow`, {
      method: 'POST',
      headers: authHeaders,
    })
  );

  const handleRemoveFollower = (userId: string) => runUserAction(userId, () =>
    apiFetch(`/api/users/${userId}/follower`, {
      method: 'DELETE',
      headers: authHeaders,
    })
  );

  const handleSendFriendRequest = (userId: string) => runUserAction(userId, () =>
    apiFetch(`/api/users/${userId}/friend-request`, {
      method: 'POST',
      headers: authHeaders,
    })
  );

  const handleCancelFriendRequest = (userId: string) => runUserAction(userId, () =>
    apiFetch(`/api/users/${userId}/friend-request`, {
      method: 'DELETE',
      headers: authHeaders,
    })
  );

  const handleAcceptFriendRequest = (userId: string) => runUserAction(userId, () =>
    apiFetch(`/api/users/${userId}/friend-request/accept`, {
      method: 'POST',
      headers: authHeaders,
    })
  );

  const handleDeclineFriendRequest = (userId: string) => runUserAction(userId, () =>
    apiFetch(`/api/users/${userId}/friend-request/decline`, {
      method: 'POST',
      headers: authHeaders,
    })
  );

  const handleRemoveFriend = (userId: string) => runUserAction(userId, () =>
    apiFetch(`/api/users/${userId}/friend`, {
      method: 'DELETE',
      headers: authHeaders,
    })
  );

  const openProfile = (userId: string) => {
    if (!userId) return;
    navigate(`/profile/${userId}`);
  };

  const getSecondaryText = (entry: NetworkUser) => {
    const fullName = `${entry.firstName || ''} ${entry.lastName || ''}`.trim();
    return fullName;
  };

  const filteredFriends = useMemo(() => {
    const query = friendsQuery.trim().toLowerCase();

    if (!query) {
      return network.friends;
    }

    return network.friends.filter((entry) => {
      const username = (entry.username || '').toLowerCase();
      const firstName = (entry.firstName || '').toLowerCase();
      const lastName = (entry.lastName || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();

      return username.includes(query) || firstName.includes(query) || lastName.includes(query) || fullName.includes(query);
    });
  }, [friendsQuery, network.friends]);

  const renderCommonViewButton = (entry: NetworkUser) => (
    <button className="btn-secondary friend-action-btn" type="button" onClick={() => openProfile(entry.id)} disabled={!!busyByUserId[entry.id]}>
      View
    </button>
  );

  const renderDiscoverActions = (entry: NetworkUser) => {
    const isBusy = !!busyByUserId[entry.id];
    const isInteractionDisabled = isBusy || isBanned;

    return (
      <div className="friend-row-actions">
        {renderCommonViewButton(entry)}
        <button className="btn-secondary friend-action-btn" type="button" onClick={() => handleFollowToggle(entry.id)} disabled={isInteractionDisabled}>
          {entry.isFollowing ? 'Unfollow' : 'Follow'}
        </button>
        {entry.isFriend ? (
          <button className="btn-secondary friend-action-btn" type="button" onClick={() => handleRemoveFriend(entry.id)} disabled={isInteractionDisabled}>
            Remove Friend
          </button>
        ) : entry.hasIncomingFriendRequest ? (
          <>
            <button className="btn-primary friend-action-btn" type="button" onClick={() => handleAcceptFriendRequest(entry.id)} disabled={isInteractionDisabled}>
              Accept Friend
            </button>
            <button className="btn-secondary friend-action-btn" type="button" onClick={() => handleDeclineFriendRequest(entry.id)} disabled={isInteractionDisabled}>
              Decline
            </button>
          </>
        ) : entry.hasOutgoingFriendRequest ? (
          <button className="btn-secondary friend-action-btn" type="button" onClick={() => handleCancelFriendRequest(entry.id)} disabled={isInteractionDisabled}>
            Cancel Request
          </button>
        ) : (
          <button className="btn-primary friend-action-btn" type="button" onClick={() => handleSendFriendRequest(entry.id)} disabled={isInteractionDisabled}>
            Add Friend
          </button>
        )}
      </div>
    );
  };

  const renderNetworkList = (list: NetworkUser[], mode: 'friends' | 'followers' | 'following') => {
    if (list.length === 0) {
      const emptyMessage = mode === 'friends'
        ? 'No friends yet. Discover users and send friend requests.'
        : mode === 'followers'
          ? 'No followers yet.'
          : 'You are not following anyone yet.';

      return <p className="friends-empty-state">{emptyMessage}</p>;
    }

    return list.map((entry) => {
      const isBusy = !!busyByUserId[entry.id];
      const isInteractionDisabled = isBusy || isBanned;

      return (
        <div key={entry.id} className="friend-row">
          <button
            type="button"
            onClick={() => openProfile(entry.id)}
            className="friend-row-user-trigger"
          >
            <UserChip
              user={entry as any}
              avatarSize={42}
              primaryStyle={userChipPrimaryStyle}
              secondaryStyle={userChipSecondaryStyle}
              containerStyle={userChipContainerStyle}
              textContainerStyle={userChipTextContainerStyle}
              secondaryText={getSecondaryText(entry)}
            />
          </button>

          <div className="friend-row-actions">
            {renderCommonViewButton(entry)}
            {mode === 'friends' && (
              <button className="btn-secondary friend-action-btn" type="button" onClick={() => handleRemoveFriend(entry.id)} disabled={isInteractionDisabled}>
                Remove Friend
              </button>
            )}
            {mode === 'following' && (
              <button className="btn-secondary friend-action-btn" type="button" onClick={() => handleFollowToggle(entry.id)} disabled={isInteractionDisabled}>
                Unfollow
              </button>
            )}
            {mode === 'followers' && (
              <>
                <button className="btn-secondary friend-action-btn" type="button" onClick={() => handleFollowToggle(entry.id)} disabled={isInteractionDisabled}>
                  {entry.isFollowing ? 'Unfollow' : 'Follow Back'}
                </button>
                <button className="btn-secondary friend-action-btn" type="button" onClick={() => handleRemoveFollower(entry.id)} disabled={isInteractionDisabled}>
                  Remove
                </button>
              </>
            )}
          </div>
        </div>
      );
    });
  };

  const renderRequestsSection = () => {
    const incoming = network.incomingFriendRequests;
    const outgoing = network.outgoingFriendRequests;

    return (
      <>
        <div className="friends-subsection">
          <h3 className="friends-subsection-title">Incoming Requests ({incoming.length})</h3>
          {incoming.length === 0 ? (
            <p className="friends-empty-inline">No incoming friend requests.</p>
          ) : (
            incoming.map((entry) => {
              const isBusy = !!busyByUserId[entry.id];
              const isInteractionDisabled = isBusy || isBanned;

              return (
                <div key={`incoming-${entry.id}`} className="friend-row">
                  <button
                    type="button"
                    onClick={() => openProfile(entry.id)}
                    className="friend-row-user-trigger"
                  >
                    <UserChip
                      user={entry as any}
                      avatarSize={42}
                      primaryStyle={userChipPrimaryStyle}
                      secondaryStyle={userChipSecondaryStyle}
                      containerStyle={userChipContainerStyle}
                      textContainerStyle={userChipTextContainerStyle}
                      secondaryText={getSecondaryText(entry)}
                    />
                  </button>

                  <div className="friend-row-actions">
                    {renderCommonViewButton(entry)}
                    <button className="btn-primary friend-action-btn" type="button" onClick={() => handleAcceptFriendRequest(entry.id)} disabled={isInteractionDisabled}>
                      Accept
                    </button>
                    <button className="btn-secondary friend-action-btn" type="button" onClick={() => handleDeclineFriendRequest(entry.id)} disabled={isInteractionDisabled}>
                      Decline
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="friends-subsection">
          <h3 className="friends-subsection-title">Outgoing Requests ({outgoing.length})</h3>
          {outgoing.length === 0 ? (
            <p className="friends-empty-inline">No outgoing friend requests.</p>
          ) : (
            outgoing.map((entry) => {
              const isBusy = !!busyByUserId[entry.id];
              const isInteractionDisabled = isBusy || isBanned;

              return (
                <div key={`outgoing-${entry.id}`} className="friend-row">
                  <button
                    type="button"
                    onClick={() => openProfile(entry.id)}
                    className="friend-row-user-trigger"
                  >
                    <UserChip
                      user={entry as any}
                      avatarSize={42}
                      primaryStyle={userChipPrimaryStyle}
                      secondaryStyle={userChipSecondaryStyle}
                      containerStyle={userChipContainerStyle}
                      textContainerStyle={userChipTextContainerStyle}
                      secondaryText={getSecondaryText(entry)}
                    />
                  </button>

                  <div className="friend-row-actions">
                    {renderCommonViewButton(entry)}
                    <button className="btn-secondary friend-action-btn" type="button" onClick={() => handleCancelFriendRequest(entry.id)} disabled={isInteractionDisabled}>
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </>
    );
  };

  return (
    <SettingsLayout>
      <div className="friends-page">
        <h1 className="settings-page-title">Friends</h1>

        <div className="card settings-page-card">
          {error && (
            <div className="friends-alert friends-alert--error">
              {error}
            </div>
          )}

          {isBanned && (
            <div className="friends-alert friends-alert--muted">
              Friend and follow actions are disabled while your account is banned.
            </div>
          )}

          <section className="friends-section">
            <h3 className="friends-section-title">Friends ({network.friends.length})</h3>
            <input
              type="text"
              value={friendsQuery}
              onChange={(event) => setFriendsQuery(event.target.value)}
              placeholder="Search friends by username or name"
              className="form-input friends-search-input"
            />

            {loadingNetwork ? (
              <p className="friends-empty-state">Loading friends...</p>
            ) : friendsQuery.trim() && filteredFriends.length === 0 && network.friends.length > 0 ? (
              <p className="friends-empty-state">No friends found for your search.</p>
            ) : (
              renderNetworkList(filteredFriends, 'friends')
            )}
          </section>

          <section className="friends-section">
            <h3 className="friends-section-title">Discover</h3>
            <input
              type="text"
              value={discoverQuery}
              onChange={(event) => setDiscoverQuery(event.target.value)}
              placeholder="Search username, first name, or last name"
              className="form-input friends-search-input"
            />

            {loadingDiscover ? (
              <p className="friends-empty-state">Loading discover users...</p>
            ) : discoverUsers.length === 0 ? (
              <p className="friends-empty-state">
                {discoverQuery.trim() ? 'No users found for your search.' : 'No users to discover right now.'}
              </p>
            ) : (
              discoverUsers.map((entry) => (
                <div key={entry.id} className="friend-row">
                  <button
                    type="button"
                    onClick={() => openProfile(entry.id)}
                    className="friend-row-user-trigger"
                  >
                    <UserChip
                      user={entry as any}
                      avatarSize={42}
                      primaryStyle={userChipPrimaryStyle}
                      secondaryStyle={userChipSecondaryStyle}
                      containerStyle={userChipContainerStyle}
                      textContainerStyle={userChipTextContainerStyle}
                      secondaryText={getSecondaryText(entry)}
                    />
                  </button>
                  {renderDiscoverActions(entry)}
                </div>
              ))
            )}
          </section>

          <section className="friends-section friends-section--network">
            <h3 className="friends-section-title">Requests and Network</h3>

            <div className="friends-tab-row">
              <button
                type="button"
                className={`friends-tab-btn ${activeNetworkTab === 'requests' ? 'active' : ''}`}
                onClick={() => setActiveNetworkTab('requests')}
              >
                Requests ({network.incomingFriendRequests.length})
              </button>
              <button
                type="button"
                className={`friends-tab-btn ${activeNetworkTab === 'following' ? 'active' : ''}`}
                onClick={() => setActiveNetworkTab('following')}
              >
                Following ({network.following.length})
              </button>
              <button
                type="button"
                className={`friends-tab-btn ${activeNetworkTab === 'followers' ? 'active' : ''}`}
                onClick={() => setActiveNetworkTab('followers')}
              >
                Followers ({network.followers.length})
              </button>
            </div>

            {loadingNetwork ? (
              <p className="friends-empty-state">Loading network...</p>
            ) : activeNetworkTab === 'requests' ? (
              renderRequestsSection()
            ) : activeNetworkTab === 'following' ? (
              renderNetworkList(network.following, 'following')
            ) : (
              renderNetworkList(network.followers, 'followers')
            )}
          </section>
        </div>
      </div>
    </SettingsLayout>
  );
};

export default Friends;
