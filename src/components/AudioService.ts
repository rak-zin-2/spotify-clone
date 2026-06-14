// components/AudioService.ts
"use client";

// This service manages audio playback with background support for both web and PWA
class AudioService {
  private audioElement: HTMLAudioElement | null = null;
  private onEndCallback: (() => void) | null = null;
  private isUserPaused = false;
  private currentSrc: string = '';
  private isPreloading = false;
  private pendingSrc: string | null = null;
  private retryCount = 0;
  private maxRetries = 3;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // Create audio element with optimal settings for background playback
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'auto';
    
    // Critical for iOS/PWA background playback
    this.audioElement.setAttribute('playsinline', 'true');
    
    // Enable background playback and lock screen controls
    if ('mediaSession' in navigator) {
      this.setupMediaSession();
    }
    
    // Also set up for PWA (Service Worker context)
    this.setupPWAMediaSession();
    
    // Setup lock screen controls
    this.setupLockScreenControls();
    
    // Handle when audio naturally ends
    if (this.audioElement) {
      const endedHandler = () => {
        console.log('[AudioService] Audio ended naturally');
        if (this.onEndCallback) {
          this.onEndCallback();
        }
      };
      
      this.audioElement.onended = endedHandler;
      this.audioElement.addEventListener('ended', endedHandler);
      
      // Handle loading events for better performance
      this.audioElement.onloadstart = () => {
        console.log('[AudioService] Loading started');
        this.retryCount = 0;
      };
      
      this.audioElement.oncanplay = () => {
        console.log('[AudioService] Can play now');
        this.isPreloading = false;
        if (this.pendingSrc && this.audioElement) {
          this.pendingSrc = null;
          this.play();
        }
      };
      
      this.audioElement.onerror = (e) => {
        console.error('[AudioService] Audio error:', e);
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          console.log(`[AudioService] Retrying (${this.retryCount}/${this.maxRetries})...`);
          setTimeout(() => {
            if (this.currentSrc && this.audioElement) {
              this.audioElement.load();
              setTimeout(() => this.play(), 500);
            }
          }, 1000);
        } else if (this.onEndCallback) {
          console.log('[AudioService] Max retries reached, skipping to next song');
          this.onEndCallback();
        }
      };
      
