// components/MiniMusicPlayer.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, X, ChevronUp } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { audioService } from "./AudioService";

type Song = {
  title: string;
  artist: string;
  cover: string;
  src: string;
};

type Props = {
  currentSong: Song;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  progress: number;
  onSeek: (percent: number) => void;
};

export default function MiniMusicPlayer({
  currentSong,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  progress,
  onSeek,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(progress);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

  // Update local progress when prop changes
  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(progress);
    }
  }, [progress, isDragging]);

  // Auto-hide mini player when scrolling down, show when scrolling up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide mini player
        setIsVisible(false);
        if (hideTimeout) clearTimeout(hideTimeout);
      } else {
        // Scrolling up - show mini player
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, hideTimeout]);

  // Show mini player after 2 seconds of inactivity when hidden
  useEffect(() => {
    if (!isVisible) {
      const timeout = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isVisible]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    setLocalProgress(percent * 100);
    onSeek(percent);
  };

  const handleProgressDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    const handleMove = (moveEvent: MouseEvent) => {
      if (!progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const percent = Math.min(Math.max((moveEvent.clientX - rect.left) / rect.width, 0), 1);
      setLocalProgress(percent * 100);
    };
    
    const handleUp = () => {
      setIsDragging(false);
      onSeek(localProgress / 100);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  if (!currentSong?.title) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="fixed bottom-20 left-0 right-0 z-50 flex justify-center pointer-events-none md:bottom-24"
        >
          <motion.div
            layout
            className={`pointer-events-auto bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 ${
              isExpanded ? 'w-[300px] p-4' : 'w-auto max-w-[90vw] p-2'
            }`}
            animate={{ width: isExpanded ? 300 : 'auto' }}
            transition={{ type: "spring", damping: 25 }}
          >
            {!isExpanded ? (
              // Collapsed Mini Player
              <div className="flex items-center gap-3">
                {/* Album Art */}
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={currentSong.cover}
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Song Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate text-white">{currentSong.title}</h4>
                  <p className="text-xs text-gray-400 truncate">{currentSong.artist}</p>
                </div>
                
                {/* Progress Bar (mini) */}
                <div className="w-12">
                  <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                
                {/* Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={onPrev}
                    className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition"
                  >
                    <SkipBack size={14} className="text-white" />
                  </button>
                  <button
                    onClick={onTogglePlay}
                    className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-400 flex items-center justify-center transition shadow-lg shadow-blue-500/30"
                  >
                    {isPlaying ? (
                      <Pause size={14} className="text-white" />
                    ) : (
                      <Play size={14} className="text-white ml-0.5" />
                    )}
                  </button>
                  <button
                    onClick={onNext}
                    className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition"
                  >
                    <SkipForward size={14} className="text-white" />
                  </button>
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition ml-1"
                  >
                    <ChevronUp size={14} className="text-gray-400" />
                  </button>
                </div>
              </div>
            ) : (
              // Expanded Mini Player
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded-xl overflow-hidden">
                      <img
                        src={currentSong.cover}
                        alt={currentSong.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-white">{currentSong.title}</h4>
                      <p className="text-xs text-gray-400">{currentSong.artist}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center"
                  >
                    <X size={14} className="text-gray-400" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div>
                  <div
                    ref={progressBarRef}
                    className="h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer relative group"
                    onClick={handleProgressClick}
                    onMouseDown={handleProgressDragStart}
                  >
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full relative"
                      style={{ width: `${localProgress}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={onPrev}
                    className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition"
                  >
                    <SkipBack size={16} className="text-white" />
                  </button>
                  <button
                    onClick={onTogglePlay}
                    className="w-11 h-11 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 flex items-center justify-center transition shadow-lg shadow-blue-500/30"
                  >
                    {isPlaying ? (
                      <Pause size={18} className="text-white" />
                    ) : (
                      <Play size={18} className="text-white ml-0.5" />
                    )}
                  </button>
                  <button
                    onClick={onNext}
                    className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition"
                  >
                    <SkipForward size={16} className="text-white" />
                  </button>
                </div>

                {/* Close hint */}
                <p className="text-[10px] text-gray-500 text-center">
                  Tap the X to collapse
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}