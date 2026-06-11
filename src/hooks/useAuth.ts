// "use client";

// import React, { useEffect, useState, createContext, useContext, ReactNode } from "react";

// type User = {
//   id: string;
//   email: string;
//   name: string;
//   picture?: string;
//   role: "admin" | "user";
// };

// type AuthContextType = {
//   user: User | null;
//   isLoading: boolean;
//   signIn: (email: string, password: string) => Promise<boolean>;
//   signOut: () => void;
//   isAdmin: boolean;
//   currentUserId: string | null;
// };

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// // Demo users database
// const DEMO_USERS = {
//   admin: {
//     id: "admin-1",
//     email: "admin@pavpav.com",
//     name: "Admin",
//     password: "admin123",
//     role: "admin" as const,
//     picture: "https://ui-avatars.com/api/?name=Admin&background=4f7cff&color=fff",
//   },
//   user1: {
//     id: "user-1",
//     email: "alex@example.com",
//     name: "Alex Johnson",
//     password: "music123",
//     role: "user" as const,
//     picture: "https://ui-avatars.com/api/?name=Alex&background=6c5ce7&color=fff",
//   },
//   user2: {
//     id: "user-2",
//     email: "sarah@example.com",
//     name: "Sarah Williams",
//     password: "sarah123",
//     role: "user" as const,
//     picture: "https://ui-avatars.com/api/?name=Sarah&background=00b894&color=fff",
//   },
//   user3: {
//     id: "user-3",
//     email: "mike@example.com",
//     name: "Mike Brown",
//     password: "mike123",
//     role: "user" as const,
//     picture: "https://ui-avatars.com/api/?name=Mike&background=e17055&color=fff",
//   },
//   user4: {
//     id: "user-4",
//     email: "abc@gmail.com",
//     name: "Slyn Gay",
//     password: "abc@12345",
//     role: "user" as const,
//     picture: "https://ui-avatars.com/api/?name=Slyn&background=0984e3&color=fff",
//   },
// };

// export function AuthProvider({ children }: { children: ReactNode }) {
//   const [user, setUser] = useState<User | null>(null);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     const savedUser = localStorage.getItem("pavpav_current_user");
//     if (savedUser) {
//       try {
//         const parsedUser = JSON.parse(savedUser);
//         setUser(parsedUser);
//       } catch (error) {
//         console.error("Failed to parse user:", error);
//       }
//     }
//     setIsLoading(false);
//   }, []);

//   const signIn = async (email: string, password: string): Promise<boolean> => {
//     setIsLoading(true);
    
//     const foundUser = Object.values(DEMO_USERS).find(
//       (u) => u.email === email && u.password === password
//     );
    
//     if (foundUser) {
//       const userData: User = {
//         id: foundUser.id,
//         email: foundUser.email,
//         name: foundUser.name,
//         picture: foundUser.picture,
//         role: foundUser.role,
//       };
//       setUser(userData);
//       localStorage.setItem("pavpav_current_user", JSON.stringify(userData));
      
//       setIsLoading(false);
//       return true;
//     }
    
//     setIsLoading(false);
//     return false;
//   };

//   const signOut = () => {
//     setUser(null);
//     localStorage.removeItem("pavpav_current_user");
//   };

//   const isAdmin = user?.role === "admin";
//   const currentUserId = user?.id || null;

//   const value: AuthContextType = {
//     user,
//     isLoading,
//     signIn,
//     signOut,
//     isAdmin,
//     currentUserId,
//   };

//   return React.createElement(AuthContext.Provider, { value }, children);
// }

// export function useAuth() {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error("useAuth must be used within an AuthProvider");
//   }
//   return context;
// }