      // For stalled connections - try to recover
      this.audioElement.onstalled = () => {
        console.log('[AudioService] Audio stalled, attempting recovery');
        if (this.audioElement && !this.audioElement.paused) {
          this.audioElement.load();
          setTimeout(() => {
            if (this.audioElement && !this.audioElement.paused) {
              this.audioElement.play().catch(e => console.error('Recovery play failed:', e));
            }
          }, 500);
        }
      };
    }
  }

  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    
    console.log('[AudioService] Setting up MediaSession controls');
    
    // Set action handlers for lock screen controls
    navigator.mediaSession.setActionHandler('play', () => {
      console.log('[AudioService] Lock screen: Play pressed');
      this.isUserPaused = false;
      this.play();
    });
    
    navigator.mediaSession.setActionHandler('pause', () => {
      console.log('[AudioService] Lock screen: Pause pressed');
      this.isUserPaused = true;
      this.pause();
    });
    
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      console.log('[AudioService] Lock screen: Previous track pressed');
      this.isUserPaused = false;
      if (this.onPrevCallback) this.onPrevCallback();
    });
    
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      console.log('[AudioService] Lock screen: Next track pressed');
      this.isUserPaused = false;
      if (this.onNextCallback) this.onNextCallback();
    });
    
    // Also set seek handlers for better lock screen experience
    if ('setActionHandler' in navigator.mediaSession) {
      try {
        (navigator.mediaSession as any).setActionHandler('seekto', (details: any) => {
          console.log('[AudioService] Lock screen: Seek to', details.seekTime);
          if (this.audioElement && details.seekTime !== undefined) {
            this.audioElement.currentTime = details.seekTime;
          }
        });
      } catch (e) {
        console.log('[AudioService] Seek handler not supported');
      }
    }
  }

  // Special setup for PWA (home screen app)
  private setupPWAMediaSession() {
    // For PWA, we need to ensure media session is re-registered when coming to foreground
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.audioElement && this.audioElement.src) {
        console.log('[AudioService] App came to foreground, re-registering media session');
        setTimeout(() => {
          this.updateMediaMetadata(
            this.currentTitle || 'PavPav',
            this.currentArtist || 'Music',
            this.currentArtwork || ''
          );
          // Re-register action handlers
          if ('mediaSession' in navigator) {
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
        }, 100);
      }
    });
  }

  private setupLockScreenControls() {
    if (!this.audioElement) return;
    
    // Ensure audio continues when app is in background
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.audioElement && !this.audioElement.paused && !this.isUserPaused) {
        console.log('[AudioService] App in background, audio continues');
      }
    });
    
    // Keep audio alive when device goes to sleep
    if ('wakeLock' in navigator) {
      let wakeLock: any = null;
      
      const requestWakeLock = async () => {
        try {
          if (this.audioElement && !this.audioElement.paused) {
            wakeLock = await (navigator as any).wakeLock.request('screen');
            console.log('[AudioService] Wake lock acquired');
          }
        } catch (err) {
          console.log('[AudioService] Wake lock not supported:', err);
        }
      };
      
      // Request wake lock when playing starts
      const originalPlay = this.audioElement.play;
      this.audioElement.play = function() {
        requestWakeLock();
        return originalPlay.apply(this, arguments as any);
      };
    }
  }

  private onNextCallback: (() => void) | null = null;
  private onPrevCallback: (() => void) | null = null;
  private currentTitle: string = '';
  private currentArtist: string = '';
  private currentArtwork: string = '';

  setNextCallback(callback: () => void) {
    this.onNextCallback = callback;
    this.updateMediaSessionHandlers();
  }

  setPrevCallback(callback: () => void) {
    this.onPrevCallback = callback;
    this.updateMediaSessionHandlers();
  }

  private updateMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) return;
    
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      console.log('[AudioService] Lock screen: Next track');
      this.isUserPaused = false;
      if (this.onNextCallback) this.onNextCallback();
    });
    
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      console.log('[AudioService] Lock screen: Previous track');
      this.isUserPaused = false;
      if (this.onPrevCallback) this.onPrevCallback();
    });
  }

  setOnEndCallback(callback: () => void) {
    console.log('[AudioService] Setting onEndCallback');
    this.onEndCallback = callback;
  }

  setSrc(src: string) {
    if (!src || src === '') {
      console.error('[AudioService] Invalid audio source:', src);
      return;
    }
    
    console.log('[AudioService] Setting audio source:', src.substring(0, 100));
    this.currentSrc = src;
    this.retryCount = 0;
    
    if (!this.audioElement) return;
    
    const wasPlaying = !this.audioElement.paused;
    
    // Store pending play
    this.pendingSrc = src;
    this.isPreloading = true;
    
    // Set new source and load
    this.audioElement.src = src;
    this.audioElement.load();
    
    // Attempt to resume playing after loading
    if (wasPlaying && !this.isUserPaused) {
      const tryPlay = () => {
        if (this.audioElement && this.audioElement.readyState >= 2) {
          this.audioElement.play()
            .then(() => console.log('[AudioService] Auto-play succeeded'))
            .catch(e => console.error('[AudioService] Auto-play failed:', e));
          this.audioElement.removeEventListener('canplay', tryPlay);
        }
      };
      this.audioElement.addEventListener('canplay', tryPlay);
      setTimeout(tryPlay, 500);
    }
  }

  play() {
    if (!this.audioElement) {
      console.error('[AudioService] No audio element');
      return;
    }
    
    if (!this.audioElement.src || this.audioElement.src === '') {
      console.error('[AudioService] No audio source set');
      return;
    }
    
    console.log('[AudioService] Attempting to play, readyState:', this.audioElement.readyState);
    
    // If not ready yet, wait for it
    if (this.audioElement.readyState < 2) {
      console.log('[AudioService] Audio not ready, waiting...');
      const onCanPlay = () => {
        if (this.audioElement && !this.audioElement.paused === false) {
          this.audioElement.play()
            .then(() => console.log('[AudioService] Play succeeded after waiting'))
            .catch(e => console.error('[AudioService] Play failed after waiting:', e));
        }
        if (this.audioElement) {
          this.audioElement.removeEventListener('canplay', onCanPlay);
        }
      };
      this.audioElement.addEventListener('canplay', onCanPlay);
      return;
    }
    
    const playPromise = this.audioElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('[AudioService] Audio playing successfully');
          this.isUserPaused = false;
          this.setPlaybackState(true);
        })
        .catch(error => {
          console.error('[AudioService] Play failed:', error);
          if (error.name === 'NotAllowedError') {
            console.log('[AudioService] Play prevented by browser');
          } else if (error.name === 'NotSupportedError') {
            console.error('[AudioService] Audio format not supported');
            if (this.onEndCallback) {
              this.onEndCallback();
            }
          }
        });
    }
  }

  pause() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.isUserPaused = true;
      this.setPlaybackState(false);
      console.log('[AudioService] Audio paused');
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
    console.log('[AudioService] Updating lock screen metadata:', { title, artist });
    
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
        artwork.push(
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
        );
      }
      
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'Unknown Song',
        artist: artist || 'Unknown Artist',
        album: 'PavPav',
        artwork: artwork
      });
      
      // Ensure action handlers are still set
      this.updateMediaSessionHandlers();
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
  
  reload() {
    if (this.audioElement && this.currentSrc) {
      const wasPlaying = !this.audioElement.paused;
      this.audioElement.load();
      if (wasPlaying) {
        setTimeout(() => this.play(), 100);
      }
    }
  }
  
  destroy() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement.load();
    }
  }
}

// Singleton instance
export const audioService = new AudioService();