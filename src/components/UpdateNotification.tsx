// components/UpdateNotification.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleNewContent = () => {
      setShowUpdate(true);
    };

    const handleOnline = () => {
      setIsOffline(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('newContentAvailable', handleNewContent);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial online status
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('newContentAvailable', handleNewContent);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateApp = () => {
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {showUpdate && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-4 right-4 z-[1000]"
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 shadow-2xl">
            <p className="text-white text-sm font-medium mb-2">
              ✨ New version available!
            </p>
            <button
              onClick={updateApp}
              className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-white text-sm font-medium hover:bg-white/30 transition"
            >
              Update Now
            </button>
          </div>
        </motion.div>
      )}

      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-0 left-0 right-0 z-[1000] bg-yellow-500 text-black text-center py-2 text-sm font-medium"
        >
          📴 You're offline. App is working in offline mode.
        </motion.div>
      )}
    </AnimatePresence>
  );
}