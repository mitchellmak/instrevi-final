import React from 'react';
import { useSearchParams } from 'react-router-dom';
import PostCard from '../components/PostCard';
import { useAuth } from '../hooks/useAuth';
import { Post } from '../types';
import { apiFetch } from '../utils/apiFetch';

type ListMode = 'tag' | 'business';

type FilterOption = {
  key: string;
  label: string;
};

const normalizeValue = (value: string) => value.trim().toLowerCase();

const extractCaptionTags = (caption: string) => {
  if (!caption || typeof caption !== 'string') return [];

  const tags = new Set<string>();
  const regex = /(^|\s)#([a-z0-9][a-z0-9_-]{0,39})/gi;
  let match = regex.exec(caption);

  while (match) {
    const token = normalizeValue(match[2] || '');
    if (token) {
      tags.add(token);
    }
    match = regex.exec(caption);
  }

  return Array.from(tags);
};

const getTagTokensFromPost = (post: Post) => {
  const tokens = new Set<string>();

  if (Array.isArray(post.tags)) {
    post.tags.forEach((tag) => {
      const normalized = normalizeValue(String(tag || ''));
      if (normalized) {
        tokens.add(normalized);
      }
    });
  }

  extractCaptionTags(post.caption || '').forEach((tag) => tokens.add(tag));

  return Array.from(tokens);
};

const getBusinessNamesFromPost = (post: Post) => {
  const values = new Set<string>();

  [post.shopName, post.subjectName]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .forEach((value) => values.add(value));

  return Array.from(values);
};

