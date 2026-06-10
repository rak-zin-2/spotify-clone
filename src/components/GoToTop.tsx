// components/GoToTop.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";

export default function GoToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 md:bottom-28 md:right-6 z-50
                     bg-gradient-to-r from-blue-500 to-blue-600 
                     hover:from-blue-400 hover:to-blue-500
                     rounded-full p-3 shadow-lg shadow-blue-500/30
                     transition-all duration-200
                     hover:scale-105 active:scale-95
                     focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
                     focus:ring-offset-gray-900"
          aria-label="Go to top"
        >
          <ArrowUp size={18} className="md:w-5 md:h-5 text-white" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}