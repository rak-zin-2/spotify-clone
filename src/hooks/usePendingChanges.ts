"use client";

import React, { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { useAuth } from "./useAuth";

export type PendingChange = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: "create_playlist" | "add_song" | "remove_song" | "rename_playlist" | "delete_playlist" | "like_song" | "unlike_song";
  data: any;
  timestamp: number;
  status: "pending" | "approved" | "rejected";
};

type PendingChangesContextType = {
  pendingChanges: PendingChange[];
  submitChangeRequest: (type: PendingChange["type"], data: any) => void;
  approveChange: (changeId: string) => PendingChange | undefined;
  rejectChange: (changeId: string) => void;
  getPendingChanges: () => PendingChange[];
  clearOldChanges: () => void;
};

const PendingChangesContext = createContext<PendingChangesContextType | undefined>(undefined);

export function PendingChangesProvider({ children }: { children: ReactNode }) {
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user, isAdmin, currentUserId } = useAuth();

  // Load pending changes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("pavpav_pending_changes");
    if (saved) {
      try {
        setPendingChanges(JSON.parse(saved));
      } catch (error) {
        console.error("Failed to parse pending changes:", error);
        setPendingChanges([]);
      }
    } else {
      setPendingChanges([]);
    }
    setIsLoaded(true);
  }, []);

  // Save pending changes to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("pavpav_pending_changes", JSON.stringify(pendingChanges));
    }
  }, [pendingChanges, isLoaded]);

  // Submit a change request from a regular user
  const submitChangeRequest = (type: PendingChange["type"], data: any) => {
    if (!user || isAdmin) return; // Only regular users submit requests
    
    const newRequest: PendingChange = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      type,
      data,
      timestamp: Date.now(),
      status: "pending",
    };
    
    setPendingChanges((prev) => [newRequest, ...prev]);
  };

  // Approve a change (admin only)
  const approveChange = (changeId: string) => {
    if (!isAdmin) return undefined;
    
    const change = pendingChanges.find(c => c.id === changeId);
    if (!change || change.status !== "pending") return undefined;
    
    // Mark as approved
    setPendingChanges((prev) =>
      prev.map((c) =>
        c.id === changeId ? { ...c, status: "approved" } : c
      )
    );
    
    return change;
  };

  // Reject a change (admin only)
  const rejectChange = (changeId: string) => {
    if (!isAdmin) return;
    
    setPendingChanges((prev) =>
      prev.map((c) =>
        c.id === changeId ? { ...c, status: "rejected" } : c
      )
    );
  };

  // Get pending changes for admin
  const getPendingChanges = () => {
    return pendingChanges.filter(c => c.status === "pending");
  };

  // Clear old changes (optional)
  const clearOldChanges = () => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    setPendingChanges((prev) => prev.filter(c => c.timestamp > oneWeekAgo));
  };

  const value: PendingChangesContextType = {
    pendingChanges,
    submitChangeRequest,
    approveChange,
    rejectChange,
    getPendingChanges,
    clearOldChanges,
  };

  return React.createElement(PendingChangesContext.Provider, { value }, children);
}

export function usePendingChanges() {
  const context = useContext(PendingChangesContext);
  if (context === undefined) {
    throw new Error("usePendingChanges must be used within a PendingChangesProvider");
  }
  return context;
}