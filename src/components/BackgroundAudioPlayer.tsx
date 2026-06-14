"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Howl, Howler } from "howler";

type Song = {
  title: string;
  artist: string;
  cover: string;
  src: string;
};

type Props = {
  songs: Song[];
  currentSong: Song;
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  currentQueue: string[];
  onNext: () => void;
  onPrev: () => void;
  playing: boolean;
  setPlaying: (playing: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
  progress: number;
  setProgress: (progress: number) => void;
  duration: number;
  setDuration: (duration: number) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
};

export default function BackgroundAudioPlayer({
  songs,
  currentSong,
  currentIndex,
  setCurrentIndex,
  currentQueue,
  onNext,
  onPrev,
  playing,
  setPlaying,
  volume,
  setVolume,
  progress,
  setProgress,
  duration,
  setDuration,
  currentTime,
  setCurrentTime,
  isLoading,
  setIsLoading,
}: Props) {
  const soundRef = useRef<Howl | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Update volume when changed
  useEffect(() => {
    if (soundRef.current) {
      soundRef.current.volume(volume);
    }
    Howler.volume(volume);
  }, [volume]);

  // Clean up previous sound and load new one
  useEffect(() => {
    if (!currentSong?.src) return;

    // Unload previous sound
    if (soundRef.current) {
      soundRef.current.unload();
      soundRef.current = null;
    }

    setIsLoading(true);
    setIsLoaded(false);
    setDuration(0);
    setProgress(0);
    setCurrentTime(0);

    // Create new Howl instance with background playback support
    const sound = new Howl({
      src: [currentSong.src],
      html5: true, // Required for background playback on mobile
      format: ['mp3', 'wav', 'ogg', 'm4a', 'aac'],
      volume: volume,
      onload: () => {
        console.log("Audio loaded:", currentSong.title);
        setIsLoading(false);
        setIsLoaded(true);
        setDuration(sound.duration());
        
        // Auto-play if user has interacted or if was playing before
        if (hasUserInteracted || playing) {
          sound.play();
          setPlaying(true);
          startProgressUpdate(sound);
        }
      },
      onloaderror: (id, error) => {
        console.error("Audio load error:", error);
        setIsLoading(false);
        setIsLoaded(false);
      },
      onplay: () => {
        console.log("Audio playing:", currentSong.title);
        setPlaying(true);
        startProgressUpdate(sound);
      },
      onpause: () => {
        setPlaying(false);
        stopProgressUpdate();
      },
      onend: () => {
        console.log("Audio ended, playing next...");
        stopProgressUpdate();
        // Auto-play next song when current ends
        onNext();
      },
      onseek: () => {
        // Update progress after seeking
        if (soundRef.current) {
          const newTime = soundRef.current.seek() as number;
          setCurrentTime(newTime);
          setProgress((newTime / duration) * 100);
        }
      },
    });

    soundRef.current = sound;

    return () => {
      stopProgressUpdate();
      if (soundRef.current) {
        soundRef.current.unload();
        soundRef.current = null;
      }
    };
  }, [currentSong?.src, currentSong?.title]);

  // Update progress bar
  const startProgressUpdate = (sound: Howl) => {
    stopProgressUpdate();
    
    const updateProgress = () => {
      if (soundRef.current && soundRef.current.playing()) {
        const seek = soundRef.current.seek() as number;
        const dur = soundRef.current.duration();
        if (dur > 0) {
          setCurrentTime(seek);
          setProgress((seek / dur) * 100);
          setDuration(dur);
        }
        animationRef.current = requestAnimationFrame(updateProgress);
      }
    };
    
    animationRef.current = requestAnimationFrame(updateProgress);
  };

  const stopProgressUpdate = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  // Handle play/pause
  const togglePlay = useCallback(() => {
    if (!soundRef.current || isLoading) return;
    
    setHasUserInteracted(true);
    
    if (playing) {
      soundRef.current.pause();
      setPlaying(false);
    } else {
      soundRef.current.play();
      setPlaying(true);
    }
  }, [playing, isLoading]);

  // Handle seeking
  const seekAudio = useCallback((percent: number) => {
    if (!soundRef.current || !isLoaded) return;
    
    const duration = soundRef.current.duration();
    if (duration > 0) {
      const newTime = percent * duration;
      soundRef.current.seek(newTime);
      setCurrentTime(newTime);
      setProgress(percent * 100);
    }
  }, [isLoaded]);

  // Expose methods to parent component
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__audioPlayer = {
        togglePlay,
        seekAudio,
        getPlaying: () => playing,
      };
    }
  }, [togglePlay, seekAudio, playing]);

  return null; // This component doesn't render anything
}