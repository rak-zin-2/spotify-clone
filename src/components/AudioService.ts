// components/AudioService.ts
"use client";

class AudioService {
  private audioElement: HTMLAudioElement | null = null;
  private preloadElement: HTMLAudioElement | null = null;
  private onEndCallback: (() => void) | null = null;
  private isUserPaused = false;
  private currentSrc: string = '';
  private nextSrc: string | null = null;
  private retryCount = 0;
  private maxRetries = 2;
  private wakeLock: any = null;
  private audioContext: AudioContext | null = null;
  private isLoading = false;
  private loadTimeout: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
      this.setupBackgroundPlayback();
    }
  }

  private init() {
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'auto';
    this.audioElement.setAttribute('playsinline', 'true');
    this.audioElement.setAttribute('webkit-playsinline', 'true');
    
    if ('audioSession' in this.audioElement) {
      (this.audioElement as any).audioSession.type = 'playback';
    }
    
    this.preloadElement = new Audio();
    this.preloadElement.crossOrigin = 'anonymous';
    this.preloadElement.preload = 'auto';
    this.preloadElement.volume = 0;
    this.preloadElement.setAttribute('playsinline', 'true');
    
    if ('mediaSession' in navigator) {
      this.setupMediaSession();
    }
    
    this.setupAudioElementEvents();
  }

  private setupAudioElementEvents() {
    if (!this.audioElement) return;
    
    // CRITICAL: When audio ends, call the callback
    this.audioElement.onended = () => {
      console.log('[AudioService] Audio ended');
      this.isLoading = false;
      if (this.onEndCallback) {
        console.log('[AudioService] Calling onEndCallback');
        this.onEndCallback();
      }
    };
    
    this.audioElement.oncanplaythrough = () => {
      console.log('[AudioService] Can play through');
      this.isLoading = false;
    };
    
    this.audioElement.onerror = (e) => {
      console.error('[AudioService] Audio error:', e);
      this.isLoading = false;
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        setTimeout(() => {
          if (this.currentSrc && this.audioElement) {
            this.audioElement.load();
          }
        }, 500);
      } else if (this.onEndCallback) {
        this.onEndCallback();
      }
    };
    
    this.audioElement.ontimeupdate = () => {
      this.updatePositionState();
    };
  }

  private setupBackgroundPlayback() {
    if (typeof window === 'undefined') return;
    
    try {
      // @ts-ignore
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      if (window.AudioContext) {
        this.audioContext = new AudioContext();
        this.audioContext.suspend();
      }
    } catch (e) {
      console.log('[AudioService] AudioContext not supported');
    }
    
    this.setupWakeLock();
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.audioElement && !this.audioElement.paused && !this.isUserPaused) {
        console.log('[AudioService] App in background, continuing playback');
      }
    });
    
    window.addEventListener('pagehide', () => {
      if (this.audioElement && !this.audioElement.paused && !this.isUserPaused) {
        localStorage.setItem('pavpav_was_playing', 'true');
      }
    });
    
    window.addEventListener('pageshow', () => {
      const wasPlaying = localStorage.getItem('pavpav_was_playing') === 'true';
      if (wasPlaying && this.audioElement && this.audioElement.paused && !this.isUserPaused) {
        console.log('[AudioService] Page showing, resuming playback');
        this.play();
        localStorage.removeItem('pavpav_was_playing');
      }
    });
  }

  private setupWakeLock() {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && this.audioElement && !this.audioElement.paused) {
        try {
          this.wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('[AudioService] Wake lock acquired');
        } catch (err) {
          console.log('[AudioService] Wake lock error:', err);
        }
      }
    };
    
    const releaseWakeLock = () => {
      if (this.wakeLock) {
        this.wakeLock.release();
        this.wakeLock = null;
      }
    };
    
    if (this.audioElement) {
      const originalPlay = this.audioElement.play;
      this.audioElement.play = function() {
        requestWakeLock();
        return originalPlay.apply(this, arguments as any);
      };
      
      this.audioElement.onpause = () => {
        releaseWakeLock();
      };
    }
  }

  preloadNextSong(src: string) {
    if (!src || src === this.currentSrc) return;
    
    console.log('[AudioService] Preloading next song');
    this.nextSrc = src;
    
    if (this.preloadElement) {
      this.preloadElement.src = '';
      this.preloadElement.src = src;
      this.preloadElement.load();
    }
  }

  private updatePositionState() {
    if (!('mediaSession' in navigator) || !this.audioElement) return;
    
    const duration = this.audioElement.duration;
    const position = this.audioElement.currentTime;
    
    if (duration && isFinite(duration) && !isNaN(duration) && duration > 0) {
      try {
        (navigator.mediaSession as any).setPositionState({
          duration: duration,
          position: position,
          playbackRate: 1
        });
      } catch (e) {}
    }
  }

  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    
    navigator.mediaSession.setActionHandler('play', () => {
      console.log('[AudioService] Lock screen: Play');
      this.isUserPaused = false;
      this.play();
    });
    
    navigator.mediaSession.setActionHandler('pause', () => {
      console.log('[AudioService] Lock screen: Pause');
      this.isUserPaused = true;
      this.pause();
    });
    
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      console.log('[AudioService] Lock screen: Previous');
      if (this.onPrevCallback) this.onPrevCallback();
    });
    
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      console.log('[AudioService] Lock screen: Next');
      if (this.onNextCallback) this.onNextCallback();
    });
    
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      if (this.audioElement && this.audioElement.duration) {
        const seekTime = (details.seekOffset || 15);
        this.audioElement.currentTime = Math.min(
          this.audioElement.currentTime + seekTime,
          this.audioElement.duration
        );
      }
    });
    
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      if (this.audioElement) {
        const seekTime = (details.seekOffset || 15);
        this.audioElement.currentTime = Math.max(
          this.audioElement.currentTime - seekTime,
          0
        );
      }
    });
    
    try {
      (navigator.mediaSession as any).setActionHandler('seekto', (details: any) => {
        if (this.audioElement && details.seekTime !== undefined && this.audioElement.duration) {
          this.audioElement.currentTime = Math.min(
            Math.max(details.seekTime, 0),
            this.audioElement.duration
          );
        }
      });
    } catch (e) {}
  }

  private onNextCallback: (() => void) | null = null;
  private onPrevCallback: (() => void) | null = null;
  private currentTitle: string = '';
  private currentArtist: string = '';
  private currentArtwork: string = '';

  setNextCallback(callback: () => void) {
    this.onNextCallback = callback;
  }

  setPrevCallback(callback: () => void) {
    this.onPrevCallback = callback;
  }

  setOnEndCallback(callback: () => void) {
    console.log('[AudioService] Setting onEndCallback');
    this.onEndCallback = callback;
  }

  // CRITICAL: setSrc with auto-play when needed
  setSrc(src: string) {
    if (!src || src === '') {
      console.error('[AudioService] Invalid audio source');
      return;
    }
    
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
      this.loadTimeout = null;
    }
    
    console.log('[AudioService] Setting audio source');
    this.currentSrc = src;
    this.retryCount = 0;
    this.isLoading = true;
    
    if (!this.audioElement) return;
    
    const wasPlaying = !this.audioElement.paused;
    
    this.audioElement.src = src;
    this.audioElement.load();
    
    this.loadTimeout = setTimeout(() => {
      console.log('[AudioService] Loading timeout');
      this.isLoading = false;
      this.loadTimeout = null;
    }, 3000);
    
    // CRITICAL: Auto-play if it was playing before OR if user didn't pause
    // This ensures next song auto-plays
    if (wasPlaying && !this.isUserPaused) {
      console.log('[AudioService] Auto-playing after load (was playing)');
      const tryPlay = () => {
        if (this.audioElement && this.audioElement.readyState >= 2) {
          this.audioElement.play()
            .then(() => console.log('[AudioService] Auto-play successful'))
            .catch(e => console.error('[AudioService] Auto-play failed:', e));
          this.isLoading = false;
          this.audioElement.removeEventListener('canplaythrough', tryPlay);
        }
      };
      this.audioElement.addEventListener('canplaythrough', tryPlay);
      setTimeout(tryPlay, 300);
    } else {
      console.log('[AudioService] Not auto-playing (wasPlaying=false or user paused)');
      setTimeout(() => {
        if (this.isLoading) {
          this.isLoading = false;
        }
      }, 1000);
    }
  }

  play() {
    if (!this.audioElement) return;
    
    if (!this.audioElement.src || this.audioElement.src === '') {
      console.error('[AudioService] No audio source set');
      return;
    }
    
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(e => console.log('AudioContext resume failed:', e));
    }
    
    this.isLoading = false;
    this.isUserPaused = false;
    
    const playPromise = this.audioElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('[AudioService] Play successful');
          this.setPlaybackState(true);
        })
        .catch(error => {
          console.error('[AudioService] Play failed:', error);
        });
    }
  }

  pause() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.isUserPaused = true;
      this.setPlaybackState(false);
      console.log('[AudioService] Paused');
    }
  }

  setVolume(volume: number) {
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, volume));
    }
  }

  setCurrentTime(time: number) {
    if (this.audioElement && this.audioElement.duration && !isNaN(this.audioElement.duration)) {
      this.audioElement.currentTime = time;
    }
  }

  getCurrentTime(): number {
    return this.audioElement?.currentTime || 0;
  }

  getDuration(): number {
    return this.audioElement?.duration || 0;
  }

  isPlaying(): boolean {
    return this.audioElement ? !this.audioElement.paused : false;
  }
  
  isUserPausedState(): boolean {
    return this.isUserPaused;
  }
  
  resetUserPauseState() {
    console.log('[AudioService] Resetting user pause state');
    this.isUserPaused = false;
  }

  updateMediaMetadata(title: string, artist: string, artworkUrl: string) {
    this.currentTitle = title;
    this.currentArtist = artist;
    this.currentArtwork = artworkUrl;
    
    if ('mediaSession' in navigator && navigator.mediaSession) {
      const artwork = [];
      
      if (artworkUrl && artworkUrl !== '') {
        artwork.push(
          { src: artworkUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '384x384', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' }
        );
      } else {
        artwork.push({ src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' });
      }
      
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'Unknown Song',
        artist: artist || 'Unknown Artist',
        album: 'PavPav',
        artwork: artwork
      });
    }
  }

  setPlaybackState(playing: boolean) {
    if ('mediaSession' in navigator && navigator.mediaSession) {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }
  }

  getAudioElement(): HTMLAudioElement | null {
    return this.audioElement;
  }
  
  destroy() {
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
    }
    if (this.wakeLock) {
      this.wakeLock.release();
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    if (this.preloadElement) {
      this.preloadElement.src = '';
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

export const audioService = new AudioService();