// components/AudioService.ts
"use client";

// This service manages audio playback with background support
class AudioService {
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isInitialized = false;
  private onEndCallback: (() => void) | null = null;

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
    
    // Lock screen controls
    this.setupLockScreenControls();
  }

  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    
    // Set action handlers for lock screen controls
    navigator.mediaSession.setActionHandler('play', () => {
      this.play();
    });
    
    navigator.mediaSession.setActionHandler('pause', () => {
      this.pause();
    });
    
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      // Will be set externally
      if (this.onPrevCallback) this.onPrevCallback();
    });
    
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      // Will be set externally
      if (this.onNextCallback) this.onNextCallback();
    });
    
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime && this.audioElement) {
        this.audioElement.currentTime = details.seekTime;
      }
    });
  }

  private setupLockScreenControls() {
    // Ensure audio continues when screen locks
    if (this.audioElement) {
      // This prevents iOS from pausing when screen locks
      this.audioElement.setAttribute('playsinline', 'true');
      
      // For iOS Web Audio support
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.audioElement && !this.audioElement.paused) {
          // Keep playing in background
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
      navigator.mediaSession.setActionHandler('nexttrack', () => callback());
    }
  }

  setPrevCallback(callback: () => void) {
    this.onPrevCallback = callback;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('previoustrack', () => callback());
    }
  }

  setOnEndCallback(callback: () => void) {
    this.onEndCallback = callback;
    if (this.audioElement) {
      this.audioElement.onended = () => callback();
    }
  }

  setSrc(src: string) {
    if (this.audioElement) {
      this.audioElement.src = src;
      this.audioElement.load();
    }
  }

  play() {
    if (this.audioElement) {
      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('Play was prevented:', error);
        });
      }
    }
  }

  pause() {
    if (this.audioElement) {
      this.audioElement.pause();
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

  updateMediaMetadata(title: string, artist: string, artwork: string) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artist: artist,
        artwork: [
          { src: artwork, sizes: '96x96', type: 'image/png' },
          { src: artwork, sizes: '128x128', type: 'image/png' },
          { src: artwork, sizes: '192x192', type: 'image/png' },
          { src: artwork, sizes: '256x256', type: 'image/png' },
          { src: artwork, sizes: '384x384', type: 'image/png' },
          { src: artwork, sizes: '512x512', type: 'image/png' },
        ]
      });
    }
  }

  setPlaybackState(playing: boolean) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }
  }

  getAudioElement(): HTMLAudioElement | null {
    return this.audioElement;
  }
}

// Singleton instance
export const audioService = new AudioService();