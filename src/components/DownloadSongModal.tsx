// components/DownloadSongModal.tsx
"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Music, Image, Check, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

type DownloadSongModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAddSong: (song: {
    title: string;
    artist: string;
    cover: string;
    src: string;
  }) => void;
};

export default function DownloadSongModal({ isOpen, onClose, onAddSong }: DownloadSongModalProps) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const { user } = useSupabaseAuth();

  // Check if device is mobile
  const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
      setError("");
    } else {
      setError("Please select a valid image file (JPG, PNG, etc.)");
    }
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check by MIME type or file extension for better mobile support
      const isAudio = file.type.startsWith("audio/") || 
                      file.name.endsWith('.mp3') || 
                      file.name.endsWith('.wav') || 
                      file.name.endsWith('.ogg') ||
                      file.name.endsWith('.m4a') ||
                      file.name.endsWith('.aac') ||
                      file.name.endsWith('.flac') ||
                      file.name.endsWith('.webm');
      
      if (isAudio) {
        setAudioFile(file);
        setError("");
        console.log("Audio file selected:", file.name, file.type, (file.size / 1024 / 1024).toFixed(2) + "MB");
      } else {
        setError("Please select a valid audio file (MP3, WAV, OGG, M4A, AAC, FLAC)");
      }
    }
  };

  const uploadFileToSupabase = async (file: File, bucket: string, folder: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const safeTitle = title.trim().replace(/[^a-zA-Z0-9]/g, '_');
    const safeArtist = artist.trim().replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${folder}/${timestamp}_${safeArtist}_${safeTitle}.${fileExt}`;
    
    console.log(`Uploading to ${bucket}: ${fileName}`);
    
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'audio/mpeg',
      });
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Please enter a song title");
      return;
    }
    
    if (!artist.trim()) {
      setError("Please enter an artist name");
      return;
    }
    
    if (!audioFile) {
      setError("Please select an audio file. Tap 'Choose File' to select a song from your device.");
      return;
    }

    // Check file size (max 50MB)
    if (audioFile.size > 50 * 1024 * 1024) {
      setError("Audio file is too large. Maximum size is 50MB.");
      return;
    }

    setIsLoading(true);
    setError("");
    setUploadProgress(0);

    try {
      // Upload audio file
      setUploadProgress(30);
      console.log("Uploading audio file...");
      const audioUrl = await uploadFileToSupabase(audioFile, "song-audio", "audios");
      console.log("Audio uploaded:", audioUrl);
      
      // Upload cover image (or use default)
      setUploadProgress(60);
      let coverUrl = "https://via.placeholder.com/300x300/1e1e2f/3B82F6?text=Custom+Song";
      if (coverFile) {
        coverUrl = await uploadFileToSupabase(coverFile, "song-covers", "covers");
        console.log("Cover uploaded:", coverUrl);
      }

      setUploadProgress(100);
      
      // Add song to database
      onAddSong({
        title: title.trim(),
        artist: artist.trim(),
        cover: coverUrl,
        src: audioUrl,
      });
      
      setSuccess("Song uploaded successfully!");
      
      // Reset form after 2 seconds and close
      setTimeout(() => {
        setTitle("");
        setArtist("");
        setCoverFile(null);
        setCoverPreview("");
        setAudioFile(null);
        setSuccess("");
        setUploadProgress(0);
        onClose();
      }, 1500);
      
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload song. Please check your connection and try again.");
      setUploadProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl border border-blue-500/30 overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Add Custom Song
                </h2>
                <p className="text-xs text-gray-500 mt-1">Upload your own music from your device</p>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-white/10 transition"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Mobile Help Text */}
              {isMobile() && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2">
                  <p className="text-xs text-blue-400 text-center">
                    📱 On mobile: Tap "Choose File" then select "Browse" or "Files" to find your audio
                  </p>
                </div>
              )}

              {/* Song Details */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Song Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter song title"
                    className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Artist Name *</label>
                  <input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="Enter artist name"
                    className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              {/* Cover Image Upload */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Cover Image (optional)</label>
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center cursor-pointer hover:border-blue-500 transition group"
                >
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverSelect}
                    className="hidden"
                  />
                  {coverPreview ? (
                    <div className="flex items-center gap-3">
                      <img src={coverPreview} alt="Cover preview" className="w-12 h-12 rounded-lg object-cover" />
                      <div className="flex-1 text-left">
                        <p className="text-green-400 text-sm">{coverFile?.name}</p>
                        <p className="text-xs text-gray-500">Click to change image</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Image size={20} className="text-gray-500 group-hover:text-blue-400 transition" />
                      <p className="text-gray-400 text-sm">Tap to select cover image</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Audio File Upload - Mobile Optimized */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Audio File *</label>
                <div
                  onClick={() => audioInputRef.current?.click()}
                  className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 transition group"
                >
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm"
                    onChange={handleAudioSelect}
                    className="hidden"
                  />
                  <Music size={32} className="mx-auto text-gray-500 group-hover:text-blue-400 transition mb-2" />
                  {audioFile ? (
                    <div>
                      <p className="text-green-400 text-sm font-medium">{audioFile.name}</p>
                      <p className="text-xs text-gray-500 mt-1">Tap to change file</p>
                      <p className="text-xs text-gray-500">Size: {(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-400 text-sm">Tap to select audio file</p>
                      <p className="text-xs text-gray-500 mt-1">MP3, WAV, OGG, M4A, AAC, FLAC (Max 50MB)</p>
                      <p className="text-xs text-blue-400 mt-2">💡 Tip: On iPhone, use Files app to select downloaded music</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Uploading to cloud...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error/Success Messages */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-400" />
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}
              
              {success && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 flex items-center gap-2">
                  <Check size={16} className="text-green-400" />
                  <p className="text-xs text-green-400">{success}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={!title || !artist || !audioFile || isLoading}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload Song"
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
                >
                  Cancel
                </motion.button>
              </div>

              <p className="text-[10px] text-gray-500 text-center">
                Your song will be uploaded to the cloud and visible to everyone
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}