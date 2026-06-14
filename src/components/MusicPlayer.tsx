"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Shuffle,
  SkipBack,
  SkipForward,
  Repeat,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import { audioService } from "./AudioService";

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
};

export default function MusicPlayer({
  songs,
  currentSong,
  currentIndex,
  setCurrentIndex,
  currentQueue,
  onNext,
  onPrev,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [previousVolume, setPreviousVolume] = useState(0.8);
  const [isLoading, setIsLoading] = useState(true);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isChangingSong, setIsChangingSong] = useState(false);
  
  const [shuffledQueue, setShuffledQueue] = useState<string[]>([]);
  const [shuffledIndex, setShuffledIndex] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);

  // THIS IS THE KEY FUNCTION - handles next song (used by both skip button AND song end)
  const goToNextSong = useCallback(() => {
    console.log('[MusicPlayer] goToNextSong called');
    
    if (repeat === "one") {
      // Repeat one: just restart current song
      const audio = audioService.getAudioElement();
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
      return;
    }

    // Reset user pause state so next song auto-plays
    audioService.resetUserPauseState();

    if (isShuffled && shuffledQueue.length > 0) {
      if (shuffledIndex < shuffledQueue.length - 1) {
        const newIndex = shuffledIndex + 1;
        setShuffledIndex(newIndex);
        const nextSongTitle = shuffledQueue[newIndex];
        const originalIndex = currentQueue.findIndex(s => s === nextSongTitle);
        if (originalIndex !== -1) {
          setCurrentIndex(originalIndex);
        }
      } else if (repeat === "all") {
        const newShuffledQueue = [...currentQueue];
        for (let i = newShuffledQueue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newShuffledQueue[i], newShuffledQueue[j]] = [newShuffledQueue[j], newShuffledQueue[i]];
        }
        setShuffledQueue(newShuffledQueue);
        setShuffledIndex(0);
        const nextSongTitle = newShuffledQueue[0];
        const originalIndex = currentQueue.findIndex(s => s === nextSongTitle);
        if (originalIndex !== -1) {
          setCurrentIndex(originalIndex);
        }
      }
    } else {
      // THIS CALLS THE PARENT'S playNext FUNCTION WHICH UPDATES THE SONG
      onNext();
    }
  }, [repeat, isShuffled, shuffledQueue, shuffledIndex, currentQueue, setCurrentIndex, onNext]);

  // Skip button uses goToNextSong
  const handleNext = useCallback(() => {
    console.log('[MusicPlayer] Skip button pressed');
    goToNextSong();
  }, [goToNextSong]);

  const handlePrev = useCallback(() => {
    console.log('[MusicPlayer] handlePrev called');
    
    if (repeat === "one") {
      const audio = audioService.getAudioElement();
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        setPlaying(true);
      }
      return;
    }

    audioService.resetUserPauseState();

    if (isShuffled && shuffledQueue.length > 0) {
      if (shuffledIndex > 0) {
        const newIndex = shuffledIndex - 1;
        setShuffledIndex(newIndex);
        const prevSongTitle = shuffledQueue[newIndex];
        const originalIndex = currentQueue.findIndex(s => s === prevSongTitle);
        if (originalIndex !== -1) {
          setCurrentIndex(originalIndex);
        }
      } else if (repeat === "all") {
        const newIndex = shuffledQueue.length - 1;
        setShuffledIndex(newIndex);
        const prevSongTitle = shuffledQueue[newIndex];
        const originalIndex = currentQueue.findIndex(s => s === prevSongTitle);
        if (originalIndex !== -1) {
          setCurrentIndex(originalIndex);
        }
      } else {
        const audio = audioService.getAudioElement();
        if (audio && audio.currentTime > 3) {
          audio.currentTime = 0;
        } else {
          onPrev();
        }
      }
    } else {
      onPrev();
    }
  }, [repeat, isShuffled, shuffledQueue, shuffledIndex, currentQueue, setCurrentIndex, onPrev]);

  // Initialize audio service callbacks
  useEffect(() => {
    audioService.setNextCallback(() => {
      console.log('Next track triggered from lock screen');
      goToNextSong();
    });
    
    audioService.setPrevCallback(() => {
      console.log('Previous track triggered from lock screen');
      handlePrev();
    });
    
    // CRITICAL: When song ends, call goToNextSong (same as skip button!)
    audioService.setOnEndCallback(() => {
      console.log('Song ended callback from audioService - calling goToNextSong');
      if (!audioService.isUserPausedState()) {
        goToNextSong();
      }
    });
  }, [goToNextSong, handlePrev]);

  // Update lock screen metadata
  useEffect(() => {
    if (currentSong) {
      audioService.updateMediaMetadata(
        currentSong.title,
        currentSong.artist,
        currentSong.cover
      );
    }
  }, [currentSong]);

  // Preload image for lock screen
  useEffect(() => {
    if (currentSong?.cover && currentSong?.cover !== '') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setTimeout(() => {
          audioService.updateMediaMetadata(
            currentSong.title,
            currentSong.artist,
            currentSong.cover
          );
        }, 100);
      };
      img.src = currentSong.cover;
    }
  }, [currentSong]);

  // Sync audio element with service
  useEffect(() => {
    if (currentSong?.src) {
      audioService.setSrc(currentSong.src);
    }
  }, [currentSong]);

  // Sync volume
  useEffect(() => {
    audioService.setVolume(volume);
  }, [volume]);

  // Sync play state
  useEffect(() => {
    audioService.setPlaybackState(playing);
  }, [playing]);

  // Generate shuffled queue
  useEffect(() => {
    if (shuffle && currentQueue.length > 0) {
      const newShuffledQueue = [...currentQueue];
      for (let i = newShuffledQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newShuffledQueue[i], newShuffledQueue[j]] = [newShuffledQueue[j], newShuffledQueue[i]];
      }
      
      const currentSongTitle = currentQueue[currentIndex];
      const currentSongIndex = newShuffledQueue.findIndex(s => s === currentSongTitle);
      if (currentSongIndex !== -1 && currentSongIndex !== 0) {
        [newShuffledQueue[0], newShuffledQueue[currentSongIndex]] = 
        [newShuffledQueue[currentSongIndex], newShuffledQueue[0]];
      }
      
      setShuffledQueue(newShuffledQueue);
      setShuffledIndex(0);
      setIsShuffled(true);
    } else if (!shuffle) {
      setIsShuffled(false);
      setShuffledQueue([]);
      setShuffledIndex(0);
    }
  }, [shuffle, currentQueue, currentIndex]);

  // Update shuffled index
  useEffect(() => {
    if (isShuffled && shuffledQueue.length > 0) {
      const currentSongTitle = currentQueue[currentIndex];
      const newIndex = shuffledQueue.findIndex(s => s === currentSongTitle);
      if (newIndex !== -1 && newIndex !== shuffledIndex) {
        setShuffledIndex(newIndex);
      }
    }
  }, [currentIndex, currentQueue, isShuffled, shuffledQueue, shuffledIndex]);

  // Load new song
  useEffect(() => {
    if (!currentSong?.src) return;
    
    const wasPlaying = playing;
    
    setAudioLoaded(false);
    setIsLoading(true);
    setProgress(0);
    
    audioService.setSrc(currentSong.src);
    
    const serviceAudio = audioService.getAudioElement();
    
    if (serviceAudio) {
      const handleCanPlayThrough = () => {
        setAudioLoaded(true);
        setIsLoading(false);
        setIsChangingSong(false);
        
        const shouldAutoPlay = (hasUserInteracted || wasPlaying) && !audioService.isUserPausedState();
        
        if (shouldAutoPlay && !isChangingSong) {
          console.log('Auto-playing next song:', currentSong.title);
          audioService.play();
          setPlaying(true);
        } else {
          setPlaying(false);
        }
        
        serviceAudio.removeEventListener('canplaythrough', handleCanPlayThrough);
      };
      
      const handleError = (e: Event) => {
        console.error("Audio loading error for:", currentSong.title, e);
        setIsLoading(false);
        setAudioLoaded(false);
        setIsChangingSong(false);
      };
      
      serviceAudio.addEventListener('canplaythrough', handleCanPlayThrough);
      serviceAudio.addEventListener('error', handleError);
      
      return () => {
        serviceAudio.removeEventListener('canplaythrough', handleCanPlayThrough);
        serviceAudio.removeEventListener('error', handleError);
      };
    }
  }, [currentSong, hasUserInteracted, isChangingSong, playing]);

  // Update progress bar
  useEffect(() => {
    const updateProgress = () => {
      const audio = audioService.getAudioElement();
      if (audio && audio.duration && isFinite(audio.duration) && !isNaN(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100 || 0);
      }
    };
    
    const interval = setInterval(updateProgress, 100);
    return () => clearInterval(interval);
  }, []);

  const togglePlay = useCallback(() => {
    console.log('togglePlay called');
    setHasUserInteracted(true);
    
    if (playing) {
      audioService.pause();
      setPlaying(false);
    } else {
      audioService.resetUserPauseState();
      audioService.play();
      setPlaying(true);
    }
  }, [playing]);

  const toggleMute = useCallback(() => {
    if (volume > 0) {
      setPreviousVolume(volume);
      setVolume(0);
    } else {
      setVolume(previousVolume);
    }
  }, [volume, previousVolume]);

  const toggleRepeat = useCallback(() => {
    setRepeat(prev => {
      if (prev === "off") return "all";
      if (prev === "all") return "one";
      return "off";
    });
  }, []);

  const formatTime = (time: number) => {
    if (!time || isNaN(time) || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const seekAudio = useCallback((clientX: number, rect: DOMRect) => {
    const audio = audioService.getAudioElement();
    if (!audio) return;
    
    const duration = audio.duration;
    if (!duration || isNaN(duration) || !isFinite(duration)) return;
    
    const percent = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const newTime = percent * duration;
    if (isFinite(newTime) && !isNaN(newTime)) {
      audioService.setCurrentTime(newTime);
    }
  }, []);

  const currentTime = audioService.getCurrentTime();
  const duration = audioService.getDuration();
  const isValidDuration = duration && isFinite(duration) && !isNaN(duration);

  const getRepeatIcon = () => {
    if (repeat === "one") {
      return <Repeat size={16} className="md:w-4 md:h-4" />;
    }
    return <Repeat size={16} className="md:w-4 md:h-4" />;
  };

  useEffect(() => {
    const styleId = 'music-player-animations';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-auto">
      <div className="bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-t-xl border-t border-blue-500/20 px-3 md:px-5 py-3 md:py-4">
        
        {/* Progress Bar */}
        <div className="w-full mb-3 md:mb-4 px-2">
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-[10px] md:text-xs text-blue-300/60 w-8 md:w-10">{formatTime(currentTime)}</span>
            <div className="relative flex-1">
              <div
                className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer"
                onPointerDown={(e) => {
                  if (!isValidDuration) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  seekAudio(e.clientX, rect);
                  const move = (event: PointerEvent) => seekAudio(event.clientX, rect);
                  const up = () => {
                    window.removeEventListener("pointermove", move);
                    window.removeEventListener("pointerup", up);
                  };
                  window.addEventListener("pointermove", move);
                  window.addEventListener("pointerup", up);
                }}
              >
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full relative"
                  style={{ width: `${progress}%` }}
                >
                  <div
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 md:w-3 md:h-3 bg-white rounded-full shadow-lg cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                    style={{ transform: 'translate(50%, -50%)' }}
                  />
                </div>
              </div>
            </div>
            <span className="text-[10px] md:text-xs text-blue-300/60 w-8 md:w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-3 items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3 justify-start min-w-0">
            <div
              className="flex-shrink-0"
              style={{
                animation: playing && audioLoaded && !isLoading ? "spin 4s linear infinite" : "none",
              }}
            >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden shadow-lg ring-2 ring-blue-500/30">
                <img
                  src={currentSong.cover}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="min-w-0 hidden sm:block">
              <h3 className="font-medium text-xs md:text-sm truncate text-white">{currentSong.title}</h3>
              <p className="text-blue-300/70 text-[10px] md:text-xs truncate">{currentSong.artist}</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 md:gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShuffle(!shuffle)}
              className={`p-1.5 md:p-2 rounded-full transition-all duration-200 ${
                shuffle ? "text-blue-400 bg-blue-500/20" : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <Shuffle size={14} className="md:w-4 md:h-4" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePrev}
              className="p-1.5 md:p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              <SkipBack size={16} className="md:w-5 md:h-5" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{ scale: playing && !isLoading ? [1, 1.05, 1] : 1 }}
              transition={{ duration: 0.3, repeat: playing && !isLoading ? Infinity : 0, repeatDelay: 2 }}
              onClick={togglePlay}
              disabled={isLoading}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 transition-all duration-200 flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : playing ? (
                <Pause size={16} className="md:w-5 md:h-5 text-white" />
              ) : (
                <Play size={16} className="ml-0.5 md:w-5 md:h-5 text-white" />
              )}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              className="p-1.5 md:p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              <SkipForward size={16} className="md:w-5 md:h-5" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleRepeat}
              className={`p-1.5 md:p-2 rounded-full transition-all duration-200 relative ${
                repeat !== "off" ? "text-blue-400 bg-blue-500/20" : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {getRepeatIcon()}
              {repeat === "one" && (
                <span className="absolute -top-1 -right-1 text-[8px] font-bold">1</span>
              )}
            </motion.button>
          </div>

          <div className="hidden lg:flex items-center gap-2 justify-end">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleMute}
              className="p-1.5 md:p-2 rounded-full hover:bg-white/10 transition"
            >
              {volume === 0 ? <VolumeX size={14} className="text-blue-400" /> : <Volume2 size={14} className="text-blue-400" />}
            </motion.button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-20 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div className="flex lg:hidden" />
        </div>

        <div className="sm:hidden text-center mt-2">
          <h3 className="font-medium text-xs truncate text-white">{currentSong.title}</h3>
          <p className="text-blue-300/70 text-[10px] truncate">{currentSong.artist}</p>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}