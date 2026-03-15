import React from 'react';
import { MediaAspectRatio, MediaOverlayPosition } from '../types';
import EditedVideo from './EditedVideo';
import SoundtrackPlayer from './SoundtrackPlayer';
import {
  ComposerMediaItem,
  ComposerSoundtrack,
  formatSeconds,
  getAspectRatioValue,
  getFrameSurfaceStyle,
  getMediaFilter,
  getMediaTransform,
} from '../utils/mediaEditing';

interface MediaComposerEditorProps {
  items: ComposerMediaItem[];
  onItemsChange: (items: ComposerMediaItem[]) => void;
  soundtrack: ComposerSoundtrack;
  onSoundtrackChange: (soundtrack: ComposerSoundtrack) => void;
}

const aspectOptions: Array<{ value: MediaAspectRatio; label: string }> = [
  { value: 'original', label: 'Original' },
  { value: 'square', label: 'Square' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
];

const captionOptions: Array<{ value: MediaOverlayPosition; label: string }> = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' },
];

interface PhotoLookPreset {
  id: string;
  label: string;
  brightness: number;
  contrast: number;
  saturation: number;
  clarity: number;
}

const photoLookPresets: PhotoLookPreset[] = [
  { id: 'natural', label: 'Natural', brightness: 100, contrast: 100, saturation: 100, clarity: 0 },
  { id: 'vivid', label: 'Vivid', brightness: 104, contrast: 116, saturation: 130, clarity: 12 },
  { id: 'film', label: 'Film', brightness: 102, contrast: 110, saturation: 92, clarity: 18 },
  { id: 'warm', label: 'Warm', brightness: 108, contrast: 104, saturation: 118, clarity: 6 },
  { id: 'cool', label: 'Cool', brightness: 98, contrast: 112, saturation: 94, clarity: 10 },
  { id: 'mono', label: 'Mono', brightness: 96, contrast: 128, saturation: 0, clarity: 20 },
];

type EditorTool = 'looks' | 'layout' | 'transform' | 'adjust' | 'caption' | 'trim' | 'music';

const toolMeta: Record<EditorTool, { label: string; mark: string; gradient: string }> = {
  looks:     { label: 'Looks',     mark: 'LK', gradient: 'linear-gradient(140deg, #fde68a, #f97316)' },
  layout:    { label: 'Layout',    mark: 'LY', gradient: 'linear-gradient(140deg, #c4b5fd, #7c3aed)' },
  transform: { label: 'Transform', mark: 'TF', gradient: 'linear-gradient(140deg, #99f6e4, #14b8a6)' },
  adjust:    { label: 'Adjust',    mark: 'FX', gradient: 'linear-gradient(140deg, #86efac, #16a34a)' },
  caption:   { label: 'Caption',   mark: 'TX', gradient: 'linear-gradient(140deg, #f9a8d4, #ec4899)' },
  trim:      { label: 'Trim',      mark: 'TM', gradient: 'linear-gradient(140deg, #fdba74, #f97316)' },
  music:     { label: 'Music',     mark: 'MU', gradient: 'linear-gradient(140deg, #a5b4fc, #4f46e5)' },
};

const optionPillStyle = (selected: boolean): React.CSSProperties => ({
  borderRadius: '8px',
  border: 'none',
  background: selected ? 'rgba(255,255,255,0.22)' : 'transparent',
  color: selected ? '#ffffff' : 'rgba(255,255,255,0.75)',
  padding: '7px 12px',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  letterSpacing: '0.01em',
  textShadow: '0 1px 5px rgba(0,0,0,0.85)',
  flex: '0 0 auto',
  whiteSpace: 'nowrap',
});

const buildCaptionPlacement = (position: MediaOverlayPosition): React.CSSProperties => {
  if (position === 'top') {
    return { top: 12 };
  }

  if (position === 'center') {
    return { top: '50%', transform: 'translateY(-50%)' };
  }

  return { bottom: 12 };
};

