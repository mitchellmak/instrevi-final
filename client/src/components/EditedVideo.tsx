import React from 'react';
import { MediaEditSettings } from '../types';

interface EditedVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  edit?: MediaEditSettings;
  onDurationResolved?: (duration: number) => void;
  segmentMode?: 'pause' | 'restart';
}

const EditedVideo: React.FC<EditedVideoProps> = ({
  edit,
  onDurationResolved,
  segmentMode = 'pause',
  onLoadedMetadata,
  onTimeUpdate,
  ...videoProps
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const trimStart = edit && edit.trimStart > 0 ? edit.trimStart : 0;
  const trimEnd = edit && edit.trimEnd > trimStart ? edit.trimEnd : 0;

  const seekToTrimStart = React.useCallback((video: HTMLVideoElement) => {
    if (!trimStart || !Number.isFinite(video.duration) || trimStart >= video.duration) {
      return;
    }

    try {
      video.currentTime = trimStart;
    } catch {
      // Ignore seek failures while metadata is still settling.
    }
  }, [trimStart]);

  const handleLoadedMetadata = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    onDurationResolved?.(video.duration || 0);
    seekToTrimStart(video);
    onLoadedMetadata?.(event);
  };

  const handleTimeUpdate = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;

    if (trimEnd > trimStart && trimEnd <= (video.duration || trimEnd) && video.currentTime >= trimEnd - 0.05) {
      if (segmentMode === 'restart') {
        seekToTrimStart(video);
        if (!video.paused) {
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => undefined);
          }
        }
      } else {
        video.pause();
        seekToTrimStart(video);
      }
    }

    onTimeUpdate?.(event);
  };

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 1) {
      return;
    }

    onDurationResolved?.(video.duration || 0);
    seekToTrimStart(video);
  }, [onDurationResolved, seekToTrimStart, videoProps.src]);

  return (
    <video
      {...videoProps}
      ref={videoRef}
      onLoadedMetadata={handleLoadedMetadata}
      onTimeUpdate={handleTimeUpdate}
    />
  );
};

export default EditedVideo;