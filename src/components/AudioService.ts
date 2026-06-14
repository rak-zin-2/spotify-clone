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
  private backgroundPlaybackEnabled = true;
  private wakeLock: any = null;
  private audioContext: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
      this.setupPWABackgroundPlayback();
    }
  }

  private init() {
    // Main audio element
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'auto';
    this.audioElement.setAttribute('playsinline', 'true');
    
    // CRITICAL: Enable background playback on iOS
    this.audioElement.setAttribute('webkit-playsinline', 'true');
    
    // Enable audio session for background playback
    if ('audioSession' in this.audioElement) {
      (this.audioElement as any).audioSession.type = 'playback';
    }
    
    // Preload element for next song
    this.preloadElement = new Audio();
    this.preloadElement.crossOrigin = 'anonymous';
    this.preloadElement.preload = 'auto';
    this.preloadElement.volume = 0;
    this.preloadElement.setAttribute('playsinline', 'true');
    
    // Setup media session for lock screen controls
    if ('mediaSession' in navigator) {
      this.setupMediaSession();
    }
    
    this.setupAudioElementEvents();
    this.setupBackgroundHandlers();
    this.setupPWAMediaSession();
  }

  private setupAudioElementEvents() {
    if (!this.audioElement) return;
    
    this.audioElement.onended = () => {
      console.log('[AudioService] Audio ended');
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    };
    
    this.audioElement.oncanplay = () => {
      console.log('[AudioService] Can play');
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

  // Special setup for PWA background playback
  private setupPWABackgroundPlayback() {
    if (typeof window === 'undefined') return;
    
    // Create a silent AudioContext to keep the audio session alive
    // This helps maintain background playback on some devices
    try {
      // @ts-ignore
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      if (window.AudioContext) {
        this.audioContext = new AudioContext();
        // Keep context suspended until needed
        this.audioContext.suspend();
      }
    } catch (e) {
      console.log('[AudioService] AudioContext not supported');
    }
    
    // Prevent device from sleeping during playback
    this.setupWakeLock();
    
    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.audioElement && !this.audioElement.paused && !this.isUserPaused) {
        console.log('[AudioService] App in background, continuing playback');
        this.keepAudioAlive();
      }
    });
    
    // Handle page hide (when app is swiped away or home button pressed)
    window.addEventListener('pagehide', () => {
      if (this.audioElement && !this.audioElement.paused && !this.isUserPaused) {
        console.log('[AudioService] Page hiding, maintaining background playback');
        // Store state to resume
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
    // Request wake lock to prevent device sleep during playback
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && this.audioElement && !this.audioElement.paused) {
        try {
          this.wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('[AudioService] Wake lock acquired');
          
          this.wakeLock.addEventListener('release', () => {
            console.log('[AudioService] Wake lock released');
          });
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
    
    // Request wake lock when playing starts
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

  private keepAudioAlive() {
    // This creates a silent oscillator to keep the audio context alive
    // Helps maintain background playback on some browsers
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        const oscillator = this.audioContext!.createOscillator();
        const gain = this.audioContext!.createGain();
        gain.gain.value = 0; // Silent
        oscillator.connect(gain);
        gain.connect(this.audioContext!.destination);
        oscillator.start();
        oscillator.stop(0.1);
      }).catch(e => console.log('AudioContext resume failed:', e));
    }
  }

  preloadNextSong(src: string) {
    if (!src || src === this.currentSrc) return;
    
    console.log('[AudioService] Preloading next song:', src.substring(0, 80));
    this.nextSrc = src;
    
    if (this.preloadElement) {
      this.preloadElement.src = '';
      this.preloadElement.src = src;
      this.preloadElement.load();
    }
  }

  isNextSongReady(): boolean {
    return this.preloadElement ? this.preloadElement.readyState >= 2 : false;
  }

  switchToPreloaded(src: string): boolean {
    if (this.nextSrc === src && this.preloadElement && this.preloadElement.readyState >= 2) {
      console.log('[AudioService] Switching to preloaded song instantly');
      const wasPlaying = this.audioElement && !this.audioElement.paused;
      
      const tempAudio = this.audioElement;
      this.audioElement = this.preloadElement;
      this.preloadElement = tempAudio;
      
      if (this.preloadElement) {
        this.preloadElement.src = '';
        this.preloadElement.load();
      }
      
      this.currentSrc = src;
      this.nextSrc = null;
      this.setupAudioElementEvents();
      
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
    
    // Standard MediaSession actions - these are all valid
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
    
    // seekto is supported in modern browsers
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
    } catch (e) {
      console.log('[AudioService] seekto handler not supported');
    }
  }

  private setupPWAMediaSession() {
    // Re-register media session handlers when app comes to foreground
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && 'mediaSession' in navigator) {
        setTimeout(() => {
          this.updateMediaMetadata(
            this.currentTitle || 'PavPav',
            this.currentArtist || 'Music',
            this.currentArtwork || ''
          );
          this.updatePositionState();
          
          // Re-register all handlers
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
        }, 100);
      }
    });
  }

  private setupBackgroundHandlers() {
    if (typeof window === 'undefined') return;
    
    // Handle when page becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.audioElement && !this.audioElement.paused && !this.isUserPaused) {
        console.log('[AudioService] Page visible, ensuring playback continues');
        // Ensure audio is still playing
        if (this.audioElement.paused) {
          this.play();
        }
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
      if (this.onNextCallback) this.onNextCallback();
    });
    
    navigator.mediaSession.setActionHandler('previoustrack', () => {
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
    
    if (!skipPreloadCheck && this.switchToPreloaded(src)) {
      return;
    }
    
    console.log('[AudioService] Setting audio source:', src.substring(0, 80));
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
    
    // Resume AudioContext if suspended
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(e => console.log('AudioContext resume failed:', e));
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
          console.log('[AudioService] Playing successfully');
          this.isUserPaused = false;
          this.setPlaybackState(true);
          this.updatePositionState();
        })
        .catch(error => {
          console.error('[AudioService] Play failed:', error);
          // On iOS, user interaction might be needed first time
          if (error.name === 'NotAllowedError') {
            console.log('[AudioService] User interaction needed first');
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