import React from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';

type ReviewSubject = {
  subjectKey: string;
  subjectName: string;
  category: string;
  reviewCount: number;
  globalRating: number;
  ratingsCount: number;
  previewImage?: string;
};

type SubjectListResponse = {
  subjects?: ReviewSubject[];
};

const formatWholeRating = (value: number) => Math.round(Number(value) || 0);

const TopRated: React.FC = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = React.useState<ReviewSubject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');

      try {
        const response = await apiFetch('/api/posts/reviews/subjects?sort=top&limit=20');

        if (!response.ok) {
          if (!cancelled) setError('Unable to load top rated subjects right now.');
          return;
        }

        const data = (await response.json()) as SubjectListResponse;
        if (!cancelled) setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
      } catch (err) {
        console.error('Error fetching top rated subjects:', err);
        if (!cancelled) setError('Unable to load top rated subjects right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="feed-page">
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--brand-border)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px'
      }}>
        <h1 style={{ color: 'var(--brand-accent)', fontSize: '26px', marginBottom: '6px' }}>Top Rated</h1>
        <p style={{ color: 'var(--brand-muted)', fontSize: '14px' }}>
          The highest-rated products, services, food, and establishments reviewed by the community.
        </p>
      </div>

      {loading && <p style={{ color: 'var(--brand-muted)', fontSize: '14px' }}>Loading top rated subjects...</p>}
      {!loading && error && <p style={{ color: '#c62828', fontSize: '14px' }}>{error}</p>}
      {!loading && !error && subjects.length === 0 && (
        <p style={{ color: 'var(--brand-muted)', fontSize: '14px' }}>No rated reviews yet.</p>
      )}

      {!loading && !error && subjects.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {subjects.map((subject, index) => (
            <button
              key={subject.subjectKey}
              type="button"
              onClick={() => navigate(`/reviews?subject=${encodeURIComponent(subject.subjectKey)}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                width: '100%',
                textAlign: 'left',
                background: '#ffffff',
                border: '1px solid var(--brand-border)',
                borderRadius: '12px',
                padding: '12px 14px',
                cursor: 'pointer'
              }}
            >
              <div style={{
                flexShrink: 0,
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: index < 3 ? 'var(--brand-pop)' : 'var(--brand-bg)',
                color: index < 3 ? '#fff' : 'var(--brand-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px'
              }}>
                {index + 1}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--brand-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  {subject.category}
                </div>
                <div style={{
                  color: 'var(--brand-accent)',
                  fontSize: '16px',
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {subject.subjectName}
                </div>
                <div style={{ color: 'var(--brand-muted)', fontSize: '12px' }}>
                  {subject.reviewCount} review{subject.reviewCount === 1 ? '' : 's'}
                </div>
              </div>

              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ color: '#2e7d32', fontSize: '16px', fontWeight: 700 }}>
                  {formatWholeRating(subject.globalRating || 0)} / 5
                </div>
                <div style={{ color: 'var(--brand-muted)', fontSize: '11px' }}>
                  {subject.ratingsCount} rating{subject.ratingsCount === 1 ? '' : 's'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopRated;
