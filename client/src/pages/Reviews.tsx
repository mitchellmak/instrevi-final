import React from 'react';
import { Link } from 'react-router-dom';
import PostCard from '../components/PostCard';
import { Post } from '../types';
import { apiFetch } from '../utils/apiFetch';
import { useAuth } from '../hooks/useAuth';

type ReviewSubject = {
  subjectKey: string;
  subjectName: string;
  category: string;
  reviewCount: number;
  globalRating: number;
  ratingsCount: number;
  latestReviewAt?: string;
};

type SubjectListResponse = {
  subjects?: ReviewSubject[];
};

type SubjectReviewResponse = {
  subject?: ReviewSubject;
  reviews?: Post[];
};

const formatWholeRating = (value: number) => Math.round(Number(value) || 0);

const Reviews: React.FC = () => {
  const { token, user } = useAuth();
  const isBanned = Boolean(user?.isBanned);
  const [query, setQuery] = React.useState('');
  const [subjects, setSubjects] = React.useState<ReviewSubject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = React.useState(true);
  const [subjectsError, setSubjectsError] = React.useState('');
  const [selectedSubjectKey, setSelectedSubjectKey] = React.useState('');
  const [selectedSubject, setSelectedSubject] = React.useState<ReviewSubject | null>(null);
  const [reviews, setReviews] = React.useState<Post[]>([]);
  const [reviewsLoading, setReviewsLoading] = React.useState(false);
  const [reviewsError, setReviewsError] = React.useState('');

  const fetchSubjects = React.useCallback(async (searchText: string) => {
    setSubjectsLoading(true);
    setSubjectsError('');

    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (searchText.trim()) params.set('q', searchText.trim());

      const response = await apiFetch(`/api/posts/reviews/subjects?${params.toString()}`);

      if (!response.ok) {
        setSubjects([]);
        setSelectedSubjectKey('');
        setSelectedSubject(null);
        setReviews([]);
        setSubjectsError('Unable to load review subjects right now.');
        return;
      }

      const data = (await response.json()) as SubjectListResponse;
      const nextSubjects = Array.isArray(data.subjects) ? data.subjects : [];

      setSubjects(nextSubjects);

      if (nextSubjects.length === 0) {
        setSelectedSubjectKey('');
        setSelectedSubject(null);
        setReviews([]);
        return;
      }

      setSelectedSubjectKey((current) => {
        if (current && nextSubjects.some((subject) => subject.subjectKey === current)) {
          return current;
        }

        return nextSubjects[0].subjectKey;
      });
    } catch (error) {
      console.error('Error fetching review subjects:', error);
      setSubjects([]);
      setSelectedSubjectKey('');
      setSelectedSubject(null);
      setReviews([]);
      setSubjectsError('Unable to load review subjects right now.');
    } finally {
      setSubjectsLoading(false);
    }
  }, []);

  const fetchSubjectReviews = React.useCallback(async (subjectKey: string) => {
    if (!subjectKey) {
      setSelectedSubject(null);
      setReviews([]);
      return;
    }

    setReviewsLoading(true);
    setReviewsError('');

    try {
      const response = await apiFetch(`/api/posts/reviews/subjects/${encodeURIComponent(subjectKey)}/reviews?limit=30`);

      if (!response.ok) {
        setSelectedSubject(null);
        setReviews([]);
        setReviewsError('Unable to load reviews for this subject.');
        return;
      }

      const data = (await response.json()) as SubjectReviewResponse;
      setSelectedSubject(data.subject || null);
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
    } catch (error) {
      console.error('Error fetching subject reviews:', error);
      setSelectedSubject(null);
      setReviews([]);
      setReviewsError('Unable to load reviews for this subject.');
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchSubjects(query);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query, fetchSubjects]);

  React.useEffect(() => {
    fetchSubjectReviews(selectedSubjectKey);
  }, [selectedSubjectKey, fetchSubjectReviews]);

  const refreshSubjectReviews = React.useCallback(async () => {
    if (!selectedSubjectKey) return;
    await fetchSubjectReviews(selectedSubjectKey);
  }, [selectedSubjectKey, fetchSubjectReviews]);

  const handleLike = async (postId: string) => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await apiFetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers
      });

      if (response.ok) {
        refreshSubjectReviews();
      }
    } catch (error) {
      console.error('Error liking post:', error);
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
        refreshSubjectReviews();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  return (
    <div className="feed-page">
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--brand-border)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px'
      }}>
        <h1 style={{ color: 'var(--brand-accent)', fontSize: '26px', marginBottom: '6px' }}>Review Hub</h1>
        <p style={{ color: 'var(--brand-muted)', fontSize: '14px', marginBottom: '12px' }}>
          Search a product, service, or establishment to see all related reviews and a global rating.
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search (e.g. Mcdonalds)"
            className="form-input"
            style={{ maxWidth: '420px', marginBottom: 0 }}
          />
          <Link
            to="/create/review"
            onClick={(event) => {
              if (isBanned) {
                event.preventDefault();
              }
            }}
            aria-disabled={isBanned}
            title={isBanned ? 'Banned users cannot create posts' : undefined}
            style={{
              textDecoration: 'none',
              background: isBanned ? '#dbdbdb' : 'var(--brand-accent)',
              color: isBanned ? '#8e8e8e' : '#fff',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              pointerEvents: isBanned ? 'none' : 'auto',
              cursor: isBanned ? 'not-allowed' : 'pointer'
            }}
          >
            Write a Review
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '16px' }}>
        <aside style={{
          flex: '1 1 260px',
          minWidth: '240px',
          maxWidth: '320px',
          background: '#ffffff',
          border: '1px solid var(--brand-border)',
          borderRadius: '12px',
          padding: '12px',
          alignSelf: 'start',
          maxHeight: '75vh',
          overflowY: 'auto'
        }}>
          <h2 style={{ color: 'var(--brand-accent)', fontSize: '16px', marginBottom: '10px' }}>Matched Subjects</h2>

          {subjectsLoading && <p style={{ color: 'var(--brand-muted)', fontSize: '13px' }}>Loading subjects...</p>}
          {!subjectsLoading && subjectsError && <p style={{ color: '#c62828', fontSize: '13px' }}>{subjectsError}</p>}
          {!subjectsLoading && !subjectsError && subjects.length === 0 && (
            <p style={{ color: 'var(--brand-muted)', fontSize: '13px' }}>No matching subjects found.</p>
          )}

          {!subjectsLoading && !subjectsError && subjects.map((subject) => {
            const isActive = selectedSubjectKey === subject.subjectKey;

            return (
              <button
                key={subject.subjectKey}
                type="button"
                onClick={() => setSelectedSubjectKey(subject.subjectKey)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: isActive ? '1px solid var(--brand-accent)' : '1px solid var(--brand-border)',
                  borderRadius: '10px',
                  padding: '10px',
                  marginBottom: '8px',
                  background: isActive ? 'rgba(139, 157, 195, 0.12)' : '#fff',
                  cursor: 'pointer'
                }}
              >
                <div style={{ color: 'var(--brand-accent)', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                  {subject.subjectName}
                </div>
                <div style={{ color: 'var(--brand-muted)', fontSize: '12px' }}>
                  {subject.category} • {subject.reviewCount} review{subject.reviewCount === 1 ? '' : 's'}
                </div>
                <div style={{ color: '#2e7d32', fontSize: '12px', fontWeight: 600, marginTop: '4px' }}>
                  Global rating: {formatWholeRating(subject.globalRating || 0)} / 5
                </div>
              </button>
            );
          })}
        </aside>

        <section style={{ flex: '2 1 520px', minWidth: '280px' }}>
          {selectedSubject && (
            <div style={{
              background: '#ffffff',
              border: '1px solid var(--brand-border)',
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '14px'
            }}>
              <div style={{ color: 'var(--brand-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                {selectedSubject.category}
              </div>
              <h2 style={{ color: 'var(--brand-accent)', fontSize: '22px', marginBottom: '8px' }}>{selectedSubject.subjectName}</h2>
              <div style={{ color: '#2e7d32', fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
                Global Rating: {formatWholeRating(selectedSubject.globalRating || 0)} / 5
              </div>
              <div style={{ color: 'var(--brand-muted)', fontSize: '13px' }}>
                Based on {selectedSubject.ratingsCount} rating{selectedSubject.ratingsCount === 1 ? '' : 's'} across {selectedSubject.reviewCount} review{selectedSubject.reviewCount === 1 ? '' : 's'}.
              </div>
            </div>
          )}

          {reviewsLoading && <p style={{ color: 'var(--brand-muted)', fontSize: '14px' }}>Loading reviews...</p>}
          {!reviewsLoading && reviewsError && <p style={{ color: '#c62828', fontSize: '14px' }}>{reviewsError}</p>}
          {!reviewsLoading && !reviewsError && selectedSubjectKey && reviews.length === 0 && (
            <p style={{ color: 'var(--brand-muted)', fontSize: '14px' }}>No reviews found for this subject.</p>
          )}

          {!reviewsLoading && !reviewsError && reviews.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onLike={handleLike}
              onComment={handleComment}
            />
          ))}
        </section>
      </div>
    </div>
  );
};

export default Reviews;
