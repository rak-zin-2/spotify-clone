"use client";

import { useEffect, useRef, useState } from "react";
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

  // Get the current song title from the appropriate queue
  const getCurrentSongTitle = (): string => {
    if (isShuffled && shuffledQueue.length > 0) {
      return shuffledQueue[shuffledIndex];
    }
    return currentQueue[currentIndex];
  };

  // Handle next song
  const handleNext = () => {
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
  };

  // Handle previous song
  const handlePrev = () => {
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
  };

  // Handle song end
  const handleSongEnd = () => {
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
  };

  // Load new song when currentSong changes
  useEffect(() => {
    if (!audioRef.current) return;
    
    const currentAudioSrc = audioRef.current.src;
    const newSongSrc = currentSong.src;
    
    if (currentAudioSrc !== newSongSrc) {
      audioRef.current.src = newSongSrc;
      audioRef.current.load();
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  }, [currentSong]);

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
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
    };

    audio.addEventListener("timeupdate", updateProgress);
    return () => audio.removeEventListener("timeupdate", updateProgress);
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  const toggleMute = () => {
    if (volume > 0) {
      setPreviousVolume(volume);
      setVolume(0);
    } else {
      setVolume(previousVolume);
    }
  };

  const toggleRepeat = () => {
    setRepeat(prev => {
      if (prev === "off") return "all";
      if (prev === "all") return "one";
      return "off";
    });
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const seekAudio = (clientX: number, rect: DOMRect) => {
    if (!audioRef.current) return;
    const percent = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    audioRef.current.currentTime = percent * audioRef.current.duration;
  };

  const currentTime = audioRef.current?.currentTime || 0;
  const duration = audioRef.current?.duration || 0;

  const getRepeatIcon = () => {
    if (repeat === "one") {
      return <Repeat size={16} className="md:w-4 md:h-4" />;
    }
    return <Repeat size={16} className="md:w-4 md:h-4" />;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-auto">
      {/* Animated top progress bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-r-full"
          style={{ width: `${progress}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      <div className="bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-t-xl border-t border-blue-500/20 px-3 md:px-5 py-2 md:py-2.5">
        {/* Main layout - grid ensures perfect centering */}
        <div className="grid grid-cols-3 items-center gap-2 md:gap-4">
          {/* LEFT - Rotating Photo + Song Info */}
          <div className="flex items-center gap-2 md:gap-3 justify-start min-w-0">
            <motion.div
              animate={playing ? { rotate: 360 } : { rotate: 0 }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear",
                repeatType: "loop",
              }}
              className="flex-shrink-0"
            >
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-full overflow-hidden shadow-lg ring-2 ring-blue-500/30">
                <img
                  src={currentSong.cover}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
            <div className="min-w-0 hidden sm:block">
              <h3 className="font-medium text-xs md:text-sm truncate text-white">{currentSong.title}</h3>
              <p className="text-blue-300/70 text-[10px] md:text-xs truncate">{currentSong.artist}</p>
            </div>
          </div>

          {/* CENTER - Controls */}
          <div className="flex flex-col items-center justify-center gap-1 md:gap-1.5">
            <div className="flex items-center justify-center gap-3 md:gap-5">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShuffle(!shuffle)}
                className={`p-2 md:p-2.5 rounded-full transition-all duration-200 ${
                  shuffle ? "text-blue-400 bg-blue-500/20" : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <Shuffle size={16} className="md:w-4 md:h-4" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePrev}
                className="p-2 md:p-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                <SkipBack size={18} className="md:w-5 md:h-5" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{ scale: playing ? [1, 1.05, 1] : 1 }}
                transition={{ duration: 0.3, repeat: playing ? Infinity : 0, repeatDelay: 2 }}
                onClick={togglePlay}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 transition-all duration-200 flex items-center justify-center shadow-lg shadow-blue-500/30"
              >
                {playing ? (
                  <Pause size={18} className="md:w-5 md:h-5 text-white" />
                ) : (
                  <Play size={18} className="ml-0.5 md:w-5 md:h-5 text-white" />
                )}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
                className="p-2 md:p-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                <SkipForward size={18} className="md:w-5 md:h-5" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleRepeat}
                className={`p-2 md:p-2.5 rounded-full transition-all duration-200 relative ${
                  repeat !== "off" ? "text-blue-400 bg-blue-500/20" : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {getRepeatIcon()}
                {repeat === "one" && (
                  <span className="absolute -top-1 -right-1 text-[8px] font-bold">1</span>
                )}
              </motion.button>
            </div>

            {/* Progress Bar - Desktop */}
            <div className="hidden md:flex items-center justify-center gap-3 w-full max-w-2xl">
              <span className="text-xs text-blue-300/60 text-right w-10">{formatTime(currentTime)}</span>
              <div className="relative flex-1 w-full">
                <div
                  className="w-full h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer"
                  onPointerDown={(e) => {
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
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                  style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const seekBar = e.currentTarget.parentElement?.querySelector('.w-full.h-1');
                    if (seekBar) {
                      const rect = seekBar.getBoundingClientRect();
                      const move = (event: PointerEvent) => {
                        const percent = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
                        if (audioRef.current) {
                          audioRef.current.currentTime = percent * audioRef.current.duration;
                        }
                      };
                      const up = () => {
                        window.removeEventListener("pointermove", move);
                        window.removeEventListener("pointerup", up);
                      };
                      window.addEventListener("pointermove", move);
                      window.addEventListener("pointerup", up);
                    }
                  }}
                />
              </div>
              <span className="text-xs text-blue-300/60 text-left w-10">{formatTime(duration)}</span>
            </div>

            {/* Progress Bar - Mobile */}
            <div className="md:hidden w-full px-2">
              <div className="relative">
                <div
                  className="w-full h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer"
                  onPointerDown={(e) => {
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
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg cursor-pointer"
                  style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const seekBar = e.currentTarget.parentElement?.querySelector('.w-full.h-1');
                    if (seekBar) {
                      const rect = seekBar.getBoundingClientRect();
                      const move = (event: PointerEvent) => {
                        const percent = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
                        if (audioRef.current) {
                          audioRef.current.currentTime = percent * audioRef.current.duration;
                        }
                      };
                      const up = () => {
                        window.removeEventListener("pointermove", move);
                        window.removeEventListener("pointerup", up);
                      };
                      window.addEventListener("pointermove", move);
                      window.addEventListener("pointerup", up);
                    }
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-blue-300/50 mt-1 px-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* RIGHT - Volume */}
          <div className="hidden lg:flex items-center gap-3 justify-end">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleMute}
              className="p-2 rounded-full hover:bg-white/10 transition"
            >
              {volume === 0 ? <VolumeX size={18} className="text-blue-400" /> : <Volume2 size={18} className="text-blue-400" />}
            </motion.button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-24 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Mobile placeholder */}
          <div className="flex lg:hidden" />
        </div>

        {/* Mobile song info below controls */}
        <div className="sm:hidden text-center mt-2">
          <h3 className="font-medium text-sm truncate text-white">{currentSong.title}</h3>
          <p className="text-blue-300/70 text-xs truncate">{currentSong.artist}</p>
        </div>

        <audio
          ref={audioRef}
          src={currentSong.src}
          onEnded={handleSongEnd}
        />
      </div>
    </div>
  );
}