"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, X, LogIn, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AuthModal({ isOpen, onClose }: Props) {
  const { signIn, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showDemoInfo, setShowDemoInfo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password");
      return;
    }
    
    const success = await signIn(email, password);
    
    if (success) {
      onClose();
      setEmail("");
      setPassword("");
    } else {
      setError("Invalid email or password. Please try again.");
    }
  };

  const fillDemoCredentials = (userEmail: string, userPassword: string) => {
    setEmail(userEmail);
    setPassword(userPassword);
    setError("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl border border-blue-500/30 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative p-6 border-b border-white/10 text-center">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 p-1 rounded-full hover:bg-white/10 transition"
              >
                <X size={18} className="text-gray-400" />
              </button>
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <LogIn size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Welcome to PavPav
              </h2>
              <p className="text-gray-400 text-sm mt-2">
                Sign in to continue to your music
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-white placeholder-gray-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-white placeholder-gray-500"
                  />
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-sm mb-4"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 transition font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={18} />
                    Sign In
                  </>
                )}
              </motion.button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <button
                    type="button"
                    onClick={() => setShowDemoInfo(!showDemoInfo)}
                    className="px-2 bg-gray-800 text-gray-500 hover:text-blue-400 transition"
                  >
                    Demo Accounts
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {showDemoInfo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <User size={14} className="text-purple-400" />
                        <span className="text-xs font-semibold text-purple-400">Alex Johnson</span>
                      </div>
                      <p className="text-xs text-gray-300">Email: alex@example.com</p>
                      <p className="text-xs text-gray-300">Password: music123</p>
                      <button
                        type="button"
                        onClick={() => fillDemoCredentials("alex@example.com", "music123")}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                      >
                        Click to auto-fill →
                      </button>
                    </div>

                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <User size={14} className="text-purple-400" />
                        <span className="text-xs font-semibold text-purple-400">Sarah Williams</span>
                      </div>
                      <p className="text-xs text-gray-300">Email: sarah@example.com</p>
                      <p className="text-xs text-gray-300">Password: sarah123</p>
                      <button
                        type="button"
                        onClick={() => fillDemoCredentials("sarah@example.com", "sarah123")}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                      >
                        Click to auto-fill →
                      </button>
                    </div>

                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <User size={14} className="text-purple-400" />
                        <span className="text-xs font-semibold text-purple-400">Mike Brown</span>
                      </div>
                      <p className="text-xs text-gray-300">Email: mike@example.com</p>
                      <p className="text-xs text-gray-300">Password: mike123</p>
                      <button
                        type="button"
                        onClick={() => fillDemoCredentials("mike@example.com", "mike123")}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                      >
                        Click to auto-fill →
                      </button>
                    </div>

                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <User size={14} className="text-purple-400" />
                        <span className="text-xs font-semibold text-purple-400">Emma Davis</span>
                      </div>
                      <p className="text-xs text-gray-300">Email: emma@example.com</p>
                      <p className="text-xs text-gray-300">Password: emma123</p>
                      <button
                        type="button"
                        onClick={() => fillDemoCredentials("emma@example.com", "emma123")}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                      >
                        Click to auto-fill →
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="text-center mt-6">
                <p className="text-xs text-gray-500">
                  Each account has its own saved playlists and liked songs
                </p>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}