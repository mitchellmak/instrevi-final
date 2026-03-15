import React from 'react';

interface SoundtrackPlayerProps extends React.AudioHTMLAttributes<HTMLAudioElement> {
  soundtrackVolume?: number;
}

const SoundtrackPlayer: React.FC<SoundtrackPlayerProps> = ({ soundtrackVolume = 70, ...audioProps }) => {
  const audioRef = React.useRef<HTMLAudioElement>(null);

  React.useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.volume = Math.min(1, Math.max(0, soundtrackVolume / 100));
  }, [soundtrackVolume, audioProps.src]);

  return <audio {...audioProps} ref={audioRef} />;
};

export default SoundtrackPlayer;