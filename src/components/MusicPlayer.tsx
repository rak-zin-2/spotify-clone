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
  
  const [shuffledQueue, setShuffledQueue] = useState<string[]>([]);
  const [shuffledIndex, setShuffledIndex] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);

  const isMounted = useRef(true);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleNext = useCallback(() => {
    console.log('[MusicPlayer] handleNext called, repeat:', repeat, 'currentIndex:', currentIndex);
    
    if (repeat === "one") {
      const audio = audioService.getAudioElement();
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.error('[MusicPlayer] Replay failed:', e));
        setPlaying(true);
      }
      return;
    }

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
      onNext();
    }
  }, [repeat, isShuffled, shuffledQueue, shuffledIndex, currentQueue, setCurrentIndex, onNext, currentIndex]);

  const handlePrev = useCallback(() => {
    console.log('[MusicPlayer] handlePrev called');
    
    if (repeat === "one") {
      const audio = audioService.getAudioElement();
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.error('[MusicPlayer] Replay failed:', e));
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

  const handleSongEnd = useCallback(() => {
    console.log('[MusicPlayer] handleSongEnd called, repeat:', repeat);
    
    if (!isMounted.current) return;
    
    setTimeout(() => {
      if (!isMounted.current) return;
      
      if (repeat === "one") {
        const audio = audioService.getAudioElement();
        if (audio) {
          audio.currentTime = 0;
          audio.play().catch(e => console.error('[MusicPlayer] Replay failed:', e));
          setPlaying(true);
        }
      } else {
        handleNext();
      }
    }, 50);
  }, [repeat, handleNext]);

  // Initialize audio service callbacks
  useEffect(() => {
    console.log('[MusicPlayer] Setting up audio service callbacks');
    
    audioService.setNextCallback(() => {
      console.log('[MusicPlayer] Next track from lock screen');
      handleNext();
    });
    
    audioService.setPrevCallback(() => {
      console.log('[MusicPlayer] Previous track from lock screen');
      handlePrev();
    });
    
    audioService.setOnEndCallback(() => {
      console.log('[MusicPlayer] End callback from audioService');
      handleSongEnd();
    });
    
    return () => {
      audioService.setOnEndCallback(() => {});
      audioService.setNextCallback(() => {});
      audioService.setPrevCallback(() => {});
    };
  }, [handleNext, handlePrev, handleSongEnd]);

  // Update lock screen metadata
  useEffect(() => {
    if (currentSong?.title) {
      console.log('[MusicPlayer] Updating lock screen metadata for:', currentSong.title);
      audioService.updateMediaMetadata(
        currentSong.title,
        currentSong.artist,
        currentSong.cover
      );
    }
  }, [currentSong]);

  // Preload image for lock screen
  useEffect(() => {
    if (currentSong?.cover) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        audioService.updateMediaMetadata(
          currentSong.title,
          currentSong.artist,
          currentSong.cover
        );
      };
      img.src = currentSong.cover;
    }
  }, [currentSong]);

  // Sync audio source
  useEffect(() => {
    if (currentSong?.src && isMounted.current) {
      console.log('[MusicPlayer] Setting audio source for:', currentSong.title);
      audioService.setSrc(currentSong.src);
    }
  }, [currentSong]);

  // Sync volume
  useEffect(() => {
    audioService.setVolume(volume);
  }, [volume]);

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

  // Load new song state
  useEffect(() => {
    if (!currentSong?.src) return;
    
    const wasPlaying = playing;
    console.log('[MusicPlayer] Loading new song:', currentSong.title, 'wasPlaying:', wasPlaying);
    
    setAudioLoaded(false);
    setIsLoading(true);
    setProgress(0);
    
    const serviceAudio = audioService.getAudioElement();
    
    if (serviceAudio) {
      const handleCanPlay = () => {
        setAudioLoaded(true);
        setIsLoading(false);
        
        if ((hasUserInteracted || wasPlaying) && !audioService.isUserPausedState()) {
          audioService.play();
          setPlaying(true);
        } else {
          setPlaying(false);
        }
        
        serviceAudio.removeEventListener('canplay', handleCanPlay);
      };
      
      const handleError = (e: Event) => {
        console.error("[MusicPlayer] Audio loading error:", e);
        setIsLoading(false);
      };
      
      serviceAudio.addEventListener('canplay', handleCanPlay);
      serviceAudio.addEventListener('error', handleError);
      
      return () => {
        serviceAudio.removeEventListener('canplay', handleCanPlay);
        serviceAudio.removeEventListener('error', handleError);
      };
    }
  }, [currentSong, hasUserInteracted, playing]);

  // Update progress bar
  useEffect(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    progressIntervalRef.current = setInterval(() => {
      const audio = audioService.getAudioElement();
      if (audio && audio.duration && isFinite(audio.duration) && !isNaN(audio.duration) && !audio.paused) {
        const newProgress = (audio.currentTime / audio.duration) * 100;
        setProgress(newProgress || 0);
      }
    }, 100);
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const togglePlay = useCallback(() => {
    console.log('[MusicPlayer] togglePlay called');
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
      setProgress(percent * 100);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const currentTime = audioService.getCurrentTime();
  const duration = audioService.getDuration();
  const isValidDuration = duration && isFinite(duration) && !isNaN(duration);

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
            <button
              onClick={() => setShuffle(!shuffle)}
              className={`p-1.5 md:p-2 rounded-full transition-all duration-200 ${
                shuffle ? "text-blue-400 bg-blue-500/20" : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <Shuffle size={16} className="md:w-4 md:h-4" />
            </button>
            
            <button
              onClick={handlePrev}
              className="p-1.5 md:p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              <SkipBack size={18} className="md:w-5 md:h-5" />
            </button>
            
            <button
              onClick={togglePlay}
              disabled={isLoading}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 transition-all duration-200 flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : playing ? (
                <Pause size={18} className="md:w-5 md:h-5 text-white" />
              ) : (
                <Play size={18} className="ml-0.5 md:w-5 md:h-5 text-white" />
              )}
            </button>
            
            <button
              onClick={handleNext}
              className="p-1.5 md:p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              <SkipForward size={18} className="md:w-5 md:h-5" />
            </button>
            
            <button
              onClick={toggleRepeat}
              className={`p-1.5 md:p-2 rounded-full transition-all duration-200 relative ${
                repeat !== "off" ? "text-blue-400 bg-blue-500/20" : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <Repeat size={16} className="md:w-4 md:h-4" />
              {repeat === "one" && (
                <span className="absolute -top-1 -right-1 text-[8px] font-bold">1</span>
              )}
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 justify-end">
            <button
              onClick={toggleMute}
              className="p-1.5 md:p-2 rounded-full hover:bg-white/10 transition"
            >
              {volume === 0 ? <VolumeX size={16} className="text-blue-400" /> : <Volume2 size={16} className="text-blue-400" />}
            </button>
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