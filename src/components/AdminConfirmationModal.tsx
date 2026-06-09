"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Shield, AlertTriangle, Check, X } from "lucide-react";

type Props = {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  action: string;
  itemName?: string;
};

export default function AdminConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  action,
  itemName,
}: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/30 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative p-6 border-b border-yellow-500/30 text-center">
              <button
                onClick={onCancel}
                className="absolute right-4 top-4 p-1 rounded-full hover:bg-white/10 transition"
              >
                <X size={18} className="text-gray-400" />
              </button>
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                <Shield size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                Admin Action Required
              </h2>
              <p className="text-gray-400 text-sm mt-2">
                You are about to make a global change
              </p>
            </div>

            <div className="p-6">
              <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-300">
                      You are about to <span className="text-yellow-400 font-semibold">{action}</span>
                      {itemName && <span className="text-white font-semibold"> "{itemName}"</span>}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      This change will affect <span className="text-yellow-400">ALL USERS</span> of the platform.
                      All users will see this change immediately.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onConfirm}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 transition font-medium shadow-lg shadow-yellow-500/30"
                >
                  <Check size={18} />
                  Confirm Global Change
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onCancel}
                  className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition"
                >
                  Cancel
                </motion.button>
              </div>

              <div className="text-center mt-4">
                <p className="text-xs text-gray-500">
                  This action cannot be undone for individual users
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}