// components/AudioService.ts
"use client";

// This service manages audio playback with background support
class AudioService {
  private audioElement: HTMLAudioElement | null = null;
  private onEndCallback: (() => void) | null = null;
  private isUserPaused = false;
  private currentMetadata = {
    title: '',
    artist: '',
    artwork: ''
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // Create audio element
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    
    // Enable background playback
    if ('mediaSession' in navigator) {
      this.setupMediaSession();
    }
    
    // Setup lock screen controls
    this.setupLockScreenControls();
    
    // Handle when audio naturally ends
    if (this.audioElement) {
      this.audioElement.onended = () => {
        console.log('Audio ended naturally, triggering next song');
        if (this.onEndCallback && !this.isUserPaused) {
          this.onEndCallback();
        }
      };
    }
  }

  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    
    // Standard lock screen controls - Previous, Play/Pause, Next only
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
        console.log('Lock screen: Next track triggered');
        this.isUserPaused = false;
        callback();
      });
    }
  }

  setPrevCallback(callback: () => void) {
    this.onPrevCallback = callback;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        console.log('Lock screen: Previous track triggered');
        this.isUserPaused = false;
        callback();
      });
    }
  }

  setOnEndCallback(callback: () => void) {
    this.onEndCallback = callback;
  }

  setSrc(src: string) {
    if (this.audioElement) {
      const wasPlaying = !this.audioElement.paused;
      this.audioElement.src = src;
      this.audioElement.load();
      
      if (wasPlaying && !this.isUserPaused) {
        setTimeout(() => {
          this.play();
        }, 100);
      }
    }
  }

  play() {
    if (this.audioElement) {
      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Audio playing successfully');
            this.isUserPaused = false;
            this.setPlaybackState(true);
          })
          .catch(error => {
            console.log('Play was prevented:', error);
          });
      }
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
    if (this.audioElement) {
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

  // Update lock screen with album art, title, and artist
  updateMediaMetadata(title: string, artist: string, artworkUrl: string) {
    this.currentMetadata = { title, artist, artwork: artworkUrl };
    
    console.log('Updating lock screen metadata:', { title, artist, artworkUrl });
    
    if ('mediaSession' in navigator && navigator.mediaSession) {
      // Create artwork array
      const artwork = [];
      
      if (artworkUrl && artworkUrl !== '') {
        // Add multiple sizes for better display
        artwork.push(
          { src: artworkUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '384x384', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' }
        );
      } else {
        // Fallback artwork
        artwork.push(
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
        );
      }
      
      // Set the metadata that appears on lock screen
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'Unknown Song',
        artist: artist || 'Unknown Artist',
        album: 'PavPav',
        artwork: artwork
      });
      
      console.log('Lock screen metadata updated successfully');
    } else {
      console.warn('MediaSession API not supported on this device');
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
}

// Singleton instance
export const audioService = new AudioService();