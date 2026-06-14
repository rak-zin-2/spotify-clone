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
  private backgroundKeepAliveInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
      this.setupBackgroundPlayback();
      this.setupPWABackgroundPlayback();
    }
  }

  private init() {
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'auto';
    this.audioElement.setAttribute('playsinline', 'true');
    this.audioElement.setAttribute('webkit-playsinline', 'true');
    
    // Critical for iOS background audio
    this.audioElement.setAttribute('x-webkit-airplay', 'allow');
    
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
    
    this.audioElement.onended = () => {
      console.log('[AudioService] Audio ended');
      this.isLoading = false;
      if (this.onEndCallback) {
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

  private setupPWABackgroundPlayback() {
    if (typeof window === 'undefined') return;
    
    // Prevent the service worker from stopping audio
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        console.log('[AudioService] Service worker ready, keeping audio alive');
      });
    }
    
    // Keep audio alive when app is in background
    const keepAudioAlive = () => {
      if (this.audioElement && !this.audioElement.paused && !this.isUserPaused) {
        console.log('[AudioService] Keeping audio alive in background');
        // Touch the audio element to keep it active
        this.audioElement.play().catch(() => {});
      }
    };
    
    // Run keep alive every 3 seconds
    this.backgroundKeepAliveInterval = setInterval(keepAudioAlive, 3000);
    
    // Handle page visibility - CRITICAL for background playback
    document.addEventListener('visibilitychange', () => {
      console.log('[AudioService] Visibility changed:', document.hidden ? 'hidden' : 'visible');
      
      if (document.hidden && this.audioElement && !this.audioElement.paused && !this.isUserPaused) {
        console.log('[AudioService] App hidden, continuing background playback');
        // Force keep audio playing in background
        this.audioElement.play().catch((e) => console.error('Background play failed:', e));
      }
    });
    
    // Handle page hide (when app is closed/swiped away)
    window.addEventListener('pagehide', () => {
      console.log('[AudioService] Page hiding, storing playing state');
      if (this.audioElement && !this.audioElement.paused && !this.isUserPaused) {
        localStorage.setItem('pavpav_was_playing', 'true');
        localStorage.setItem('pavpav_playing_song', this.currentSrc);
        localStorage.setItem('pavpav_playing_time', String(this.audioElement.currentTime));
      }
    });
    
    // Handle page show (when app is reopened)
    window.addEventListener('pageshow', (event) => {
      console.log('[AudioService] Page showing, persisted:', event.persisted);
      
      const wasPlaying = localStorage.getItem('pavpav_was_playing') === 'true';
      const savedSrc = localStorage.getItem('pavpav_playing_song');
      
      if (wasPlaying && savedSrc && this.audioElement && this.audioElement.paused) {
        console.log('[AudioService] Resuming playback after page show');
        this.audioElement.src = savedSrc;
        this.audioElement.load();
        setTimeout(() => {
          this.audioElement?.play().catch(e => console.error('Resume play failed:', e));
        }, 100);
        localStorage.removeItem('pavpav_was_playing');
        localStorage.removeItem('pavpav_playing_song');
        localStorage.removeItem('pavpav_playing_time');
      }
    });
    
    // Handle beforeunload to keep audio alive
    window.addEventListener('beforeunload', () => {
      if (this.audioElement && !this.audioElement.paused && !this.isUserPaused) {
        console.log('[AudioService] Before unload, ensuring audio continues');
      }
    });
  }

  private setupBackgroundPlayback() {
    if (typeof window === 'undefined') return;
    
    // Create silent AudioContext to keep audio session alive
    try {
      // @ts-ignore
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        // Create silent gain node to keep context active
        const gain = this.audioContext.createGain();
        gain.gain.value = 0;
        gain.connect(this.audioContext.destination);
        // Keep context suspended until needed
        this.audioContext.suspend();
      }
    } catch (e) {
      console.log('[AudioService] AudioContext not supported');
    }
    
    this.setupWakeLock();
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
    
    console.log('[AudioService] Setting up MediaSession controls');
    
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
      console.log('[AudioService] Lock screen: Previous track');
      if (this.onPrevCallback) this.onPrevCallback();
    });
    
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      console.log('[AudioService] Lock screen: Next track');
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
    
    // Re-register handlers when app comes to foreground
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && 'mediaSession' in navigator) {
        console.log('[AudioService] App visible, re-registering media session handlers');
        navigator.mediaSession.setActionHandler('play', () => {
          this.isUserPaused = false;
          this.play();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          this.isUserPaused = true;
          this.pause();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          if (this.onPrevCallback) this.onPrevCallback();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          if (this.onNextCallback) this.onNextCallback();
        });
      }
    });
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
    this.onEndCallback = callback;
  }

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
    
    if (wasPlaying && !this.isUserPaused) {
      console.log('[AudioService] Auto-playing after load');
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
    
    // Resume AudioContext if suspended
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
          // Try again after short delay for iOS
          if (error.name === 'NotAllowedError') {
            setTimeout(() => {
              this.audioElement?.play().catch(() => {});
            }, 100);
          }
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
      
      // Force update position state
      this.updatePositionState();
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
    if (this.backgroundKeepAliveInterval) {
      clearInterval(this.backgroundKeepAliveInterval);
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