const RangeControl = ({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (nextValue: number) => void;
}) => (
  <div style={{ marginBottom: '14px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
      <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.07em', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{label}</span>
      <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', minWidth: '28px', textAlign: 'right', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      style={{ width: '100%', accentColor: '#f8fafc' }}
    />
  </div>
);

interface ToolButtonProps {
  tool: EditorTool;
  active: boolean;
  onClick: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({ tool, active, onClick }) => {
  const meta = toolMeta[tool];

  return (
    <button
      type="button"
      title={meta.label}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
        borderRadius: '12px',
        border: active ? '2px solid rgba(255,255,255,0.85)' : '1px solid rgba(255,255,255,0.25)',
        background: active ? 'rgba(15, 23, 42, 0.88)' : 'rgba(15, 23, 42, 0.48)',
        padding: '5px',
        cursor: 'pointer',
        boxShadow: active ? '0 0 0 3px rgba(255,255,255,0.15)' : 'none',
      }}
    >
      <span
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '9px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 800,
          letterSpacing: '0.07em',
          color: '#111827',
          background: meta.gradient,
          boxShadow: active ? '0 3px 12px rgba(15, 23, 42, 0.5)' : '0 2px 8px rgba(15, 23, 42, 0.28)',
        }}
      >
        {meta.mark}
      </span>
    </button>
  );
};

