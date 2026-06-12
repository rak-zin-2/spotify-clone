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
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [previousVolume, setPreviousVolume] = useState(0.8);
  const [isLoading, setIsLoading] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  
  // Shuffle state
  const [shuffledQueue, setShuffledQueue] = useState<string[]>([]);
  const [shuffledIndex, setShuffledIndex] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);

  // Generate new shuffled queue when shuffle is toggled on or queue changes
  useEffect(() => {
    if (shuffle && currentQueue.length > 0) {
      // Create a new shuffled queue
      const newShuffledQueue = [...currentQueue];
      // Fisher-Yates shuffle algorithm
      for (let i = newShuffledQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newShuffledQueue[i], newShuffledQueue[j]] = [newShuffledQueue[j], newShuffledQueue[i]];
      }
      
      // Find current song in shuffled queue and bring it to front
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

  // Update shuffled index when currentIndex changes in shuffle mode
  useEffect(() => {
    if (isShuffled && shuffledQueue.length > 0) {
      const currentSongTitle = currentQueue[currentIndex];
      const newIndex = shuffledQueue.findIndex(s => s === currentSongTitle);
      if (newIndex !== -1 && newIndex !== shuffledIndex) {
        setShuffledIndex(newIndex);
      }
    }
  }, [currentIndex, currentQueue, isShuffled, shuffledQueue, shuffledIndex]);

  const handleNext = useCallback(() => {
    if (repeat === "one") {
      // Replay current song
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
        setPlaying(true);
      }
      return;
    }

    if (isShuffled && shuffledQueue.length > 0) {
      // Shuffle mode
      if (shuffledIndex < shuffledQueue.length - 1) {
        // Go to next shuffled song
        const newIndex = shuffledIndex + 1;
        setShuffledIndex(newIndex);
        const nextSongTitle = shuffledQueue[newIndex];
        const originalIndex = currentQueue.findIndex(s => s === nextSongTitle);
        if (originalIndex !== -1) {
          setCurrentIndex(originalIndex);
        }
      } else if (repeat === "all") {
        // Loop back to first shuffled song and reshuffle
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
      } else {
        // End of shuffled queue, stop playing
        setPlaying(false);
      }
    } else {
      // Normal mode - use onNext from page.tsx (handles infinite loop)
      onNext();
    }
  }, [repeat, isShuffled, shuffledQueue, shuffledIndex, currentQueue, setCurrentIndex, onNext]);

  const handlePrev = useCallback(() => {
    if (repeat === "one") {
      // Restart current song
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
        setPlaying(true);
      }
      return;
    }

    if (isShuffled && shuffledQueue.length > 0) {
      // Shuffle mode
      if (shuffledIndex > 0) {
        // Go to previous shuffled song
        const newIndex = shuffledIndex - 1;
        setShuffledIndex(newIndex);
        const prevSongTitle = shuffledQueue[newIndex];
        const originalIndex = currentQueue.findIndex(s => s === prevSongTitle);
        if (originalIndex !== -1) {
          setCurrentIndex(originalIndex);
        }
      } else if (repeat === "all") {
        // Go to last song in shuffled queue
        const newIndex = shuffledQueue.length - 1;
        setShuffledIndex(newIndex);
        const prevSongTitle = shuffledQueue[newIndex];
        const originalIndex = currentQueue.findIndex(s => s === prevSongTitle);
        if (originalIndex !== -1) {
          setCurrentIndex(originalIndex);
        }
      } else {
        // At beginning, restart current song
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
        }
      }
    } else {
      // Normal mode - use onPrev from page.tsx (handles infinite loop)
      onPrev();
    }
  }, [repeat, isShuffled, shuffledQueue, shuffledIndex, currentQueue, setCurrentIndex, onPrev]);

  // Handle song end
  const handleSongEnd = useCallback(() => {
    if (repeat === "one") {
      // Replay the same song
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
        setPlaying(true);
      }
    } else {
      handleNext();
    }
  }, [repeat, handleNext]);

  // Load new song when currentSong changes
  useEffect(() => {
    if (!audioRef.current || !currentSong?.src) return;
    
    const audio = audioRef.current;
    
    // Reset states
    setAudioLoaded(false);
    setIsLoading(true);
    setProgress(0);
    
    // Check if we need to load a new song
    if (audio.src !== currentSong.src) {
      // Set new source
      audio.src = currentSong.src;
      audio.load();
    }
    
    // Set up event handlers for this song
    const handleCanPlayThrough = () => {
      setAudioLoaded(true);
      setIsLoading(false);
      // Auto-play if we were playing before
      if (playing || !audio.paused) {
        audio.play()
          .then(() => setPlaying(true))
          .catch((err) => {
            console.error("Auto-play failed:", err);
            setPlaying(false);
          });
      }
    };
    
    const handleError = (e: ErrorEvent) => {
      console.error("Audio loading error for:", currentSong.title, e);
      setIsLoading(false);
      setAudioLoaded(false);
    };
    
    const handlePlaying = () => {
      setPlaying(true);
    };
    
    const handlePause = () => {
      setPlaying(false);
    };
    
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('error', handleError);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    
    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
    };
  }, [currentSong, playing]);

  // Update volume when changed
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume]);

  // Update progress bar
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration && isFinite(audio.duration) && !isNaN(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100 || 0);
      } else {
        setProgress(0);
      }
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateProgress);
    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", updateProgress);
    };
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (!audioLoaded && isLoading) return;
    
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setPlaying(true))
        .catch((err) => {
          console.error("Play failed:", err);
          setPlaying(false);
        });
    }
  }, [playing, audioLoaded, isLoading]);

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
    if (!audioRef.current) return;
    const duration = audioRef.current.duration;
    if (!duration || isNaN(duration) || !isFinite(duration)) return;
    
    const percent = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const newTime = percent * duration;
    if (isFinite(newTime) && !isNaN(newTime)) {
      audioRef.current.currentTime = newTime;
    }
  }, []);

  const currentTime = audioRef.current?.currentTime || 0;
  const duration = audioRef.current?.duration || 0;
  const isValidDuration = duration && isFinite(duration) && !isNaN(duration);

  const getRepeatIcon = () => {
    if (repeat === "one") {
      return <Repeat size={16} className="md:w-4 md:h-4" />;
    }
    return <Repeat size={16} className="md:w-4 md:h-4" />;
  };

  // Add CSS animation keyframes to the document only once
  useEffect(() => {
    const styleId = 'music-player-animations';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-auto">
      <div className="bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-t-xl border-t border-blue-500/20 px-3 md:px-5 py-3 md:py-4">
        
        {/* Progress Bar - Thicker version */}
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

        {/* Main layout - grid ensures perfect centering */}
        <div className="grid grid-cols-3 items-center gap-2 md:gap-4">
          {/* LEFT - Rotating Photo + Song Info */}
          <div className="flex items-center gap-2 md:gap-3 justify-start min-w-0">
            <div
              className="flex-shrink-0"
              style={{
                animation: playing && audioLoaded && !isLoading ? "spin 4s linear infinite" : "none",
                willChange: "transform"
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

          {/* CENTER - Controls */}
          <div className="flex items-center justify-center gap-2 md:gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShuffle(!shuffle)}
              className={`p-1.5 md:p-2 rounded-full transition-all duration-200 ${
                shuffle ? "text-blue-400 bg-blue-500/20" : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
              aria-label="Shuffle"
            >
              <Shuffle size={14} className="md:w-4 md:h-4" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePrev}
              className="p-1.5 md:p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Previous"
            >
              <SkipBack size={16} className="md:w-5 md:h-5" />
            </motion.button>
            
            {/* Play/Pause Button - Perfect Circle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{ scale: playing && !isLoading ? [1, 1.05, 1] : 1 }}
              transition={{ duration: 0.3, repeat: playing && !isLoading ? Infinity : 0, repeatDelay: 2 }}
              onClick={togglePlay}
              disabled={isLoading}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 transition-all duration-200 flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0 disabled:opacity-50"
              aria-label={playing ? "Pause" : "Play"}
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
              aria-label="Next"
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
              aria-label="Repeat"
            >
              {getRepeatIcon()}
              {repeat === "one" && (
                <span className="absolute -top-1 -right-1 text-[8px] font-bold">1</span>
              )}
            </motion.button>
          </div>

          {/* RIGHT - Volume */}
          <div className="hidden lg:flex items-center gap-2 justify-end">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleMute}
              className="p-1.5 md:p-2 rounded-full hover:bg-white/10 transition"
              aria-label="Volume"
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
              aria-label="Volume slider"
            />
          </div>

          {/* Mobile placeholder */}
          <div className="flex lg:hidden" />
        </div>

        {/* Mobile song info below controls */}
        <div className="sm:hidden text-center mt-2">
          <h3 className="font-medium text-xs truncate text-white">{currentSong.title}</h3>
          <p className="text-blue-300/70 text-[10px] truncate">{currentSong.artist}</p>
        </div>

        <audio
          ref={audioRef}
          onEnded={handleSongEnd}
          onLoadedMetadata={() => {
            setProgress(0);
          }}
        />
      </div>
    </div>
  );
}