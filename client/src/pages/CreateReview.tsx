import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';
import MediaComposerEditor from '../components/MediaComposerEditor';
import {
  ComposerMediaItem,
  ComposerSoundtrack,
  createDefaultMediaEdit,
  createEmptySoundtrack,
} from '../utils/mediaEditing';

const CreateReview: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const isBanned = Boolean(user?.isBanned);

  const [reviewCategory, setReviewCategory] = useState('Products');
  const [includeShopName, setIncludeShopName] = useState(false);
  const [shopName, setShopName] = useState('');
  const [businessLocation, setBusinessLocation] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [friendsOrAnyone, setFriendsOrAnyone] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<ComposerMediaItem[]>([]);
  const [soundtrack, setSoundtrack] = useState<ComposerSoundtrack>(createEmptySoundtrack);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const CAPTION_MAX_LENGTH = 2200;
  const chooseFilesInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const videoCameraInputRef = React.useRef<HTMLInputElement>(null);
  const captionInputRef = React.useRef<HTMLTextAreaElement>(null);
  const selectedMediaRef = React.useRef<ComposerMediaItem[]>([]);
  const soundtrackRef = React.useRef<ComposerSoundtrack>(soundtrack);

  // For Products category ratings (-5 to +5)
  const [qualityRating, setQualityRating] = useState(0);
  const [durabilityRating, setDurabilityRating] = useState(0);
  const [performanceRating, setPerformanceRating] = useState(0);
  const [designRating, setDesignRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);
  const [overallRating, setOverallRating] = useState(0);

  // For Service category ratings (-5 to +5)
  const [courtesyRating, setCourtesyRating] = useState(0);
  const [professionalismRating, setProfessionalismRating] = useState(0);
  const [responsivenessRating, setResponsivenessRating] = useState(0);
  const [serviceValueRating, setServiceValueRating] = useState(0);
  const [problemResolutionRating, setProblemResolutionRating] = useState(0);
  const [serviceOverallRating, setServiceOverallRating] = useState(0);

  // For Food category ratings (-5 to +5)
  const [tasteRating, setTasteRating] = useState(0);
  const [textureRating, setTextureRating] = useState(0);
  const [freshnessRating, setFreshnessRating] = useState(0);
  const [presentationRating, setPresentationRating] = useState(0);
  const [foodValueRating, setFoodValueRating] = useState(0);
  const [foodOverallRating, setFoodOverallRating] = useState(0);

  // For Establishment category ratings (-5 to +5)
  const [cleanlinessRating, setCleanlinessRating] = useState(0);
  const [maintenanceRating, setMaintenanceRating] = useState(0);
  const [locationRating, setLocationRating] = useState(0);
  const [amenitiesRating, setAmenitiesRating] = useState(0);
  const [valueForMoneyRating, setValueForMoneyRating] = useState(0);
  const [placesOverallRating, setPlacesOverallRating] = useState(0);
  const [includeServiceReview, setIncludeServiceReview] = useState(false);
  const [includeCustomRating, setIncludeCustomRating] = useState(false);
  const [customRating, setCustomRating] = useState(0);
  const [customRatingName, setCustomRatingName] = useState('');

  // Auto-calculate overall rating from the 5 aspects
  useEffect(() => {
    if (reviewCategory === 'Products') {
      const average = Math.round((qualityRating + durabilityRating + performanceRating + designRating + valueRating) / 5);
      setOverallRating(average);
    } else if (reviewCategory === 'Service') {
      const average = Math.round((courtesyRating + professionalismRating + responsivenessRating + serviceValueRating + problemResolutionRating) / 5);
      setServiceOverallRating(average);
    } else if (reviewCategory === 'Food') {
      const average = Math.round((tasteRating + textureRating + freshnessRating + presentationRating + foodValueRating) / 5);
      setFoodOverallRating(average);
    } else if (reviewCategory === 'Establishment') {
      const average = Math.round((cleanlinessRating + maintenanceRating + locationRating + amenitiesRating + valueForMoneyRating) / 5);
      setPlacesOverallRating(average);
    }
  }, [reviewCategory, qualityRating, durabilityRating, performanceRating, designRating, valueRating, courtesyRating, professionalismRating, responsivenessRating, serviceValueRating, problemResolutionRating, tasteRating, textureRating, freshnessRating, presentationRating, foodValueRating, cleanlinessRating, maintenanceRating, locationRating, amenitiesRating, valueForMoneyRating]);

  const baseOverallRating = reviewCategory === 'Products'
    ? overallRating
    : reviewCategory === 'Service'
      ? serviceOverallRating
      : reviewCategory === 'Food'
        ? foodOverallRating
        : placesOverallRating;

  const overallAspectCount = 5;
  const effectiveOverallRating = includeCustomRating
    ? Math.round(((baseOverallRating * overallAspectCount) + customRating) / (overallAspectCount + 1))
    : baseOverallRating;

  const normalizedCustomRatingName = customRatingName.trim() || 'Custom rating';

  const ratingTargetName = (
    reviewCategory === 'Establishment'
      ? shopName.trim()
      : (includeShopName ? shopName.trim() : '')
  ) || title.trim() || 'this review';

  const applyCaptionFormatting = (format: 'bold' | 'italic' | 'underline' | 'bullet') => {
    const input = captionInputRef.current;
    if (!input) return;

    const selectionStart = input.selectionStart ?? 0;
    const selectionEnd = input.selectionEnd ?? 0;
    const selectedText = caption.slice(selectionStart, selectionEnd);

    let replacement = selectedText;
    let nextSelectionStart = selectionStart;
    let nextSelectionEnd = selectionEnd;

    if (format === 'bullet') {
      if (selectedText) {
        replacement = selectedText
          .split('\n')
          .map((line) => {
            if (!line.trim()) return line;
            if (/^\s*[-*]\s+/.test(line)) return line;
            return `- ${line}`;
          })
          .join('\n');
        nextSelectionEnd = selectionStart + replacement.length;
      } else {
        replacement = (selectionStart > 0 && caption[selectionStart - 1] !== '\n') ? '\n- ' : '- ';
        nextSelectionStart = selectionStart + replacement.length;
        nextSelectionEnd = nextSelectionStart;
      }
    } else {
      const markerMap = {
        bold: '**',
        italic: '*',
        underline: '__'
      } as const;

      const placeholderMap = {
        bold: 'bold text',
        italic: 'italic text',
        underline: 'underlined text'
      } as const;

      const marker = markerMap[format];
      const baseText = selectedText || placeholderMap[format];
      replacement = `${marker}${baseText}${marker}`;
      nextSelectionStart = selectionStart + marker.length;
      nextSelectionEnd = nextSelectionStart + baseText.length;
    }

    const nextCaption = `${caption.slice(0, selectionStart)}${replacement}${caption.slice(selectionEnd)}`;
    if (nextCaption.length > CAPTION_MAX_LENGTH) return;

    setCaption(nextCaption);

    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(nextSelectionStart, nextSelectionEnd);
    });
  };

  const appendSelectedFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const additions: ComposerMediaItem[] = Array.from(files).map((file) => {
      const kind = file.type.startsWith('video/') ? 'video' : 'image';

      return {
        file,
        preview: URL.createObjectURL(file),
        kind,
        edit: createDefaultMediaEdit(kind),
      };
    });

    setSelectedMedia((prev) => [...prev, ...additions]);
  };

  const handleChooseFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    appendSelectedFiles(e.target.files);
    e.target.value = '';
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    appendSelectedFiles(e.target.files);
    e.target.value = '';
  };

  const handleVideoCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    appendSelectedFiles(e.target.files);
    e.target.value = '';
  };

  const dismissTextKeyboardForRangeInteraction = (target: EventTarget | null) => {
    if (!(target instanceof HTMLInputElement) || target.type !== 'range') {
      return;
    }

    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement
    ) {
      if (activeElement !== target) {
        activeElement.blur();
      }
    }
  };

  const handleFormPointerDownCapture = (e: React.PointerEvent<HTMLFormElement>) => {
    dismissTextKeyboardForRangeInteraction(e.target);
  };

  const handleFormTouchStartCapture = (e: React.TouchEvent<HTMLFormElement>) => {
    dismissTextKeyboardForRangeInteraction(e.target);
  };

  const removeMedia = (index: number) => {
    setSelectedMedia((prev) => {
      const target = prev[index];
      if (target?.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(target.preview);
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  useEffect(() => {
    selectedMediaRef.current = selectedMedia;
  }, [selectedMedia]);

  useEffect(() => {
    soundtrackRef.current = soundtrack;
  }, [soundtrack]);

  useEffect(() => {
    return () => {
      selectedMediaRef.current.forEach((item) => {
        if (item.preview.startsWith('blob:')) {
          URL.revokeObjectURL(item.preview);
        }
      });

      if (soundtrackRef.current.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(soundtrackRef.current.previewUrl);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isBanned) {
      setError('Your account is banned from creating posts.');
      return;
    }

    if (!title.trim() || !caption.trim() || selectedMedia.length === 0) {
      setError('Please fill in all required fields and upload at least one photo or video');
      return;
    }

    if (reviewCategory === 'Establishment' && (!shopName.trim() || !businessLocation.trim())) {
      setError('Establishment name and location are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('postType', 'review');
      formData.append('reviewCategory', reviewCategory);
      formData.append('category', reviewCategory);
      formData.append('title', title);
      formData.append('subjectName', includeShopName && shopName.trim() ? shopName.trim() : title.trim());
      formData.append('caption', caption);
      formData.append('tags', tags);
      formData.append('friendsOrAnyone', friendsOrAnyone);

      const imageFiles = selectedMedia.filter((item) => item.kind === 'image').map((item) => item.file);
      const videoFiles = selectedMedia.filter((item) => item.kind === 'video').map((item) => item.file);
      const mediaEditSettings = [
        ...selectedMedia.filter((item) => item.kind === 'image').map((item) => item.edit),
        ...selectedMedia.filter((item) => item.kind === 'video').map((item) => item.edit),
      ];

      imageFiles.forEach((file) => {
        formData.append('images', file);
      });

      videoFiles.forEach((file) => {
        formData.append('videos', file);
      });

      if (mediaEditSettings.length > 0) {
        formData.append('mediaEditSettings', JSON.stringify(mediaEditSettings));
      }

      if (soundtrack.file) {
        formData.append('soundtrack', soundtrack.file);
        formData.append('soundtrackVolume', soundtrack.volume.toString());
      }
      
      // Include shop details if applicable
      if (includeShopName) {
        formData.append('shopName', shopName);
        formData.append('businessLocation', businessLocation);
        formData.append('visitDate', visitDate);
        formData.append('visitTime', visitTime);
      }

      // For Products category, include aspect ratings
      if (reviewCategory === 'Products') {
        const stats = [
          { label: 'Quality', value: qualityRating },
          { label: 'Durability', value: durabilityRating },
          { label: 'Performance', value: performanceRating },
          { label: 'Design', value: designRating },
          { label: 'Value for Money', value: valueRating },
          ...(includeCustomRating ? [{ label: normalizedCustomRatingName, value: customRating }] : []),
          { label: 'Overall', value: effectiveOverallRating }
        ];
        formData.append('stats', JSON.stringify(stats));
        formData.append('rating', effectiveOverallRating.toString());
      } else if (reviewCategory === 'Service') {
        const stats = [
          { label: 'Courtesy', value: courtesyRating },
          { label: 'Professionalism', value: professionalismRating },
          { label: 'Responsiveness', value: responsivenessRating },
          { label: 'Efficiency', value: serviceValueRating },
          { label: 'Problem Resolution', value: problemResolutionRating },
          ...(includeCustomRating ? [{ label: normalizedCustomRatingName, value: customRating }] : []),
          { label: 'Overall', value: effectiveOverallRating }
        ];
        formData.append('stats', JSON.stringify(stats));
        formData.append('rating', effectiveOverallRating.toString());
      } else if (reviewCategory === 'Food') {
        const stats = [
          { label: 'Taste', value: tasteRating },
          { label: 'Texture', value: textureRating },
          { label: 'Freshness', value: freshnessRating },
          { label: 'Presentation', value: presentationRating },
          { label: 'Value for Money', value: foodValueRating },
          ...(includeCustomRating ? [{ label: normalizedCustomRatingName, value: customRating }] : []),
          { label: 'Overall', value: effectiveOverallRating }
        ];
        formData.append('stats', JSON.stringify(stats));
        formData.append('rating', effectiveOverallRating.toString());
      } else if (reviewCategory === 'Establishment') {
        const stats = [
          { label: 'Cleanliness', value: cleanlinessRating },
          { label: 'Maintenance', value: maintenanceRating },
          { label: 'Location', value: locationRating },
          { label: 'Amenities', value: amenitiesRating },
          { label: 'Value for Money', value: valueForMoneyRating },
          ...(includeCustomRating ? [{ label: normalizedCustomRatingName, value: customRating }] : []),
          { label: 'Overall', value: effectiveOverallRating }
        ];
        if (includeServiceReview) {
          const serviceStats = [
            { label: 'Courtesy', value: courtesyRating },
            { label: 'Professionalism', value: professionalismRating },
            { label: 'Responsiveness', value: responsivenessRating },
            { label: 'Efficiency', value: serviceValueRating },
            { label: 'Problem Resolution', value: problemResolutionRating },
            { label: 'Overall', value: serviceOverallRating }
          ];
          stats.push({ label: 'Service Review', value: JSON.stringify(serviceStats) });
        }
        formData.append('stats', JSON.stringify(stats));
        formData.append('rating', effectiveOverallRating.toString());
      }

      if (includeCustomRating) {
        formData.append('customRating', customRating.toString());
        formData.append('customRatingName', normalizedCustomRatingName);
      }

      const response = await apiFetch('/api/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to create review';

        try {
          const parsed = errorText ? JSON.parse(errorText) : null;
          if (parsed?.message) {
            errorMessage = parsed.message;
          } else if (errorText) {
            errorMessage = errorText;
          }
        } catch {
          if (errorText) {
            errorMessage = errorText;
          }
        }

        throw new Error(errorMessage);
      }

      setSelectedMedia((prev) => {
        prev.forEach((item) => {
          if (item.preview.startsWith('blob:')) {
            URL.revokeObjectURL(item.preview);
          }
        });

        return [];
      });

      setSoundtrack((current) => {
        if (current.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(current.previewUrl);
        }

        return createEmptySoundtrack();
      });

      navigate('/feed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: "'Poppins', sans-serif" }}>
      <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px', textAlign: 'center' }}>Create an Instant Review</h1>

      {error && (
        <div style={{
          backgroundColor: '#ffe0e0',
          color: '#c00',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {isBanned && (
        <div
          style={{
            marginBottom: '16px',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid var(--brand-border)',
            background: '#ffffff',
            color: 'var(--brand-primary)',
            fontSize: '13px'
          }}
        >
          Your account is banned from posting. You can still use other profile and settings pages.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        onPointerDownCapture={handleFormPointerDownCapture}
        onTouchStartCapture={handleFormTouchStartCapture}
      >
        {/* Review Category Buttons */}
        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '16px', textAlign: 'center', color: '#262626' }}>
            What are you reviewing?
          </label>
          <div style={{ 
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            {/* Products Button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setReviewCategory('Products')}
                style={{
                  width: '70px',
                  height: '70px',
                  backgroundColor: 'white',
                  border: reviewCategory === 'Products' ? '2px solid #262626' : '1px solid #dbdbdb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: reviewCategory === 'Products' ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#262626';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  if (reviewCategory !== 'Products') {
                    e.currentTarget.style.borderColor = '#dbdbdb';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                  }
                }}
              >
                <svg 
                  width="40" 
                  height="40" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#262626" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </button>
              <span style={{ 
                fontSize: '11px', 
                color: '#262626',
                fontWeight: reviewCategory === 'Products' ? '600' : '400',
                fontFamily: "'Poppins', sans-serif"
              }}>
                Products
              </span>
            </div>

            {/* Service Button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setReviewCategory('Service')}
                style={{
                  width: '70px',
                  height: '70px',
                  backgroundColor: 'white',
                  border: reviewCategory === 'Service' ? '2px solid #262626' : '1px solid #dbdbdb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: reviewCategory === 'Service' ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#262626';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  if (reviewCategory !== 'Service') {
                    e.currentTarget.style.borderColor = '#dbdbdb';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                  }
                }}
              >
                <svg 
                  width="40" 
                  height="40" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#262626" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </button>
              <span style={{ 
                fontSize: '11px', 
                color: '#262626',
                fontWeight: reviewCategory === 'Service' ? '600' : '400',
                fontFamily: "'Poppins', sans-serif"
              }}>
                Services
              </span>
            </div>

            {/* Food Button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setReviewCategory('Food')}
                style={{
                  width: '70px',
                  height: '70px',
                  backgroundColor: 'white',
                  border: reviewCategory === 'Food' ? '2px solid #262626' : '1px solid #dbdbdb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: reviewCategory === 'Food' ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#262626';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  if (reviewCategory !== 'Food') {
                    e.currentTarget.style.borderColor = '#dbdbdb';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                  }
                }}
              >
                <svg 
                  width="40" 
                  height="40" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#262626" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                  <line x1="6" y1="1" x2="6" y2="4" />
                  <line x1="10" y1="1" x2="10" y2="4" />
                  <line x1="14" y1="1" x2="14" y2="4" />
                </svg>
              </button>
              <span style={{ 
                fontSize: '11px', 
                color: '#262626',
                fontWeight: reviewCategory === 'Food' ? '600' : '400',
                fontFamily: "'Poppins', sans-serif"
              }}>
                Food
              </span>
            </div>

            {/* Establishment Button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setReviewCategory('Establishment')}
                style={{
                  width: '70px',
                  height: '70px',
                  backgroundColor: 'white',
                  border: reviewCategory === 'Establishment' ? '2px solid #262626' : '1px solid #dbdbdb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: reviewCategory === 'Establishment' ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#262626';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  if (reviewCategory !== 'Establishment') {
                    e.currentTarget.style.borderColor = '#dbdbdb';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                  }
                }}
              >
                <svg 
                  width="40" 
                  height="40" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#262626" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </button>
              <span style={{ 
                fontSize: '11px', 
                color: '#262626',
                fontWeight: reviewCategory === 'Establishment' ? '600' : '400',
                fontFamily: "'Poppins', sans-serif"
              }}>
                Businesses
              </span>
            </div>
          </div>
        </div>

        {/* Include Business Name Checkbox (for Products, Service, Food) */}
        {(reviewCategory === 'Products' || reviewCategory === 'Service' || reviewCategory === 'Food') && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <input
                type="checkbox"
                checked={includeShopName}
                onChange={(e) => setIncludeShopName(e.target.checked)}
                style={{ 
                  width: '18px', 
                  height: '18px', 
                  cursor: 'pointer',
                  accentColor: '#262626'
                }}
              />
              Include Business name?
            </label>
          </div>
        )}

        {/* Mandatory Establishment Name (for Establishment) */}
        {reviewCategory === 'Establishment' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
              Establishment Name *
            </label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Enter establishment name..."
              style={{
                width: '100%',
                padding: '12px',
                border: shopName.trim() === '' && reviewCategory === 'Establishment' ? '2px solid #c62828' : '1px solid #dbdbdb',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: "'Poppins', sans-serif"
              }}
            />
            {shopName.trim() === '' && reviewCategory === 'Establishment' && (
              <div style={{ fontSize: '12px', color: '#c62828', marginTop: '4px' }}>
                Establishment name is required
              </div>
            )}
          </div>
        )}

        {/* Establishment Location (for Establishment) */}
        {reviewCategory === 'Establishment' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              Establishment Location *
            </label>
            <input
              type="text"
              value={businessLocation}
              onChange={(e) => setBusinessLocation(e.target.value)}
              placeholder="Enter establishment location..."
              style={{
                width: '100%',
                padding: '12px',
                border: businessLocation.trim() === '' && reviewCategory === 'Establishment' ? '2px solid #c62828' : '1px solid #dbdbdb',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: "'Poppins', sans-serif"
              }}
            />
            {businessLocation.trim() === '' && reviewCategory === 'Establishment' && (
              <div style={{ fontSize: '12px', color: '#c62828', marginTop: '4px' }}>
                Establishment location is required
              </div>
            )}
          </div>
        )}

        {/* Business Details (shown when Include Business Name is checked) */}
        {includeShopName && (reviewCategory === 'Products' || reviewCategory === 'Service' || reviewCategory === 'Food') && (
          <>
            {/* Business Name */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Business Name
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="Search for a place..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #dbdbdb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  fontFamily: "'Poppins', sans-serif"
                }}
              />
              <div style={{ fontSize: '12px', color: '#8e8e8e', marginTop: '4px' }}>
                Note: Google Maps API integration coming soon
              </div>
            </div>

            {/* Place Location (optional for Products, Service, Food) */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Place Location
              </label>
              <input
                type="text"
                value={businessLocation}
                onChange={(e) => setBusinessLocation(e.target.value)}
                placeholder="Enter place location..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #dbdbdb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  fontFamily: "'Poppins', sans-serif"
                }}
              />
            </div>

            {/* Visit Date and Time */}
            <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  Visit Date
                </label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #dbdbdb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    fontFamily: "'Poppins', sans-serif"
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  Visit Time
                </label>
                <input
                  type="time"
                  value={visitTime}
                  onChange={(e) => setVisitTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #dbdbdb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    fontFamily: "'Poppins', sans-serif"
                  }}
                />
              </div>
            </div>
          </>
        )}

        {/* Review Title */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
            Review Title * (limit 30 characters)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={reviewCategory === 'Service' ? 'e.g., Quality service, friendly staff, etc...' : reviewCategory === 'Food' ? 'e.g., Awesome burgers at Orchard' : reviewCategory === 'Establishment' ? 'e.g., Amazing amenities, Great Location' : 'e.g., Amazing product, highly recommended!'}
            maxLength={30}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #dbdbdb',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box',
              fontFamily: "'Poppins', sans-serif"
            }}
          />
        </div>

        {/* Media Upload (Video/Photos) */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>
            Upload Video/Photos ({selectedMedia.length} selected) *
          </label>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => chooseFilesInputRef.current?.click()}
              style={{
                flex: 1,
                padding: '12px',
                border: '2px solid #dbdbdb',
                borderRadius: '6px',
                backgroundColor: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: "'Poppins', sans-serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#262626';
                e.currentTarget.style.backgroundColor = '#f9f9f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#dbdbdb';
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Files
            </button>

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              style={{
                flex: 1,
                padding: '12px',
                border: '2px solid #dbdbdb',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#262626',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: "'Poppins', sans-serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#262626';
                e.currentTarget.style.backgroundColor = '#f9f9f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#dbdbdb';
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Camera
            </button>

            <button
              type="button"
              onClick={() => videoCameraInputRef.current?.click()}
              style={{
                flex: 1,
                padding: '12px',
                border: '2px solid #dbdbdb',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#262626',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: "'Poppins', sans-serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#262626';
                e.currentTarget.style.backgroundColor = '#f9f9f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#dbdbdb';
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              Video
            </button>
          </div>

          <input
            ref={chooseFilesInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleChooseFiles}
            style={{ display: 'none' }}
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            style={{ display: 'none' }}
          />

          <input
            ref={videoCameraInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            onChange={handleVideoCameraCapture}
            style={{ display: 'none' }}
          />

          <div style={{ fontSize: '12px', color: '#8e8e8e', marginBottom: '12px' }}>
            Use Camera for photos and Video for recording. You can add multiple videos and photos.
          </div>

          {selectedMedia.length > 0 && (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: '8px'
              }}>
                {selectedMedia.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      paddingBottom: '100%',
                      backgroundColor: '#f0f0f0',
                      borderRadius: '6px',
                      overflow: 'hidden'
                    }}
                  >
                    {item.kind === 'video' ? (
                      <video
                        src={item.preview}
                        muted
                        playsInline
                        controls
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          backgroundColor: '#000'
                        }}
                      />
                    ) : (
                      <img
                        src={item.preview}
                        alt={`Review media ${idx + 1}`}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(idx)}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <MediaComposerEditor
                items={selectedMedia}
                onItemsChange={setSelectedMedia}
                soundtrack={soundtrack}
                onSoundtrackChange={setSoundtrack}
              />
            </>
          )}
        </div>

        {/* Tags */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
            Tags
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={reviewCategory === 'Service' ? 'e.g., friendly, quality, efficient (separated by commas)' : reviewCategory === 'Food' ? 'e.g., Burgers, Sushi, Fish&Chips (separated by commas)' : reviewCategory === 'Establishment' ? 'e.g., Hotels, Motels, Theme Parks (separated by commas)' : 'e.g., electronics, camera, sony (separated by commas)'}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #dbdbdb',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box',
              fontFamily: "'Poppins', sans-serif"
            }}
          />
          <div style={{ fontSize: '12px', color: '#8e8e8e', marginTop: '4px' }}>
            Separate tags with commas
          </div>
        </div>

        {/* Friends or Anyone */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
            Tag Friends or Anyone
          </label>
          <input
            type="text"
            value={friendsOrAnyone}
            onChange={(e) => setFriendsOrAnyone(e.target.value)}
            placeholder="e.g., @john, @sarah (separated by commas or @mentions)"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #dbdbdb',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box',
              fontFamily: "'Poppins', sans-serif"
            }}
          />
          <div style={{ fontSize: '12px', color: '#8e8e8e', marginTop: '4px' }}>
            Tag friends who experienced this with you
          </div>
        </div>

        {/* Your Review */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
            Your Review *
          </label>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => applyCaptionFormatting('bold')}
              style={{
                border: '1px solid #dbdbdb',
                borderRadius: '6px',
                backgroundColor: '#fff',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              aria-label="Format bold"
            >
              Bold
            </button>
            <button
              type="button"
              onClick={() => applyCaptionFormatting('italic')}
              style={{
                border: '1px solid #dbdbdb',
                borderRadius: '6px',
                backgroundColor: '#fff',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 600,
                fontStyle: 'italic',
                cursor: 'pointer'
              }}
              aria-label="Format italic"
            >
              Italic
            </button>
            <button
              type="button"
              onClick={() => applyCaptionFormatting('underline')}
              style={{
                border: '1px solid #dbdbdb',
                borderRadius: '6px',
                backgroundColor: '#fff',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
              aria-label="Format underline"
            >
              Underline
            </button>
            <button
              type="button"
              onClick={() => applyCaptionFormatting('bullet')}
              style={{
                border: '1px solid #dbdbdb',
                borderRadius: '6px',
                backgroundColor: '#fff',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              aria-label="Format bullet list"
            >
              Bullets
            </button>
          </div>

          <textarea
            ref={captionInputRef}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write your detailed review..."
            maxLength={CAPTION_MAX_LENGTH}
            style={{
              width: '100%',
              minHeight: '150px',
              padding: '12px',
              border: '1px solid #dbdbdb',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box',
              fontFamily: "'Poppins', sans-serif",
              resize: 'vertical'
            }}
          />
          <div style={{ fontSize: '12px', color: '#8e8e8e', marginTop: '4px' }}>
            {caption.length}/{CAPTION_MAX_LENGTH} · Use Bold/Italic/Underline/Bullets buttons for rich text.
          </div>
        </div>

        {/* Rate These Aspects (for Products) */}
        {reviewCategory === 'Products' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
              Rate These Aspects (-5 to +5)
            </label>
            
            {/* Quality */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>
                  Quality
                </div>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: qualityRating < 0 ? '#c62828' : qualityRating === 0 ? '#757575' : '#2e7d32',
                  minWidth: '35px',
                  textAlign: 'right'
                }}>
                  {qualityRating > 0 ? `+${qualityRating}` : qualityRating}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="1"
                  value={qualityRating}
                  onChange={(e) => setQualityRating(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>

            {/* Durability */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>
                  Durability
                </div>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: durabilityRating < 0 ? '#c62828' : durabilityRating === 0 ? '#757575' : '#2e7d32',
                  minWidth: '35px',
                  textAlign: 'right'
                }}>
                  {durabilityRating > 0 ? `+${durabilityRating}` : durabilityRating}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="1"
                  value={durabilityRating}
                  onChange={(e) => setDurabilityRating(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>

            {/* Performance */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>
                  Performance
                </div>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: performanceRating < 0 ? '#c62828' : performanceRating === 0 ? '#757575' : '#2e7d32',
                  minWidth: '35px',
                  textAlign: 'right'
                }}>
                  {performanceRating > 0 ? `+${performanceRating}` : performanceRating}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="1"
                  value={performanceRating}
                  onChange={(e) => setPerformanceRating(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>

            {/* Design */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>
                  Design
                </div>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: designRating < 0 ? '#c62828' : designRating === 0 ? '#757575' : '#2e7d32',
                  minWidth: '35px',
                  textAlign: 'right'
                }}>
                  {designRating > 0 ? `+${designRating}` : designRating}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="1"
                  value={designRating}
                  onChange={(e) => setDesignRating(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>

            {/* Value for Money */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>
                  Value for Money
                </div>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: valueRating < 0 ? '#c62828' : valueRating === 0 ? '#757575' : '#2e7d32',
                  minWidth: '35px',
                  textAlign: 'right'
                }}>
                  {valueRating > 0 ? `+${valueRating}` : valueRating}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="1"
                  value={valueRating}
                  onChange={(e) => setValueRating(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>

            {/* Overall (Auto-calculated) */}
            <div style={{ 
              marginTop: '20px',
              padding: '16px', 
              backgroundColor: '#f5f5f5', 
              borderRadius: '8px',
              border: '2px solid #262626'
            }}>
              <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: '600', color: '#262626' }}>
                Overall Rating (Auto-calculated)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ 
                  fontSize: '48px', 
                  fontWeight: '700', 
                  color: overallRating < 0 ? '#c62828' : overallRating === 0 ? '#757575' : '#2e7d32',
                  fontFamily: "'Poppins', sans-serif"
                }}>
                  {overallRating > 0 ? `+${overallRating}` : overallRating}
                </span>
                <div style={{ fontSize: '14px', color: '#737373' }}>
                  out of 5
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#737373', marginTop: '8px' }}>
                Average of Quality, Durability, Performance, Design, and Value for Money
              </div>
            </div>
          </div>
        )}

        {/* Rate These Aspects (for Service) */}
        {reviewCategory === 'Service' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
              Rate These Aspects (-5 to +5)
            </label>

            {/* Courtesy */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>
                  Courtesy
                </div>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: courtesyRating < 0 ? '#c62828' : courtesyRating === 0 ? '#757575' : '#2e7d32',
                  minWidth: '35px',
                  textAlign: 'right'
                }}>
                  {courtesyRating > 0 ? `+${courtesyRating}` : courtesyRating}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="1"
                  value={courtesyRating}
                  onChange={(e) => setCourtesyRating(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>

            {/* Professionalism */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>
                  Professionalism
                </div>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: professionalismRating < 0 ? '#c62828' : professionalismRating === 0 ? '#757575' : '#2e7d32',
                  minWidth: '35px',
                  textAlign: 'right'
                }}>
                  {professionalismRating > 0 ? `+${professionalismRating}` : professionalismRating}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="1"
                  value={professionalismRating}
                  onChange={(e) => setProfessionalismRating(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>

            {/* Responsiveness */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>
                  Responsiveness
                </div>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: responsivenessRating < 0 ? '#c62828' : responsivenessRating === 0 ? '#757575' : '#2e7d32',
                  minWidth: '35px',
                  textAlign: 'right'
                }}>
                  {responsivenessRating > 0 ? `+${responsivenessRating}` : responsivenessRating}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="1"
                  value={responsivenessRating}
                  onChange={(e) => setResponsivenessRating(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>

            {/* Efficiency */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>
                  Efficiency
                </div>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: serviceValueRating < 0 ? '#c62828' : serviceValueRating === 0 ? '#757575' : '#2e7d32',
                  minWidth: '35px',
                  textAlign: 'right'
                }}>
                  {serviceValueRating > 0 ? `+${serviceValueRating}` : serviceValueRating}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="1"
                  value={serviceValueRating}
                  onChange={(e) => setServiceValueRating(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>

            {/* Problem Resolution */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>
                  Problem Resolution
                </div>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: problemResolutionRating < 0 ? '#c62828' : problemResolutionRating === 0 ? '#757575' : '#2e7d32',
                  minWidth: '35px',
                  textAlign: 'right'
                }}>
                  {problemResolutionRating > 0 ? `+${problemResolutionRating}` : problemResolutionRating}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="1"
                  value={problemResolutionRating}
                  onChange={(e) => setProblemResolutionRating(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>

            {/* Overall (Auto-calculated) */}
            <div style={{ 
              marginTop: '20px',
              padding: '16px', 
              backgroundColor: '#f5f5f5', 
              borderRadius: '8px',
              border: '2px solid #262626'
            }}>
              <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: '600', color: '#262626' }}>
                Overall Rating (Auto-calculated)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ 
                  fontSize: '48px', 
                  fontWeight: '700', 
                  color: serviceOverallRating < 0 ? '#c62828' : serviceOverallRating === 0 ? '#757575' : '#2e7d32',
                  fontFamily: "'Poppins', sans-serif"
                }}>
                  {serviceOverallRating > 0 ? `+${serviceOverallRating}` : serviceOverallRating}
                </span>
                <div style={{ fontSize: '14px', color: '#737373' }}>
                  out of 5
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#737373', marginTop: '8px' }}>
                Average of Courtesy, Professionalism, Responsiveness, Efficiency, and Problem Resolution
              </div>
            </div>
          </div>
        )}

        {/* Rate These Aspects (for Food) */}
        {reviewCategory === 'Food' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Rate These Aspects (-5 to +5)</label>
            {/* Taste */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>Taste</div>
                <span style={{ fontSize: '16px', fontWeight: '700', color: tasteRating < 0 ? '#c62828' : tasteRating === 0 ? '#757575' : '#2e7d32', minWidth: '35px', textAlign: 'right' }}>{tasteRating > 0 ? `+${tasteRating}` : tasteRating}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input type="range" min="-5" max="5" step="1" value={tasteRating} onChange={(e) => setTasteRating(Number(e.target.value))} style={{ flex: 1, height: '6px', borderRadius: '3px', background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`, outline: 'none', cursor: 'pointer' }} />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>
            {/* Texture */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>Texture</div>
                <span style={{ fontSize: '16px', fontWeight: '700', color: textureRating < 0 ? '#c62828' : textureRating === 0 ? '#757575' : '#2e7d32', minWidth: '35px', textAlign: 'right' }}>{textureRating > 0 ? `+${textureRating}` : textureRating}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input type="range" min="-5" max="5" step="1" value={textureRating} onChange={(e) => setTextureRating(Number(e.target.value))} style={{ flex: 1, height: '6px', borderRadius: '3px', background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`, outline: 'none', cursor: 'pointer' }} />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>
            {/* Freshness */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>Freshness</div>
                <span style={{ fontSize: '16px', fontWeight: '700', color: freshnessRating < 0 ? '#c62828' : freshnessRating === 0 ? '#757575' : '#2e7d32', minWidth: '35px', textAlign: 'right' }}>{freshnessRating > 0 ? `+${freshnessRating}` : freshnessRating}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input type="range" min="-5" max="5" step="1" value={freshnessRating} onChange={(e) => setFreshnessRating(Number(e.target.value))} style={{ flex: 1, height: '6px', borderRadius: '3px', background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`, outline: 'none', cursor: 'pointer' }} />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>
            {/* Presentation */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>Presentation</div>
                <span style={{ fontSize: '16px', fontWeight: '700', color: presentationRating < 0 ? '#c62828' : presentationRating === 0 ? '#757575' : '#2e7d32', minWidth: '35px', textAlign: 'right' }}>{presentationRating > 0 ? `+${presentationRating}` : presentationRating}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input type="range" min="-5" max="5" step="1" value={presentationRating} onChange={(e) => setPresentationRating(Number(e.target.value))} style={{ flex: 1, height: '6px', borderRadius: '3px', background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`, outline: 'none', cursor: 'pointer' }} />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>
            {/* Value for Money */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>Value for Money</div>
                <span style={{ fontSize: '16px', fontWeight: '700', color: foodValueRating < 0 ? '#c62828' : foodValueRating === 0 ? '#757575' : '#2e7d32', minWidth: '35px', textAlign: 'right' }}>{foodValueRating > 0 ? `+${foodValueRating}` : foodValueRating}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input type="range" min="-5" max="5" step="1" value={foodValueRating} onChange={(e) => setFoodValueRating(Number(e.target.value))} style={{ flex: 1, height: '6px', borderRadius: '3px', background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`, outline: 'none', cursor: 'pointer' }} />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>
            {/* Overall */}
            <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px', border: '2px solid #262626' }}>
              <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: '600', color: '#262626' }}>Overall Rating (Auto-calculated)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '48px', fontWeight: '700', color: foodOverallRating < 0 ? '#c62828' : foodOverallRating === 0 ? '#757575' : '#2e7d32', fontFamily: "'Poppins', sans-serif" }}>{foodOverallRating > 0 ? `+${foodOverallRating}` : foodOverallRating}</span>
                <div style={{ fontSize: '14px', color: '#737373' }}>out of 5</div>
              </div>
              <div style={{ fontSize: '12px', color: '#737373', marginTop: '8px' }}>Average of Taste, Texture, Freshness, Presentation, and Value for Money</div>
            </div>
          </div>
        )}

        {/* Rate These Aspects (for Establishment) */}
        {reviewCategory === 'Establishment' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Rate These Aspects (-5 to +5)</label>
            {/* Cleanliness */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>Cleanliness</div>
                <span style={{ fontSize: '16px', fontWeight: '700', color: cleanlinessRating < 0 ? '#c62828' : cleanlinessRating === 0 ? '#757575' : '#2e7d32', minWidth: '35px', textAlign: 'right' }}>{cleanlinessRating > 0 ? `+${cleanlinessRating}` : cleanlinessRating}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input type="range" min="-5" max="5" step="1" value={cleanlinessRating} onChange={(e) => setCleanlinessRating(Number(e.target.value))} style={{ flex: 1, height: '6px', borderRadius: '3px', background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`, outline: 'none', cursor: 'pointer' }} />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>
            {/* Maintenance */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>Maintenance</div>
                <span style={{ fontSize: '16px', fontWeight: '700', color: maintenanceRating < 0 ? '#c62828' : maintenanceRating === 0 ? '#757575' : '#2e7d32', minWidth: '35px', textAlign: 'right' }}>{maintenanceRating > 0 ? `+${maintenanceRating}` : maintenanceRating}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input type="range" min="-5" max="5" step="1" value={maintenanceRating} onChange={(e) => setMaintenanceRating(Number(e.target.value))} style={{ flex: 1, height: '6px', borderRadius: '3px', background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`, outline: 'none', cursor: 'pointer' }} />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>
            {/* Location */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>Location</div>
                <span style={{ fontSize: '16px', fontWeight: '700', color: locationRating < 0 ? '#c62828' : locationRating === 0 ? '#757575' : '#2e7d32', minWidth: '35px', textAlign: 'right' }}>{locationRating > 0 ? `+${locationRating}` : locationRating}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input type="range" min="-5" max="5" step="1" value={locationRating} onChange={(e) => setLocationRating(Number(e.target.value))} style={{ flex: 1, height: '6px', borderRadius: '3px', background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`, outline: 'none', cursor: 'pointer' }} />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>
            {/* Amenities */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>Amenities</div>
                <span style={{ fontSize: '16px', fontWeight: '700', color: amenitiesRating < 0 ? '#c62828' : amenitiesRating === 0 ? '#757575' : '#2e7d32', minWidth: '35px', textAlign: 'right' }}>{amenitiesRating > 0 ? `+${amenitiesRating}` : amenitiesRating}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input type="range" min="-5" max="5" step="1" value={amenitiesRating} onChange={(e) => setAmenitiesRating(Number(e.target.value))} style={{ flex: 1, height: '6px', borderRadius: '3px', background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`, outline: 'none', cursor: 'pointer' }} />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>
            {/* Value for Money */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>Value for Money</div>
                <span style={{ fontSize: '16px', fontWeight: '700', color: valueForMoneyRating < 0 ? '#c62828' : valueForMoneyRating === 0 ? '#757575' : '#2e7d32', minWidth: '35px', textAlign: 'right' }}>{valueForMoneyRating > 0 ? `+${valueForMoneyRating}` : valueForMoneyRating}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input type="range" min="-5" max="5" step="1" value={valueForMoneyRating} onChange={(e) => setValueForMoneyRating(Number(e.target.value))} style={{ flex: 1, height: '6px', borderRadius: '3px', background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`, outline: 'none', cursor: 'pointer' }} />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>
            {/* Overall */}
            <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px', border: '2px solid #262626' }}>
              <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: '600', color: '#262626' }}>Overall Rating (Auto-calculated)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '48px', fontWeight: '700', color: placesOverallRating < 0 ? '#c62828' : placesOverallRating === 0 ? '#757575' : '#2e7d32', fontFamily: "'Poppins', sans-serif" }}>{placesOverallRating > 0 ? `+${placesOverallRating}` : placesOverallRating}</span>
                <div style={{ fontSize: '14px', color: '#737373' }}>out of 5</div>
              </div>
              <div style={{ fontSize: '12px', color: '#737373', marginTop: '8px' }}>Average of Cleanliness, Maintenance, Location, Amenities, and Value for Money</div>
            </div>

            {/* Include Service Review Checkbox */}
            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                <input
                  type="checkbox"
                  checked={includeServiceReview}
                  onChange={(e) => setIncludeServiceReview(e.target.checked)}
                  style={{ 
                    width: '18px', 
                    height: '18px', 
                    cursor: 'pointer',
                    accentColor: '#262626'
                  }}
                />
                Also rate the service at this establishment?
              </label>
            </div>

            {/* Service Ratings (when Include Service Review is checked) */}
            {includeServiceReview && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Rate Service Aspects (-5 to +5)</label>
                {/* Courtesy */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>Courtesy</div>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: courtesyRating < 0 ? '#c62828' : courtesyRating === 0 ? '#757575' : '#2e7d32', minWidth: '35px', textAlign: 'right' }}>{courtesyRating > 0 ? `+${courtesyRating}` : courtesyRating}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                    <input type="range" min="-5" max="5" step="1" value={courtesyRating} onChange={(e) => setCourtesyRating(Number(e.target.value))} style={{ flex: 1, height: '6px', borderRadius: '3px', background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`, outline: 'none', cursor: 'pointer' }} />
                    <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
                  </div>
                </div>
                {/* Professionalism */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>Professionalism</div>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: professionalismRating < 0 ? '#c62828' : professionalismRating === 0 ? '#757575' : '#2e7d32', minWidth: '35px', textAlign: 'right' }}>{professionalismRating > 0 ? `+${professionalismRating}` : professionalismRating}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                    <input type="range" min="-5" max="5" step="1" value={professionalismRating} onChange={(e) => setProfessionalismRating(Number(e.target.value))} style={{ flex: 1, height: '6px', borderRadius: '3px', background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`, outline: 'none', cursor: 'pointer' }} />
                    <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
                  </div>
                </div>
                {/* Responsiveness */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>Responsiveness</div>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: responsivenessRating < 0 ? '#c62828' : responsivenessRating === 0 ? '#757575' : '#2e7d32', minWidth: '35px', textAlign: 'right' }}>{responsivenessRating > 0 ? `+${responsivenessRating}` : responsivenessRating}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                    <input type="range" min="-5" max="5" step="1" value={responsivenessRating} onChange={(e) => setResponsivenessRating(Number(e.target.value))} style={{ flex: 1, height: '6px', borderRadius: '3px', background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`, outline: 'none', cursor: 'pointer' }} />
                    <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
                  </div>
                </div>
                {/* Efficiency */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>Efficiency</div>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: serviceValueRating < 0 ? '#c62828' : serviceValueRating === 0 ? '#757575' : '#2e7d32', minWidth: '35px', textAlign: 'right' }}>{serviceValueRating > 0 ? `+${serviceValueRating}` : serviceValueRating}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                    <input type="range" min="-5" max="5" step="1" value={serviceValueRating} onChange={(e) => setServiceValueRating(Number(e.target.value))} style={{ flex: 1, height: '6px', borderRadius: '3px', background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`, outline: 'none', cursor: 'pointer' }} />
                    <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
                  </div>
                </div>
                {/* Problem Resolution */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>Problem Resolution</div>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: problemResolutionRating < 0 ? '#c62828' : problemResolutionRating === 0 ? '#757575' : '#2e7d32', minWidth: '35px', textAlign: 'right' }}>{problemResolutionRating > 0 ? `+${problemResolutionRating}` : problemResolutionRating}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                    <input type="range" min="-5" max="5" step="1" value={problemResolutionRating} onChange={(e) => setProblemResolutionRating(Number(e.target.value))} style={{ flex: 1, height: '6px', borderRadius: '3px', background: `linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)`, outline: 'none', cursor: 'pointer' }} />
                    <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
                  </div>
                </div>
                {/* Service Overall */}
                <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px', border: '2px solid #262626' }}>
                  <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: '600', color: '#262626' }}>Service Overall Rating (Auto-calculated)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '48px', fontWeight: '700', color: serviceOverallRating < 0 ? '#c62828' : serviceOverallRating === 0 ? '#757575' : '#2e7d32', fontFamily: "'Poppins', sans-serif" }}>{serviceOverallRating > 0 ? `+${serviceOverallRating}` : serviceOverallRating}</span>
                    <div style={{ fontSize: '14px', color: '#737373' }}>out of 5</div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#737373', marginTop: '8px' }}>Average of Courtesy, Professionalism, Responsiveness, Efficiency, and Problem Resolution</div>
                </div>
              </div>
            )}
          </div>
        )}

        <div
          style={{
            marginBottom: '20px',
            padding: '14px',
            border: '1px solid #dbdbdb',
            borderRadius: '8px',
            backgroundColor: '#fafafa'
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <input
              type="checkbox"
              checked={includeCustomRating}
              onChange={(e) => setIncludeCustomRating(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#262626' }}
            />
            Add custom rating for {ratingTargetName}?
          </label>

          <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280' }}>
            If enabled, this will also contribute to overall and global ratings.
          </div>

          {includeCustomRating && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4b5563', marginBottom: '6px' }}>
                  Rating Name
                </label>
                <input
                  type="text"
                  value={customRatingName}
                  onChange={(e) => setCustomRatingName(e.target.value)}
                  placeholder="e.g., Service speed"
                  maxLength={80}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    fontFamily: "'Poppins', sans-serif"
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#262626' }}>{normalizedCustomRatingName}</div>
                <span
                  style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: customRating < 0 ? '#c62828' : customRating === 0 ? '#757575' : '#2e7d32',
                    minWidth: '35px',
                    textAlign: 'right'
                  }}
                >
                  {customRating > 0 ? `+${customRating}` : customRating}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#c62828', fontWeight: '600' }}>-5</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="1"
                  value={customRating}
                  onChange={(e) => setCustomRating(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: 'linear-gradient(to right, #c62828 0%, #757575 50%, #2e7d32 100%)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>+5</span>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || isBanned}
          className="btn-dark btn-large"
          title={isBanned ? 'Banned users cannot create posts' : undefined}
        >
          {loading ? 'Instant-ifying...' : 'Instrevi It!'}
        </button>
      </form>
    </div>
  );
};

export default CreateReview;
