// components/DraggableMiniPlayer.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, X, ChevronUp, Minimize2, Maximize2, GripVertical } from "lucide-react";
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

export default function DraggableMiniPlayer({
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
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const dragRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 20, y: 100 });
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load saved position from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('pavpav_mini_player_position');
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        setPosition(pos);
        positionRef.current = pos;
      } catch (e) {}
    }
    
    const savedVisibility = localStorage.getItem('pavpav_mini_player_visible');
    if (savedVisibility !== null) {
      setIsVisible(savedVisibility === 'true');
    }
  }, []);

  // Save position to localStorage
  const savePosition = useCallback((newPosition: { x: number; y: number }) => {
    localStorage.setItem('pavpav_mini_player_position', JSON.stringify(newPosition));
    positionRef.current = newPosition;
  }, []);

  // Update local progress when prop changes
  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(progress);
    }
  }, [progress, isDragging]);

  // Auto-hide when scrolling (only on desktop)
  useEffect(() => {
    if (isMobile) return;
    
    let lastScrollY = 0;
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      } else {
        setIsVisible(true);
      }
      lastScrollY = currentScrollY;
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isMobile]);

  // Handle drag functionality (only on desktop)
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isMobile) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = { x: clientX - position.x, y: clientY - position.y };
    
    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const moveClientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const moveClientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const newX = Math.min(Math.max(moveClientX - dragStartRef.current.x, 0), window.innerWidth - 280);
      const newY = Math.min(Math.max(moveClientY - dragStartRef.current.y, 50), window.innerHeight - 150);
      setPosition({ x: newX, y: newY });
    };
    
    const handleUp = () => {
      setIsDragging(false);
      savePosition(position);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
    
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    setLocalProgress(percent * 100);
    onSeek(percent);
  };

  const handleProgressDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const handleMove = (moveEvent: MouseEvent) => {
      if (!progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const percent = Math.min(Math.max((moveEvent.clientX - rect.left) / rect.width, 0), 1);
      setLocalProgress(percent * 100);
    };
    
    const handleUp = () => {
      onSeek(localProgress / 100);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    localStorage.setItem('pavpav_mini_player_minimized', String(!isMinimized));
  };

  const closeMiniPlayer = () => {
    setIsVisible(false);
    localStorage.setItem('pavpav_mini_player_visible', 'false');
    // Dispatch event to notify MusicPlayer to update button icon
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('miniPlayerVisibilityChanged', { detail: { visible: false } }));
    }
  };

  // Don't show on mobile
  if (isMobile || !currentSong?.title || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={dragRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          x: position.x,
          y: position.y,
        }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", damping: 20 }}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 1000,
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        drag={false}
      >
        <div
          className={`bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 ${
            isMinimized ? 'w-auto' : isExpanded ? 'w-80' : 'w-72'
          }`}
          style={{ cursor: 'default' }}
        >
          {/* Drag Handle */}
          <div
            className="flex items-center justify-between px-3 pt-2 cursor-grab active:cursor-grabbing"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            <GripVertical size={14} className="text-gray-500" />
            <div className="flex items-center gap-1">
              <button
                onClick={toggleMinimize}
                className="p-1 rounded hover:bg-white/10 transition"
              >
                {isMinimized ? <Maximize2 size={12} className="text-gray-400" /> : <Minimize2 size={12} className="text-gray-400" />}
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded hover:bg-white/10 transition"
              >
                <ChevronUp size={12} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={closeMiniPlayer}
                className="p-1 rounded hover:bg-white/10 transition"
              >
                <X size={12} className="text-gray-400" />
              </button>
            </div>
          </div>

          {!isMinimized ? (
            <div className="p-3">
              {/* Song Info */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={currentSong.cover}
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate text-white">{currentSong.title}</h4>
                  <p className="text-xs text-gray-400 truncate">{currentSong.artist}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div
                  ref={progressBarRef}
                  className="h-1 bg-white/20 rounded-full overflow-hidden cursor-pointer group"
                  onClick={handleProgressClick}
                >
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full relative"
                    style={{ width: `${localProgress}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={onPrev}
                  className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition"
                >
                  <SkipBack size={14} className="text-white" />
                </button>
                <button
                  onClick={onTogglePlay}
                  className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 flex items-center justify-center transition shadow-lg shadow-blue-500/30"
                >
                  {isPlaying ? (
                    <Pause size={14} className="text-white" />
                  ) : (
                    <Play size={14} className="text-white ml-0.5" />
                  )}
                </button>
                <button
                  onClick={onNext}
                  className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition"
                >
                  <SkipForward size={14} className="text-white" />
                </button>
              </div>
            </div>
          ) : (
            /* Minimized view - just controls */
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="w-6 h-6 rounded-md overflow-hidden flex-shrink-0">
                <img
                  src={currentSong.cover}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-white">{currentSong.title}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={onPrev}
                  className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition"
                >
                  <SkipBack size={10} className="text-white" />
                </button>
                <button
                  onClick={onTogglePlay}
                  className="w-7 h-7 rounded-full bg-blue-500 hover:bg-blue-400 flex items-center justify-center transition"
                >
                  {isPlaying ? (
                    <Pause size={10} className="text-white" />
                  ) : (
                    <Play size={10} className="text-white ml-0.5" />
                  )}
                </button>
                <button
                  onClick={onNext}
                  className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition"
                >
                  <SkipForward size={10} className="text-white" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}