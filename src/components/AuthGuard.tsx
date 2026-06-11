// components/AuthGuard.tsx
"use client";

import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { motion } from "framer-motion";
import { Disc3, Shield, User, LogIn } from "lucide-react";
import { useState } from "react";
import AuthModal from "./AuthModal";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSupabaseAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
          <div className="fixed w-[500px] h-[500px] rounded-full bg-blue-500/20 blur-[180px] top-[-150px] left-[-150px] pointer-events-none" />
          <div className="fixed w-[500px] h-[500px] rounded-full bg-purple-500/20 blur-[180px] bottom-[-150px] right-[-150px] pointer-events-none" />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 w-full max-w-md"
          >
            <div className="bg-gradient-to-b from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-2xl border border-blue-500/30 overflow-hidden shadow-2xl">
              <div className="text-center pt-8 pb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25"
                >
                  <Disc3 className="text-white" size={40} />
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
                >
                  PavPav
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-gray-400 mt-2"
                >
                  Your favorite music streaming platform
                </motion.p>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

              <div className="p-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-center mb-8"
                >
                  <h2 className="text-2xl font-semibold text-white mb-2">Welcome Back!</h2>
                  <p className="text-gray-400 text-sm">Sign in to continue to PavPav</p>
                </motion.div>

                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAuthModal(true)}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 transition-all font-medium shadow-lg shadow-blue-500/30"
                >
                  <LogIn size={18} />
                  Sign In to PavPav
                </motion.button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-gray-900 text-gray-500">Demo Access</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                    <Shield size={14} className="text-red-400 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-red-400">Admin</p>
                    <p className="text-[10px] text-gray-500">admin@example.com</p>
                    <p className="text-[10px] text-gray-500">Pass: admin123</p>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                    <User size={14} className="text-purple-400 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-purple-400">User</p>
                    <p className="text-[10px] text-gray-500">user@example.com</p>
                    <p className="text-[10px] text-gray-500">Pass: user123</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  }

  return <>{children}</>;
}