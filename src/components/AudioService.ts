// components/AudioService.ts
"use client";

// This service manages audio playback with background support
class AudioService {
  private audioElement: HTMLAudioElement | null = null;
  private onEndCallback: (() => void) | null = null;
  private isUserPaused = false;
  private currentSrc: string = '';

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // Create audio element
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    
    // Enable background playback - CRITICAL for lock screen
    if ('mediaSession' in navigator) {
      this.setupMediaSession();
    }
    
    // Setup lock screen controls
    this.setupLockScreenControls();
    
    // Handle when audio naturally ends
    if (this.audioElement) {
      // Use a stronger binding for ended event
      const endedHandler = () => {
        console.log('Audio ended naturally, triggering next song');
        // Don't check isUserPaused because a natural end should always trigger next
        // regardless of pause state (unless repeat is on)
        if (this.onEndCallback) {
          console.log('Calling onEndCallback from AudioService');
          this.onEndCallback();
        }
      };
      
      this.audioElement.onended = endedHandler;
      
      // Also add event listener for redundancy (some browsers prefer addEventListener)
      this.audioElement.addEventListener('ended', endedHandler);
      
      // Handle errors during playback
      this.audioElement.onerror = (e) => {
        console.error('Audio element error:', e);
        // Try to skip to next song on error
        if (this.onEndCallback) {
          console.log('Error occurred, skipping to next song');
          this.onEndCallback();
        }
      };
    }
  }

  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    
    navigator.mediaSession.setActionHandler('play', () => {
      console.log('Lock screen: Play pressed');
      this.isUserPaused = false;
      this.play();
    });
    
    navigator.mediaSession.setActionHandler('pause', () => {
      console.log('Lock screen: Pause pressed');
      this.isUserPaused = true;
      this.pause();
    });
    
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      console.log('Lock screen: Previous track pressed');
      this.isUserPaused = false;
      if (this.onPrevCallback) this.onPrevCallback();
    });
    
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      console.log('Lock screen: Next track pressed');
      this.isUserPaused = false;
      if (this.onNextCallback) this.onNextCallback();
    });
  }

  private setupLockScreenControls() {
    if (this.audioElement) {
      this.audioElement.setAttribute('playsinline', 'true');
      
      // This ensures audio continues when app is in background
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.audioElement && !this.audioElement.paused && !this.isUserPaused) {
          console.log('App in background, audio continues');
        }
      });
    }
  }

  private onNextCallback: (() => void) | null = null;
  private onPrevCallback: (() => void) | null = null;

  setNextCallback(callback: () => void) {
    this.onNextCallback = callback;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        console.log('Lock screen: Next track - changing to next song');
        this.isUserPaused = false;
        callback();
      });
    }
  }

  setPrevCallback(callback: () => void) {
    this.onPrevCallback = callback;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        console.log('Lock screen: Previous track - changing to previous song');
        this.isUserPaused = false;
        callback();
      });
    }
  }

  setOnEndCallback(callback: () => void) {
    console.log('Setting onEndCallback in AudioService');
    this.onEndCallback = callback;
    // Also store it on the audio element directly for redundancy
    if (this.audioElement) {
      (this.audioElement as any).__onEndCallback = callback;
    }
  }

  setSrc(src: string) {
    if (!src || src === '') {
      console.error('Invalid audio source:', src);
      return;
    }
    
    console.log('Setting audio source:', src);
    this.currentSrc = src;
    
    if (this.audioElement) {
      const wasPlaying = !this.audioElement.paused;
      
      const shouldAutoPlay = (wasPlaying || !this.isUserPaused) && !this.isUserPaused;
      
      // Set new source
      this.audioElement.src = src;
      this.audioElement.load();
      
      // Clear any pending play attempts
      if (this.loadTimeout) {
        clearTimeout(this.loadTimeout);
      }
      
      // Attempt to play after loading
      if (shouldAutoPlay) {
        this.loadTimeout = setTimeout(() => {
          this.play();
        }, 100);
      }
    }
  }
  
  private loadTimeout: NodeJS.Timeout | null = null;

  play() {
    if (!this.audioElement) {
      console.error('No audio element');
      return;
    }
    
    if (!this.audioElement.src || this.audioElement.src === '') {
      console.error('No audio source set');
      return;
    }
    
    console.log('Attempting to play audio, current src:', this.audioElement.src);
    
    const playPromise = this.audioElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('Audio playing successfully');
          this.isUserPaused = false;
          this.setPlaybackState(true);
        })
        .catch(error => {
          console.error('Play failed:', error);
          if (error.name === 'NotAllowedError') {
            console.log('Play was prevented by browser, waiting for user interaction');
          } else if (error.name === 'NotSupportedError') {
            console.error('Audio format not supported, skipping to next song');
            if (this.onEndCallback && !this.isUserPaused) {
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
      console.log('Audio paused by user');
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
    console.log('Updating lock screen metadata:', { title, artist, artworkUrl });
    
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
      
      console.log('Lock screen metadata updated');
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
  
  // Cleanup method
  destroy() {
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement.load();
    }
  }
}

// Singleton instance
export const audioService = new AudioService();