const MediaComposerEditor: React.FC<MediaComposerEditorProps> = ({
  items,
  onItemsChange,
  soundtrack,
  onSoundtrackChange,
}) => {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [activeTool, setActiveTool] = React.useState<EditorTool | null>(
    () => items.length > 0 && items[0].kind === 'video' ? 'trim' : 'looks'
  );
  const [showOriginalPreview, setShowOriginalPreview] = React.useState(false);
  const soundtrackInputRef = React.useRef<HTMLInputElement>(null);

  // Gesture state (no re-renders during gesture)
  const gestureRef = React.useRef<{
    mode: 'none' | 'drag' | 'pinch';
    startZoom: number;
    startDistance: number;
    startOffsetX: number;
    startOffsetY: number;
    startRotate: number;
    startAngle: number;
    startX: number;
    startY: number;
  }>({
    mode: 'none',
    startZoom: 1,
    startDistance: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    startRotate: 0,
    startAngle: 0,
    startX: 0,
    startY: 0,
  });

  // Stable ref so the window effect doesn't need updateActiveEdit in its deps
  const updateActiveEditRef = React.useRef<((patch: Partial<ComposerMediaItem['edit']>) => void) | null>(null);

  // Global mouse up/move for desktop drag — uses stable refs, empty deps is intentional
  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (gestureRef.current.mode !== 'drag') return;
      const dx = e.clientX - gestureRef.current.startX;
      const dy = e.clientY - gestureRef.current.startY;
      const scale = 40 / 220;
      updateActiveEditRef.current?.({
        offsetX: Math.min(40, Math.max(-40, gestureRef.current.startOffsetX + dx * scale)),
        offsetY: Math.min(40, Math.max(-40, gestureRef.current.startOffsetY + dy * scale)),
      });
    };
    const onUp = () => { gestureRef.current.mode = 'none'; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (activeIndex < items.length) {
      return;
    }

    setActiveIndex(items.length > 0 ? items.length - 1 : 0);
  }, [activeIndex, items.length]);

  const updateItem = React.useCallback((index: number, updater: (item: ComposerMediaItem) => ComposerMediaItem) => {
    onItemsChange(items.map((item, currentIndex) => (currentIndex === index ? updater(item) : item)));
  }, [items, onItemsChange]);

  const updateDuration = React.useCallback((duration: number) => {
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }

    updateItem(activeIndex, (item) => {
      if (Math.abs((item.duration || 0) - duration) < 0.25) {
        return item;
      }

      return {
        ...item,
        duration,
        edit: {
          ...item.edit,
          trimStart: Math.min(item.edit.trimStart, duration),
          trimEnd: item.edit.trimEnd > 0 ? Math.min(item.edit.trimEnd, duration) : item.edit.trimEnd,
        },
      };
    });
  }, [activeIndex, updateItem]);

  const activeMediaKind = items[activeIndex]?.kind;

  React.useEffect(() => {
    if (activeMediaKind !== 'image' && showOriginalPreview) {
      setShowOriginalPreview(false);
    }
  }, [activeMediaKind, showOriginalPreview]);

  React.useEffect(() => {
    if (!activeTool) {
      return;
    }

    if (activeMediaKind !== 'image' && activeTool === 'looks') {
      setActiveTool(activeMediaKind === 'video' ? 'trim' : 'adjust');
      return;
    }

    if (activeMediaKind !== 'video' && activeTool === 'trim') {
      setActiveTool(activeMediaKind === 'image' ? 'looks' : 'adjust');
    }
  }, [activeMediaKind, activeTool]);

  if (items.length === 0) {
    return null;
  }

  const activeItem = items[activeIndex];
  const activeEdit = activeItem.edit;
  const isPhoto = activeItem.kind === 'image';
  const showingRawPhoto = isPhoto && showOriginalPreview;
  const frameSurface = getFrameSurfaceStyle(activeEdit);
  const aspectRatio = getAspectRatioValue(activeEdit.aspectRatio);
  const effectiveTrimEnd = activeItem.kind === 'video' && activeItem.duration
    ? (activeEdit.trimEnd > 0 ? Math.min(activeEdit.trimEnd, activeItem.duration) : activeItem.duration)
    : 0;

  const activePhotoLookId = isPhoto
    ? photoLookPresets.find((preset) => (
      preset.brightness === activeEdit.brightness
      && preset.contrast === activeEdit.contrast
      && preset.saturation === activeEdit.saturation
      && preset.clarity === activeEdit.clarity
    ))?.id || 'custom'
    : '';

  const toolbarTools: EditorTool[] = isPhoto
    ? ['looks', 'layout', 'transform', 'adjust', 'caption', 'music']
    : ['layout', 'transform', 'adjust', 'caption', 'trim', 'music'];

  const updateActiveEdit = (patch: Partial<ComposerMediaItem['edit']>) => {
    if (showingRawPhoto) {
      setShowOriginalPreview(false);
    }

    updateItem(activeIndex, (item) => ({
      ...item,
      edit: {
        ...item.edit,
        ...patch,
      },
    }));
  };

  // Keep ref in sync so window gesture handler always has the latest version
  updateActiveEditRef.current = updateActiveEdit;

  // Touch gesture handlers for the transform tool
  const isTransformActive = activeTool === 'transform';

  const handlePreviewTouchStart = (e: React.TouchEvent) => {
    if (!isTransformActive) return;
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      gestureRef.current = {
        mode: 'pinch',
        startZoom: activeEdit.zoom,
        startDistance: Math.hypot(dx, dy),
        startOffsetX: activeEdit.offsetX,
        startOffsetY: activeEdit.offsetY,
        startRotate: activeEdit.rotate,
        startAngle: Math.atan2(dy, dx),
        startX: 0,
        startY: 0,
      };
    } else if (e.touches.length === 1) {
      gestureRef.current = {
        mode: 'drag',
        startZoom: activeEdit.zoom,
        startDistance: 0,
        startOffsetX: activeEdit.offsetX,
        startOffsetY: activeEdit.offsetY,
        startRotate: activeEdit.rotate,
        startAngle: 0,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
      };
    }
  };

  const handlePreviewTouchMove = (e: React.TouchEvent) => {
    if (!isTransformActive) return;
    if (gestureRef.current.mode === 'pinch' && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.hypot(dx, dy);
      const ratio = gestureRef.current.startDistance > 0 ? distance / gestureRef.current.startDistance : 1;
      const angle = Math.atan2(dy, dx);
      const rotateDelta = ((angle - gestureRef.current.startAngle) * 180) / Math.PI;
      const rotate = Math.min(180, Math.max(-180, gestureRef.current.startRotate + rotateDelta));

      updateActiveEdit({
        zoom: Math.min(2.4, Math.max(1.0, gestureRef.current.startZoom * ratio)),
        rotate,
      });
    } else if (gestureRef.current.mode === 'drag' && e.touches.length === 1) {
      const scale = 40 / 220;
      updateActiveEdit({
        offsetX: Math.min(40, Math.max(-40, gestureRef.current.startOffsetX + (e.touches[0].clientX - gestureRef.current.startX) * scale)),
        offsetY: Math.min(40, Math.max(-40, gestureRef.current.startOffsetY + (e.touches[0].clientY - gestureRef.current.startY) * scale)),
      });
    }
  };

  const handlePreviewMouseDown = (e: React.MouseEvent) => {
    if (!isTransformActive) return;
    e.preventDefault();
    gestureRef.current = {
      mode: 'drag',
      startZoom: activeEdit.zoom,
      startDistance: 0,
      startOffsetX: activeEdit.offsetX,
      startOffsetY: activeEdit.offsetY,
      startRotate: activeEdit.rotate,
      startAngle: 0,
      startX: e.clientX,
      startY: e.clientY,
    };
  };

  const handleSoundtrackPicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (soundtrack.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(soundtrack.previewUrl);
    }

    onSoundtrackChange({
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      volume: soundtrack.volume,
    });

    event.target.value = '';
  };

  const clearSoundtrack = () => {
    if (soundtrack.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(soundtrack.previewUrl);
    }

    onSoundtrackChange({
      file: null,
      previewUrl: '',
      name: '',
      volume: soundtrack.volume,
    });
  };

  const resetAdjustments = () => {
    setShowOriginalPreview(false);
    updateActiveEdit({
      frameStyle: 'clean',
      aspectRatio: 'original',
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      rotate: 0,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      clarity: 0,
      ...(activeItem.kind === 'video' ? { trimStart: 0, trimEnd: 0 } : {}),
    });
  };

  const renderToolPanelBody = () => {
    if (!activeTool) {
      return null;
    }

    if (activeTool === 'looks') {
      return (
        <>
          <div style={{ display: 'flex', overflowX: 'auto', gap: '4px', padding: '2px 0 4px', scrollbarWidth: 'none' }}>
            {photoLookPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => updateActiveEdit({
                  brightness: preset.brightness,
                  contrast: preset.contrast,
                  saturation: preset.saturation,
                  clarity: preset.clarity,
                })}
                style={optionPillStyle(activePhotoLookId === preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {activePhotoLookId === 'custom' && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.02em' }}>
              Custom look active
            </div>
          )}
        </>
      );
    }

    if (activeTool === 'layout') {
      return (
        <div style={{ display: 'flex', overflowX: 'auto', gap: '4px', padding: '2px 0 4px', scrollbarWidth: 'none' }}>
          {aspectOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateActiveEdit({ aspectRatio: option.value })}
              style={optionPillStyle(activeEdit.aspectRatio === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      );
    }

    if (activeTool === 'transform') {
      return (
        <>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginBottom: '12px', lineHeight: 1.6, textShadow: '0 1px 5px rgba(0,0,0,0.85)' }}>
            <strong style={{ color: '#fff' }}>Pinch</strong> to zoom &nbsp;·&nbsp; <strong style={{ color: '#fff' }}>Twist</strong> to rotate &nbsp;·&nbsp; <strong style={{ color: '#fff' }}>Drag</strong> to reposition
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>Zoom</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{Math.round(activeEdit.zoom * 100)}%</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>Rotate</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{Math.round(activeEdit.rotate)} deg</span>
            </div>
          </div>

          <div style={{ display: 'flex', overflowX: 'auto', gap: '4px', padding: '2px 0 4px', marginBottom: '8px', scrollbarWidth: 'none' }}>
            <button
              type="button"
              onClick={() => updateActiveEdit({ rotate: Math.max(-180, activeEdit.rotate - 15) })}
              style={optionPillStyle(false)}
            >
              -15 deg
            </button>
            <button
              type="button"
              onClick={() => updateActiveEdit({ rotate: 0 })}
              style={optionPillStyle(false)}
            >
              0 deg
            </button>
            <button
              type="button"
              onClick={() => updateActiveEdit({ rotate: Math.min(180, activeEdit.rotate + 15) })}
              style={optionPillStyle(false)}
            >
              +15 deg
            </button>
          </div>

          <button
            type="button"
            onClick={() => updateActiveEdit({ zoom: 1, offsetX: 0, offsetY: 0, rotate: 0 })}
            style={optionPillStyle(false)}
          >
            Reset position
          </button>
        </>
      );
    }

    if (activeTool === 'adjust') {
      return (
        <>
          <RangeControl label="Brightness" min={60} max={150} step={1} value={activeEdit.brightness} onChange={(value) => updateActiveEdit({ brightness: value })} />
          <RangeControl label="Contrast" min={60} max={150} step={1} value={activeEdit.contrast} onChange={(value) => updateActiveEdit({ contrast: value })} />
          <RangeControl label="Saturation" min={0} max={170} step={1} value={activeEdit.saturation} onChange={(value) => updateActiveEdit({ saturation: value })} />
          <RangeControl label="Clarity" min={0} max={50} step={1} value={activeEdit.clarity} onChange={(value) => updateActiveEdit({ clarity: value })} />

          <button
            type="button"
            onClick={resetAdjustments}
            style={optionPillStyle(false)}
          >
            Reset adjustments
          </button>
        </>
      );
    }

    if (activeTool === 'caption') {
      return (
        <>
          <input
            type="text"
            value={activeEdit.overlayText}
            onChange={(event) => updateActiveEdit({ overlayText: event.target.value.slice(0, 120) })}
            placeholder="Short caption that sits on the media"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '10px',
              fontSize: '13px',
              marginBottom: '8px',
              boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.09)',
              color: '#f1f5f9',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', overflowX: 'auto', gap: '4px', padding: '2px 0 4px', scrollbarWidth: 'none' }}>
            {captionOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateActiveEdit({ overlayPosition: option.value })}
                style={optionPillStyle(activeEdit.overlayPosition === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      );
    }

    if (activeTool === 'trim') {
      if (activeItem.kind !== 'video') {
        return <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Trim is available for videos.</div>;
      }

      if (!activeItem.duration) {
        return <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Video duration will appear after the preview loads.</div>;
      }

      return (
        <>
          <RangeControl
            label="Start"
            min={0}
            max={Math.max(0, Math.floor(activeItem.duration))}
            step={1}
            value={Math.min(Math.floor(activeEdit.trimStart), Math.floor(activeItem.duration))}
            onChange={(value) => {
              const nextEnd = effectiveTrimEnd > 0 ? Math.max(value + 1, effectiveTrimEnd) : 0;
              updateActiveEdit({
                trimStart: value,
                trimEnd: nextEnd > 0 && activeItem.duration ? Math.min(nextEnd, activeItem.duration) : nextEnd,
              });
            }}
          />
          <RangeControl
            label="End"
            min={Math.min(Math.floor(activeEdit.trimStart + 1), Math.floor(activeItem.duration))}
            max={Math.max(1, Math.floor(activeItem.duration))}
            step={1}
            value={Math.max(Math.floor(activeEdit.trimStart + 1), Math.floor(effectiveTrimEnd || activeItem.duration))}
            onChange={(value) => updateActiveEdit({ trimEnd: value })}
          />
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
            Clip: {formatSeconds(activeEdit.trimStart)} — {formatSeconds(effectiveTrimEnd || activeItem.duration)}
          </div>
        </>
      );
    }

    return (
      <>
        <div style={{ display: 'flex', overflowX: 'auto', gap: '4px', flexWrap: 'nowrap', marginBottom: '10px', scrollbarWidth: 'none' }}>
          <button type="button" onClick={() => soundtrackInputRef.current?.click()} style={optionPillStyle(false)}>
            {soundtrack.file ? 'Replace Music' : 'Upload Music'}
          </button>
          {soundtrack.file && (
            <button type="button" onClick={clearSoundtrack} style={optionPillStyle(false)}>
              Remove Music
            </button>
          )}
        </div>
        <input ref={soundtrackInputRef} type="file" accept="audio/*" onChange={handleSoundtrackPicked} style={{ display: 'none' }} />

        {soundtrack.previewUrl ? (
          <>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
              {soundtrack.name || 'Attached soundtrack'}
            </div>
            <SoundtrackPlayer
              controls
              src={soundtrack.previewUrl}
              preload="metadata"
              soundtrackVolume={soundtrack.volume}
              style={{ width: '100%', marginBottom: '10px' }}
            />
            <RangeControl
              label="Music Volume"
              min={0}
              max={100}
              step={1}
              value={soundtrack.volume}
              onChange={(value) => onSoundtrackChange({ ...soundtrack, volume: value })}
            />
          </>
        ) : (
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
            Upload one audio track to play alongside the post in the feed.
          </div>
        )}
      </>
    );
  };

  return (
    <div
      style={{
        marginTop: '16px',
        padding: '18px',
        border: '1px solid #e5e7eb',
        borderRadius: '18px',
        background: 'linear-gradient(180deg, #ffffff 0%, #f7f8fb 100%)',
      }}
    >
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
          Media Studio
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          Edit your images and videos.
        </div>
      </div>

      <div
        style={{
          borderRadius: '24px',
          background: '#0f172a',
          padding: '14px',
          minHeight: '420px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 12% 8%, rgba(56,189,248,0.22), transparent 44%), radial-gradient(circle at 84% 16%, rgba(250,204,21,0.22), transparent 45%), radial-gradient(circle at 28% 88%, rgba(236,72,153,0.2), transparent 45%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            minHeight: '220px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: '100px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ width: '100%', maxWidth: '520px', ...frameSurface }}>
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio,
                minHeight: aspectRatio ? undefined : '320px',
                overflow: 'hidden',
                borderRadius: frameSurface.canvasBorderRadius,
                background: '#0b1120',
                cursor: isTransformActive ? (gestureRef.current.mode === 'drag' ? 'grabbing' : 'grab') : 'default',
                touchAction: isTransformActive ? 'none' : 'auto',
              }}
              onMouseDown={handlePreviewMouseDown}
              onTouchStart={handlePreviewTouchStart}
              onTouchMove={handlePreviewTouchMove}
              onTouchEnd={() => { gestureRef.current.mode = 'none'; }}
              onTouchCancel={() => { gestureRef.current.mode = 'none'; }}
            >
              {activeItem.kind === 'video' ? (
                <EditedVideo
                  src={activeItem.preview}
                  edit={activeEdit}
                  controls
                  playsInline
                  autoPlay
                  muted
                  loop
                  segmentMode="restart"
                  onDurationResolved={updateDuration}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: getMediaFilter(activeEdit),
                    transform: getMediaTransform(activeEdit),
                  }}
                />
              ) : (
                <img
                  src={activeItem.preview}
                  alt="Selected media preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: showingRawPhoto ? 'none' : getMediaFilter(activeEdit),
                    transform: showingRawPhoto ? 'none' : getMediaTransform(activeEdit),
                  }}
                />
              )}

              {activeEdit.overlayText.trim() && !showingRawPhoto && (
                <div
                  style={{
                    position: 'absolute',
                    left: 12,
                    right: 12,
                    textAlign: 'center',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    textShadow: '0 2px 12px rgba(0,0,0,0.6)',
                    pointerEvents: 'none',
                    ...buildCaptionPlacement(activeEdit.overlayPosition),
                  }}
                >
                  {activeEdit.overlayText}
                </div>
              )}
            </div>
          </div>
        </div>

        {isPhoto && (
          <button
            type="button"
            onClick={() => setShowOriginalPreview((current) => !current)}
            style={{
              position: 'absolute',
              zIndex: 3,
              top: 14,
              right: 14,
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.4)',
              background: 'rgba(15,23,42,0.52)',
              color: '#f8fafc',
              padding: '7px 12px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {showOriginalPreview ? 'Show edits' : 'Show original photo'}
          </button>
        )}

        <div
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: 12,
            zIndex: 3,
          }}
        >
          {activeTool && (
            <div
              style={{
                marginBottom: '8px',
                borderRadius: '18px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent',
                maxHeight: '200px',
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em', textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>{toolMeta[activeTool].label}</span>
                <button
                  type="button"
                  onClick={() => setActiveTool(null)}
                  style={{
                    border: 'none',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '14px',
                    lineHeight: 1,
                    borderRadius: '50%',
                    width: '22px',
                    height: '22px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ padding: '12px 14px' }}>
                {renderToolPanelBody()}
              </div>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              padding: '8px',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.28)',
              background: 'rgba(15, 23, 42, 0.58)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {toolbarTools.map((tool) => (
              <ToolButton
                key={tool}
                tool={tool}
                active={activeTool === tool}
                onClick={() => setActiveTool((current) => (current === tool ? null : tool))}
              />
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '8px', marginBottom: '6px', fontSize: '11px', color: '#9ca3af' }}>
        Tap an icon to open editing tools.
      </div>

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingTop: '4px' }}>
        {items.map((item, index) => (
          <button
            key={`${item.preview}-${index}`}
            type="button"
            onClick={() => {
              setActiveIndex(index);
              setShowOriginalPreview(false);
            }}
            style={{
              width: '76px',
              height: '76px',
              flex: '0 0 auto',
              borderRadius: '14px',
              border: index === activeIndex ? '2px solid #111827' : '1px solid #d1d5db',
              overflow: 'hidden',
              padding: 0,
              background: '#f8fafc',
              cursor: 'pointer',
            }}
          >
            {item.kind === 'video' ? (
              <video src={item.preview} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <img src={item.preview} alt={`Media ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MediaComposerEditor;