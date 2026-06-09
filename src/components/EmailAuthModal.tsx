// "use client";

// import { useState } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { Mail, X, ArrowRight } from "lucide-react";
// import { useAuth } from "@/hooks/useAuth";

// export default function EmailAuthModal() {
//   const { showEmailModal, setShowEmailModal, emailInput, setEmailInput, handleEmailSignIn } = useAuth();
//   const [error, setError] = useState("");

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     setError("");
    
//     if (!emailInput.trim()) {
//       setError("Please enter your email address");
//       return;
//     }
    
//     if (!emailInput.includes("@gmail.com")) {
//       setError("Please use a valid Gmail address (must contain @gmail.com)");
//       return;
//     }
    
//     handleEmailSignIn();
//   };

//   return (
//     <AnimatePresence>
//       {showEmailModal && (
//         <motion.div
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           exit={{ opacity: 0 }}
//           className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
//           onClick={() => setShowEmailModal(false)}
//         >
//           <motion.div
//             initial={{ scale: 0.9, opacity: 0 }}
//             animate={{ scale: 1, opacity: 1 }}
//             exit={{ scale: 0.9, opacity: 0 }}
//             className="w-full max-w-md bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl border border-blue-500/30 overflow-hidden shadow-2xl"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="relative p-6 border-b border-white/10 text-center">
//               <button
//                 onClick={() => setShowEmailModal(false)}
//                 className="absolute right-4 top-4 p-1 rounded-full hover:bg-white/10 transition"
//               >
//                 <X size={18} className="text-gray-400" />
//               </button>
//               <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
//                 <Mail size={32} className="text-white" />
//               </div>
//               <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
//                 Sign in with Google
//               </h2>
//               <p className="text-gray-400 text-sm mt-2">
//                 Enter your Gmail address to continue
//               </p>
//             </div>

//             <form onSubmit={handleSubmit} className="p-6">
//               <div className="mb-4">
//                 <label className="block text-sm font-medium text-gray-300 mb-2">
//                   Email Address
//                 </label>
//                 <input
//                   type="email"
//                   value={emailInput}
//                   onChange={(e) => {
//                     setEmailInput(e.target.value);
//                     setError("");
//                   }}
//                   placeholder="yourname@gmail.com"
//                   className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-white placeholder-gray-500"
//                   autoFocus
//                 />
//                 {error && (
//                   <p className="text-red-400 text-xs mt-2">{error}</p>
//                 )}
//               </div>

//               <div className="flex gap-3">
//                 <motion.button
//                   type="submit"
//                   whileHover={{ scale: 1.02 }}
//                   whileTap={{ scale: 0.98 }}
//                   className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 transition font-medium shadow-lg shadow-blue-500/30"
//                 >
//                   Sign In
//                   <ArrowRight size={16} />
//                 </motion.button>
//                 <motion.button
//                   type="button"
//                   whileHover={{ scale: 1.02 }}
//                   whileTap={{ scale: 0.98 }}
//                   onClick={() => setShowEmailModal(false)}
//                   className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition"
//                 >
//                   Cancel
//                 </motion.button>
//               </div>

//               <div className="relative my-6">
//                 <div className="absolute inset-0 flex items-center">
//                   <div className="w-full border-t border-white/10"></div>
//                 </div>
//                 <div className="relative flex justify-center text-xs">
//                   <span className="px-2 bg-gray-800 text-gray-500">Demo Access</span>
//                 </div>
//               </div>

//               <div className="text-center">
//                 <p className="text-xs text-gray-500">
//                   This is a demo. Enter any Gmail address to sign in.
//                 </p>
//                 <div className="mt-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
//                   <p className="text-xs text-blue-400">
//                     📧 Example: demo@gmail.com
//                   </p>
//                 </div>
//               </div>
//             </form>
//           </motion.div>
//         </motion.div>
//       )}
//     </AnimatePresence>
//   );
// }