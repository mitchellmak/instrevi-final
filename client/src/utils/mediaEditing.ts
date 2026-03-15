import {
  MediaAspectRatio,
  MediaEditSettings,
  MediaFrameStyle,
  MediaKind,
  MediaOverlayPosition,
} from '../types';

export interface ComposerMediaItem {
  file: File;
  preview: string;
  kind: MediaKind;
  edit: MediaEditSettings;
  duration?: number;
}

export interface ComposerSoundtrack {
  file: File | null;
  previewUrl: string;
  name: string;
  volume: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const asNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const FRAME_STYLES: MediaFrameStyle[] = ['clean', 'polaroid', 'cinema', 'glow'];
const ASPECT_RATIOS: MediaAspectRatio[] = ['original', 'square', 'portrait', 'landscape'];
const OVERLAY_POSITIONS: MediaOverlayPosition[] = ['top', 'center', 'bottom'];

export const createDefaultMediaEdit = (kind: MediaKind): MediaEditSettings => ({
  kind,
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
  overlayText: '',
  overlayPosition: 'bottom',
  trimStart: 0,
  trimEnd: 0,
});

export const createEmptySoundtrack = (): ComposerSoundtrack => ({
  file: null,
  previewUrl: '',
  name: '',
  volume: 70,
});

export const normalizeMediaEdit = (value: unknown, fallbackKind: MediaKind): MediaEditSettings => {
  const record = value && typeof value === 'object' ? value as Partial<MediaEditSettings> : {};
  const kind = record.kind === 'video' ? 'video' : fallbackKind;

  return {
    kind,
    frameStyle: FRAME_STYLES.includes(record.frameStyle as MediaFrameStyle) ? record.frameStyle as MediaFrameStyle : 'clean',
    aspectRatio: ASPECT_RATIOS.includes(record.aspectRatio as MediaAspectRatio) ? record.aspectRatio as MediaAspectRatio : 'original',
    zoom: clamp(asNumber(record.zoom, 1), 1, 2.4),
    offsetX: clamp(asNumber(record.offsetX, 0), -40, 40),
    offsetY: clamp(asNumber(record.offsetY, 0), -40, 40),
    rotate: clamp(asNumber(record.rotate, 0), -180, 180),
    brightness: clamp(asNumber(record.brightness, 100), 60, 150),
    contrast: clamp(asNumber(record.contrast, 100), 60, 150),
    saturation: clamp(asNumber(record.saturation, 100), 0, 170),
    clarity: clamp(asNumber(record.clarity, 0), 0, 50),
    overlayText: typeof record.overlayText === 'string' ? record.overlayText.slice(0, 120) : '',
    overlayPosition: OVERLAY_POSITIONS.includes(record.overlayPosition as MediaOverlayPosition)
      ? record.overlayPosition as MediaOverlayPosition
      : 'bottom',
    trimStart: kind === 'video' ? clamp(asNumber(record.trimStart, 0), 0, 3600) : 0,
    trimEnd: kind === 'video' ? clamp(asNumber(record.trimEnd, 0), 0, 3600) : 0,
  };
};

export const getAspectRatioValue = (aspectRatio: MediaAspectRatio): string | undefined => {
  switch (aspectRatio) {
    case 'square':
      return '1 / 1';
    case 'portrait':
      return '4 / 5';
    case 'landscape':
      return '16 / 9';
    default:
      return undefined;
  }
};

export const getMediaFilter = (edit: MediaEditSettings): string => {
  const clarityContrast = clamp(edit.contrast + edit.clarity * 0.6, 60, 170);
  const claritySaturation = clamp(edit.saturation + edit.clarity * 0.4, 0, 180);

  return `brightness(${edit.brightness}%) contrast(${clarityContrast}%) saturate(${claritySaturation}%)`;
};

export const getMediaTransform = (edit: MediaEditSettings): string => {
  return `translate(${edit.offsetX}%, ${edit.offsetY}%) scale(${edit.zoom}) rotate(${edit.rotate}deg)`;
};

export const getFrameSurfaceStyle = (edit: MediaEditSettings) => {
  switch (edit.frameStyle) {
    case 'polaroid':
      return {
        background: '#fffdf8',
        padding: '12px 12px 34px',
        borderRadius: '22px',
        boxShadow: '0 20px 48px rgba(15, 23, 42, 0.22)',
        canvasBorderRadius: '14px',
      };
    case 'cinema':
      return {
        background: '#050505',
        padding: '18px 0',
        borderRadius: '22px',
        boxShadow: '0 18px 36px rgba(0, 0, 0, 0.35)',
        canvasBorderRadius: '0px',
      };
    case 'glow':
      return {
        background: 'linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04))',
        padding: '10px',
        borderRadius: '24px',
        boxShadow: '0 18px 42px rgba(29, 78, 216, 0.18)',
        canvasBorderRadius: '18px',
      };
    default:
      return {
        background: 'transparent',
        padding: '0px',
        borderRadius: '0px',
        boxShadow: 'none',
        canvasBorderRadius: '0px',
      };
  }
};

export const getOverlayCaptionPlacement = (position: MediaOverlayPosition) => {
  if (position === 'top') {
    return { top: 12, bottom: 'auto' };
  }

  if (position === 'center') {
    return { top: '50%', bottom: 'auto', transform: 'translateY(-50%)' };
  }

  return { top: 'auto', bottom: 12 };
};

export const formatSeconds = (value: number) => {
  const safeValue = Math.max(0, Math.floor(value));
  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};