const ListPage: React.FC = () => {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const mode: ListMode = searchParams.get('mode') === 'business' ? 'business' : 'tag';
  const query = searchParams.get('q') || '';
  const selectedValue = searchParams.get('value') || '';
  const selectedNormalized = mode === 'tag'
    ? normalizeValue(selectedValue).replace(/^#+/, '')
    : normalizeValue(selectedValue);
  const queryNormalized = mode === 'tag'
    ? normalizeValue(query).replace(/^#+/, '')
    : normalizeValue(query);
  const activeSelectionLabel = selectedValue
    ? mode === 'tag'
      ? `#${normalizeValue(selectedValue).replace(/^#+/, '')}`
      : selectedValue
    : '';

  const updateParams = React.useCallback((updates: { mode?: ListMode; q?: string; value?: string | null }) => {
    const params = new URLSearchParams(searchParams);

    if (updates.mode) {
      params.set('mode', updates.mode);
    }

    if (typeof updates.q === 'string') {
      if (updates.q.trim()) {
        params.set('q', updates.q);
      } else {
        params.delete('q');
      }
    }

    if (updates.value === null) {
      params.delete('value');
    } else if (typeof updates.value === 'string') {
      if (updates.value.trim()) {
        params.set('value', updates.value);
      } else {
        params.delete('value');
      }
    }

    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const fetchPosts = React.useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/api/posts');
      if (!response.ok) {
        setPosts([]);
        setError('Unable to load posts right now.');
        return;
      }

      const payload = await response.json();
      setPosts(Array.isArray(payload) ? payload : []);
    } catch (requestError) {
      console.error('List page posts fetch error:', requestError);
      setPosts([]);
      setError('Unable to load posts right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const tagOptions = React.useMemo<FilterOption[]>(() => {
    const map = new Map<string, string>();

    posts.forEach((post) => {
      getTagTokensFromPost(post).forEach((token) => {
        if (!map.has(token)) {
          map.set(token, token);
        }
      });
    });

    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label: `#${label}` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [posts]);

  const businessOptions = React.useMemo<FilterOption[]>(() => {
    const map = new Map<string, string>();

    posts.forEach((post) => {
      getBusinessNamesFromPost(post).forEach((name) => {
        const key = normalizeValue(name);
        if (!key || map.has(key)) return;
        map.set(key, name);
      });
    });

    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [posts]);

  const filteredOptions = React.useMemo(() => {
    const options = mode === 'tag' ? tagOptions : businessOptions;

    if (!queryNormalized) {
      return options;
    }

    return options.filter((option) => option.key.includes(queryNormalized));
  }, [mode, tagOptions, businessOptions, queryNormalized]);

  const filteredPosts = React.useMemo(() => {
    const activeFilter = selectedNormalized || queryNormalized;

    if (!activeFilter) {
      return [];
    }

    return posts.filter((post) => {
      if (mode === 'tag') {
        const postTags = getTagTokensFromPost(post);
        return postTags.some((token) => token.includes(activeFilter));
      }

      const businessValues = getBusinessNamesFromPost(post).map((entry) => normalizeValue(entry));
      return businessValues.some((entry) => entry.includes(activeFilter));
    });
  }, [posts, mode, selectedNormalized, queryNormalized]);

  const handleLike = async (postId: string) => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await apiFetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers
      });

      if (response.ok) {
        fetchPosts();
      }
    } catch (requestError) {
      console.error('List page like error:', requestError);
    }
  };

  const handleComment = async (postId: string, text: string) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await apiFetch(`/api/posts/${postId}/comment`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text })
      });

      if (response.ok) {
        fetchPosts();
      }
    } catch (requestError) {
      console.error('List page comment error:', requestError);
    }
  };

  return (
    <div className="feed-page">
      <div className="card" style={{ borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
        <h1 style={{ color: 'var(--brand-accent)', fontSize: '26px', marginBottom: '6px' }}>List</h1>
        <p style={{ color: 'var(--brand-muted)', fontSize: '14px', marginBottom: '12px' }}>
          Find posts by tags or by business name.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <button
            type="button"
            className={mode === 'tag' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => updateParams({ mode: 'tag', value: null })}
          >
            Tags
          </button>
          <button
            type="button"
            className={mode === 'business' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => updateParams({ mode: 'business', value: null })}
          >
            Business
          </button>
        </div>

        <input
          type="text"
          value={query}
          onChange={(event) => updateParams({ q: event.target.value })}
          placeholder={mode === 'tag' ? 'Search tags (example: #electronics)' : 'Search business name'}
          className="form-input"
          style={{ marginBottom: '8px' }}
        />

        {selectedValue && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '13px', color: 'var(--brand-muted)' }}>Active:</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand-accent)' }}>{activeSelectionLabel}</span>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '6px 10px', fontSize: '12px' }}
              onClick={() => updateParams({ value: null })}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
        <div style={{ fontSize: '13px', color: 'var(--brand-muted)', marginBottom: '8px' }}>
          {mode === 'tag' ? 'Matching tags' : 'Matching businesses'}
        </div>
        {filteredOptions.length === 0 ? (
          <p style={{ color: 'var(--brand-muted)', fontSize: '13px' }}>No matches yet.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {filteredOptions.slice(0, 80).map((option) => {
              const isActive = selectedNormalized === option.key;
              return (
                <button
                  type="button"
                  key={option.key}
                  onClick={() => updateParams({ value: mode === 'tag' ? option.key : option.label })}
                  className={isActive ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '7px 10px', fontSize: '12px' }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--brand-muted)', padding: '18px 0' }}>Loading posts...</p>
      ) : error ? (
        <p style={{ textAlign: 'center', color: '#c62828', padding: '18px 0' }}>{error}</p>
      ) : !selectedNormalized && !queryNormalized ? (
        <p style={{ textAlign: 'center', color: 'var(--brand-muted)', padding: '18px 0' }}>
          Pick a {mode === 'tag' ? 'tag' : 'business'} or type in the search box to see matching posts.
        </p>
      ) : filteredPosts.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--brand-muted)', padding: '18px 0' }}>
          No posts found for that {mode === 'tag' ? 'tag' : 'business'}.
        </p>
      ) : (
        filteredPosts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            onLike={handleLike}
            onComment={handleComment}
          />
        ))
      )}
    </div>
  );
};

export default ListPage;
