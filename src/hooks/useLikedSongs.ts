// "use client";

// import { useEffect, useState } from "react";
// import { useAuth } from "./useAuth";
// import { usePendingChanges } from "./usePendingChanges";

// export function useLikedSongs() {
//   const [likedSongs, setLikedSongs] = useState<string[]>([]);
//   const [isLoaded, setIsLoaded] = useState(false);
//   const { currentUserId, isAdmin } = useAuth();
//   const { submitChangeRequest } = usePendingChanges();

//   // Get storage key based on user role
//   const getStorageKey = () => {
//     if (isAdmin) {
//       return "pavpav_global_likedSongs";
//     }
//     return currentUserId ? `pavpav_${currentUserId}_likedSongs` : null;
//   };

//   // Function to sync all users' data with admin data
//   const syncAllUsersWithAdmin = (adminLikedSongs: string[]) => {
//     const userIds = ["user-1", "user-2", "user-3", "user-4"];
    
//     userIds.forEach(userId => {
//       const userKey = `pavpav_${userId}_likedSongs`;
//       localStorage.setItem(userKey, JSON.stringify(adminLikedSongs));
//     });
//   };

//   // Load liked songs based on user role
//   useEffect(() => {
//     const storageKey = getStorageKey();
//     if (!storageKey) {
//       setLikedSongs([]);
//       setIsLoaded(true);
//       return;
//     }

//     const saved = localStorage.getItem(storageKey);
//     if (saved) {
//       try {
//         const parsed = JSON.parse(saved);
//         setLikedSongs(parsed);
//       } catch (error) {
//         console.error("Failed to parse liked songs:", error);
//         setLikedSongs([]);
//       }
//     } else {
//       setLikedSongs([]);
//       localStorage.setItem(storageKey, JSON.stringify([]));
//     }
//     setIsLoaded(true);
//   }, [currentUserId, isAdmin]);

//   // Save liked songs - if admin, sync to all users
//   useEffect(() => {
//     if (isLoaded) {
//       const storageKey = getStorageKey();
//       if (storageKey) {
//         localStorage.setItem(storageKey, JSON.stringify(likedSongs));
        
//         if (isAdmin) {
//           syncAllUsersWithAdmin(likedSongs);
//         }
//       }
//     }
//   }, [likedSongs, isLoaded, currentUserId, isAdmin]);

//   const toggleLike = (songTitle: string) => {
//     setLikedSongs((prev) => {
//       if (prev.includes(songTitle)) {
//         return prev.filter((title) => title !== songTitle);
//       } else {
//         return [...prev, songTitle];
//       }
//     });
//   };

//   const isLiked = (songTitle: string) => {
//     return likedSongs.includes(songTitle);
//   };

//   const getLikedSongs = () => {
//     return likedSongs;
//   };

//   const clearLikedSongs = () => {
//     setLikedSongs([]);
//   };

//   return {
//     likedSongs,
//     toggleLike,
//     isLiked,
//     getLikedSongs,
//     clearLikedSongs,
//   };
// }