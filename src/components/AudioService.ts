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
  private maxRetries = 5; // Increased retries for slow internet
  private wakeLock: any = null;
  private audioContext: AudioContext | null = null;
  private isLoading = false;
  private loadTimeout: NodeJS.Timeout | null = null;
  private backgroundKeepAliveInterval: NodeJS.Timeout | null = null;
  private savedPosition: number = 0; // Save position for resume
  private isWaitingForData: boolean = false;
  private connectionMonitorInterval: NodeJS.Timeout | null = null;
  private wasPlayingBeforeStall: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
      this.setupBackgroundPlayback();
      this.setupPWABackgroundPlayback();
      this.setupConnectionMonitoring();
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

  private setupConnectionMonitoring() {
    if (typeof window === 'undefined') return;
    
    // Monitor online/offline status
    window.addEventListener('online', () => {
      console.log('[AudioService] Internet connection restored');
      this.handleConnectionRestored();
    });
    
    window.addEventListener('offline', () => {
      console.log('[AudioService] Internet connection lost');
      this.handleConnectionLost();
    });
    
    // Monitor connection quality using Network Information API
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', () => {
          console.log('[AudioService] Connection changed:', connection.effectiveType);
          if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
            this.handleSlowConnection();
          } else if (connection.effectiveType === '4g' || connection.effectiveType === '3g') {
            this.handleGoodConnection();
          }
        });
      }
    }
  }

  private handleConnectionLost() {
    if (this.audioElement && !this.audioElement.paused && !this.isUserPaused) {
      console.log('[AudioService] Connection lost, saving position and pausing');
      this.savedPosition = this.audioElement.currentTime;
      this.wasPlayingBeforeStall = true;
      this.audioElement.pause();
      this.isWaitingForData = true;
      this.setPlaybackState(false);
    }
  }

  private handleConnectionRestored() {
    if (this.isWaitingForData && this.wasPlayingBeforeStall && this.currentSrc) {
      console.log('[AudioService] Connection restored, resuming from position:', this.savedPosition);
      this.resumeFromSavedPosition();
    }
    this.isWaitingForData = false;
  }

  private handleSlowConnection() {
    console.log('[AudioService] Slow connection detected, adjusting buffer');
    if (this.audioElement) {
      // Reduce buffer size for slow connections
      this.audioElement.preload = 'metadata';
    }
  }

  private handleGoodConnection() {
    console.log('[AudioService] Good connection detected');
    if (this.audioElement) {
      this.audioElement.preload = 'auto';
    }
  }

  private resumeFromSavedPosition() {
    if (!this.audioElement || !this.currentSrc) return;
    
    console.log('[AudioService] Resuming from saved position:', this.savedPosition);
    
    // Store the position we want to resume from
    const targetPosition = this.savedPosition;
    this.savedPosition = 0;
    this.wasPlayingBeforeStall = false;
    
    // Reload the audio
    this.audioElement.src = this.currentSrc;
    this.audioElement.load();
    
    // Wait for enough data then seek and play
    const onCanPlay = () => {
      if (this.audioElement && targetPosition > 0) {
        console.log('[AudioService] Seeking to saved position:', targetPosition);
        this.audioElement.currentTime = targetPosition;
        this.audioElement.play().catch(e => console.error('Resume play failed:', e));
        this.isUserPaused = false;
        this.setPlaybackState(true);
      }
      this.audioElement?.removeEventListener('canplay', onCanPlay);
    };
    
    this.audioElement.addEventListener('canplay', onCanPlay);
    
    // Fallback timeout
    setTimeout(() => {
      if (this.audioElement && targetPosition > 0) {
        this.audioElement.currentTime = targetPosition;
        this.audioElement.play().catch(() => {});
      }
      this.audioElement?.removeEventListener('canplay', onCanPlay);
    }, 2000);
  }

  private setupAudioElementEvents() {
    if (!this.audioElement) return;
    
    this.audioElement.onended = () => {
      console.log('[AudioService] Audio ended');
      this.isLoading = false;
      this.isWaitingForData = false;
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    };
    
    // Handle waiting/stalling (slow internet)
    this.audioElement.onwaiting = () => {
      console.log('[AudioService] Audio waiting for data (slow internet)');
      this.isLoading = true;
      this.isWaitingForData = true;
      if (!this.isUserPaused) {
        this.wasPlayingBeforeStall = true;
        this.savedPosition = this.audioElement?.currentTime || 0;
      }
    };
    
    this.audioElement.onstalled = () => {
      console.log('[AudioService] Audio stalled (connection issue)');
      this.isLoading = true;
      if (!this.isUserPaused) {
        this.savedPosition = this.audioElement?.currentTime || 0;
      }
    };
    
    this.audioElement.oncanplaythrough = () => {
      console.log('[AudioService] Can play through');
      this.isLoading = false;
      
      // If we were waiting and have a saved position, resume from there
      if (this.isWaitingForData && this.wasPlayingBeforeStall && this.savedPosition > 0) {
        console.log('[AudioService] Resuming after stall from position:', this.savedPosition);
        this.audioElement!.currentTime = this.savedPosition;
        this.audioElement!.play().catch(e => console.error('Resume after stall failed:', e));
        this.isWaitingForData = false;
        this.wasPlayingBeforeStall = false;
        this.savedPosition = 0;
      }
    };
    
    this.audioElement.onerror = (e) => {
      console.error('[AudioService] Audio error:', e);
      this.isLoading = false;
      
      // If error due to network, try to resume from saved position
      if (this.savedPosition > 0 && !this.isUserPaused) {
        console.log('[AudioService] Error occurred, retrying from position:', this.savedPosition);
        setTimeout(() => this.resumeFromSavedPosition(), 1000);
      } else if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`[AudioService] Retrying (${this.retryCount}/${this.maxRetries})...`);
        setTimeout(() => {
          if (this.currentSrc && this.audioElement) {
            this.audioElement.load();
          }
        }, 1000 * this.retryCount); // Exponential backoff
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
    
    // Handle page visibility
    document.addEventListener('visibilitychange', () => {
      console.log('[AudioService] Visibility changed:', document.hidden ? 'hidden' : 'visible');
      
      if (document.hidden && this.audioElement && !this.audioElement.paused && !this.isUserPaused) {
        console.log('[AudioService] App hidden, continuing background playback');
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
      const savedTime = parseFloat(localStorage.getItem('pavpav_playing_time') || '0');
      
      if (wasPlaying && savedSrc && this.audioElement && this.audioElement.paused) {
        console.log('[AudioService] Resuming playback from saved time:', savedTime);
        this.savedPosition = savedTime;
        this.resumeFromSavedPosition();
        localStorage.removeItem('pavpav_was_playing');
        localStorage.removeItem('pavpav_playing_song');
        localStorage.removeItem('pavpav_playing_time');
      }
    });
    
    window.addEventListener('beforeunload', () => {
      if (this.audioElement && !this.audioElement.paused && !this.isUserPaused) {
        localStorage.setItem('pavpav_was_playing', 'true');
        localStorage.setItem('pavpav_playing_song', this.currentSrc);
        localStorage.setItem('pavpav_playing_time', String(this.audioElement.currentTime));
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
        const gain = this.audioContext.createGain();
        gain.gain.value = 0;
        gain.connect(this.audioContext.destination);
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
    
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && 'mediaSession' in navigator) {
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
    this.savedPosition = 0;
    this.isWaitingForData = false;
    
    if (!this.audioElement) return;
    
    const wasPlaying = !this.audioElement.paused;
    const savedTime = this.savedPosition;
    
    this.audioElement.src = src;
    this.audioElement.load();
    
    this.loadTimeout = setTimeout(() => {
      console.log('[AudioService] Loading timeout');
      this.isLoading = false;
      this.loadTimeout = null;
    }, 5000);
    
    if (wasPlaying && !this.isUserPaused) {
      console.log('[AudioService] Auto-playing after load');
      const tryPlay = () => {
        if (this.audioElement && this.audioElement.readyState >= 2) {
          // If we have a saved position, seek to it
          if (savedTime > 0) {
            this.audioElement.currentTime = savedTime;
          }
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
      }, 2000);
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
    this.wasPlayingBeforeStall = true;
    
    const playPromise = this.audioElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('[AudioService] Play successful');
          this.setPlaybackState(true);
        })
        .catch(error => {
          console.error('[AudioService] Play failed:', error);
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
      this.wasPlayingBeforeStall = false;
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
      this.savedPosition = time;
    }
  }

  getCurrentTime(): number {
    return this.audioElement?.currentTime || this.savedPosition || 0;
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
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
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