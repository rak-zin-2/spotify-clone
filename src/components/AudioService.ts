// components/AudioService.ts
"use client";

// This service manages audio playback with background support and preloading
class AudioService {
  private audioElement: HTMLAudioElement | null = null;
  private preloadElement: HTMLAudioElement | null = null; // For preloading next song
  private onEndCallback: (() => void) | null = null;
  private isUserPaused = false;
  private currentSrc: string = '';
  private nextSrc: string | null = null;
  private retryCount = 0;
  private maxRetries = 2;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // Main audio element
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'auto';
    this.audioElement.setAttribute('playsinline', 'true');
    
    // Preload element for next song (hidden, just for caching)
    this.preloadElement = new Audio();
    this.preloadElement.crossOrigin = 'anonymous';
    this.preloadElement.preload = 'auto';
    this.preloadElement.volume = 0;
    this.preloadElement.setAttribute('playsinline', 'true');
    
    // Enable background playback
    if ('mediaSession' in navigator) {
      this.setupMediaSession();
    }
    
    this.setupPWAMediaSession();
    this.setupLockScreenControls();
    
    if (this.audioElement) {
      const endedHandler = () => {
        console.log('[AudioService] Audio ended naturally');
        if (this.onEndCallback) {
          this.onEndCallback();
        }
      };
      
      this.audioElement.onended = endedHandler;
      this.audioElement.addEventListener('ended', endedHandler);
      
      this.audioElement.oncanplay = () => {
        console.log('[AudioService] Can play now');
      };
      
      this.audioElement.onerror = (e) => {
        console.error('[AudioService] Audio error:', e);
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          setTimeout(() => {
            if (this.currentSrc && this.audioElement) {
              this.audioElement.load();
              setTimeout(() => this.play(), 200);
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
  }

  // Preload the next song for instant playback
  preloadNextSong(src: string) {
    if (!src || src === this.currentSrc) return;
    
    console.log('[AudioService] Preloading next song:', src.substring(0, 80));
    this.nextSrc = src;
    
    if (this.preloadElement) {
      // Stop current preload if any
      this.preloadElement.src = '';
      // Start preloading next song
      this.preloadElement.src = src;
      this.preloadElement.load();
    }
  }

  // Get the preloaded element's ready state
  isNextSongReady(): boolean {
    return this.preloadElement ? this.preloadElement.readyState >= 2 : false;
  }

  // Switch to preloaded song instantly
  switchToPreloaded(src: string): boolean {
    if (this.nextSrc === src && this.preloadElement && this.preloadElement.readyState >= 2) {
      console.log('[AudioService] Switching to preloaded song instantly');
      const wasPlaying = this.audioElement && !this.audioElement.paused;
      const currentTime = this.audioElement?.currentTime || 0;
      
      // Swap audio elements
      const tempAudio = this.audioElement;
      this.audioElement = this.preloadElement;
      this.preloadElement = tempAudio;
      
      // Reset preload element
      if (this.preloadElement) {
        this.preloadElement.src = '';
        this.preloadElement.load();
      }
      
      this.currentSrc = src;
      this.nextSrc = null;
      
      if (wasPlaying && this.audioElement) {
        this.audioElement.play().catch(e => console.error('Play after swap failed:', e));
      }
      
      return true;
    }
    return false;
  }

  private updatePositionState() {
    if (!('mediaSession' in navigator) || !this.audioElement) return;
    
    const duration = this.audioElement.duration;
    const position = this.audioElement.currentTime;
    const playbackRate = this.audioElement.playbackRate;
    
    if (duration && isFinite(duration) && !isNaN(duration)) {
      try {
        (navigator.mediaSession as any).setPositionState({
          duration: duration,
          position: position,
          playbackRate: playbackRate
        });
      } catch (e) {}
    }
  }

  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    
    navigator.mediaSession.setActionHandler('play', () => {
      this.isUserPaused = false;
      this.play();
    });
    
    navigator.mediaSession.setActionHandler('pause', () => {
      this.isUserPaused = true;
      this.pause();
    });
    
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      this.isUserPaused = false;
      if (this.onPrevCallback) this.onPrevCallback();
    });
    
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      this.isUserPaused = false;
      if (this.onNextCallback) this.onNextCallback();
    });
    
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      if (this.audioElement) {
        const seekTime = (details.seekOffset || 15);
        this.audioElement.currentTime = Math.min(
          this.audioElement.currentTime + seekTime,
          this.audioElement.duration || 0
        );
        this.updatePositionState();
      }
    });
    
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      if (this.audioElement) {
        const seekTime = (details.seekOffset || 15);
        this.audioElement.currentTime = Math.max(
          this.audioElement.currentTime - seekTime,
          0
        );
        this.updatePositionState();
      }
    });
    
    try {
      (navigator.mediaSession as any).setActionHandler('seekto', (details: any) => {
        if (this.audioElement && details.seekTime !== undefined) {
          this.audioElement.currentTime = Math.min(
            Math.max(details.seekTime, 0),
            this.audioElement.duration || 0
          );
          this.updatePositionState();
        }
      });
    } catch (e) {}
  }

  private setupPWAMediaSession() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.audioElement && this.audioElement.src) {
        setTimeout(() => {
          this.updateMediaMetadata(
            this.currentTitle || 'PavPav',
            this.currentArtist || 'Music',
            this.currentArtwork || ''
          );
          this.updatePositionState();
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
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.audioElement && !this.audioElement.paused && !this.isUserPaused) {
        console.log('[AudioService] App in background, audio continues');
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
    this.updateMediaSessionHandlers();
  }

  setPrevCallback(callback: () => void) {
    this.onPrevCallback = callback;
    this.updateMediaSessionHandlers();
  }

  private updateMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) return;
    
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      this.isUserPaused = false;
      if (this.onNextCallback) this.onNextCallback();
    });
    
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      this.isUserPaused = false;
      if (this.onPrevCallback) this.onPrevCallback();
    });
  }

  setOnEndCallback(callback: () => void) {
    this.onEndCallback = callback;
  }

  setSrc(src: string, skipPreloadCheck: boolean = false) {
    if (!src || src === '') {
      console.error('[AudioService] Invalid audio source');
      return;
    }
    
    // If we have this song preloaded, switch instantly
    if (!skipPreloadCheck && this.switchToPreloaded(src)) {
      return;
    }
    
    console.log('[AudioService] Setting audio source (not preloaded):', src.substring(0, 80));
    this.currentSrc = src;
    this.retryCount = 0;
    
    if (!this.audioElement) return;
    
    const wasPlaying = !this.audioElement.paused;
    
    this.audioElement.src = src;
    this.audioElement.load();
    this.updatePositionState();
    
    if (wasPlaying && !this.isUserPaused) {
      const tryPlay = () => {
        if (this.audioElement && this.audioElement.readyState >= 2) {
          this.audioElement.play().catch(e => console.error('Auto-play failed:', e));
          this.audioElement.removeEventListener('canplay', tryPlay);
        }
      };
      this.audioElement.addEventListener('canplay', tryPlay);
      setTimeout(tryPlay, 300);
    }
  }

  play() {
    if (!this.audioElement) return;
    
    if (!this.audioElement.src || this.audioElement.src === '') {
      console.error('[AudioService] No audio source set');
      return;
    }
    
    if (this.audioElement.readyState < 2) {
      console.log('[AudioService] Audio not ready, waiting...');
      const onCanPlay = () => {
        if (this.audioElement && !this.audioElement.paused === false) {
          this.audioElement.play().catch(e => console.error('Play failed:', e));
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
          this.isUserPaused = false;
          this.setPlaybackState(true);
          this.updatePositionState();
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
      this.updatePositionState();
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
      
      this.updatePositionState();
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
  
  destroy() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    if (this.preloadElement) {
      this.preloadElement.src = '';
    }
  }
}

export const audioService = new AudioService();