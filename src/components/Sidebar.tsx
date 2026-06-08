"use client";

import { House, Search, Library, Disc3 } from "lucide-react";

type Props = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalSongs: number;
};

export default function Sidebar({
  activeTab,
  setActiveTab,
}: Props) {
  return (
    <>
      {/* DESKTOP SIDEBAR */}

      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-72 z-40 p-4">
        <div className="glass rounded-3xl w-full h-full p-6 flex flex-col">
          <div className="flex items-center gap-3">
            <Disc3 className="text-blue-400" size={34} />

            <div>
              <h1 className="text-4xl font-black text-blue-400">
                PavPav
              </h1>

              <p className="text-gray-400 text-sm">
                Dreamy Music Player
              </p>
            </div>
          </div>

          <div className="mt-10 space-y-3">
            <button
              onClick={() => setActiveTab("home")}
              className={`w-full flex items-center gap-3 p-4 rounded-xl transition ${
                activeTab === "home"
                  ? "bg-blue-500/20 border border-blue-400"
                  : "glass"
              }`}
            >
              <House />
              Home
            </button>

            <button
              onClick={() => setActiveTab("search")}
              className={`w-full flex items-center gap-3 p-4 rounded-xl transition ${
                activeTab === "search"
                  ? "bg-blue-500/20 border border-blue-400"
                  : "glass"
              }`}
            >
              <Search />
              Search
            </button>

            <button
              onClick={() => setActiveTab("library")}
              className={`w-full flex items-center gap-3 p-4 rounded-xl transition ${
                activeTab === "library"
                  ? "bg-blue-500/20 border border-blue-400"
                  : "glass"
              }`}
            >
              <Library />
              Library
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE TOPBAR */}

      <div className="md:hidden fixed top-3 left-3 right-3 z-40">
        <div className="glass rounded-2xl px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Disc3 className="text-blue-400" size={26} />

            <div>
              <h1 className="font-black text-blue-400 text-xl">
                PavPav
              </h1>

              <p className="text-gray-400 text-xs">
                Dreamy Music Player
              </p>
            </div>
          </div>

          <div className="flex items-center justify-around">
            <button
              onClick={() => setActiveTab("home")}
              className={
                activeTab === "home"
                  ? "text-blue-400"
                  : "text-white"
              }
            >
              <House size={22} />
            </button>

            <button
              onClick={() => setActiveTab("search")}
              className={
                activeTab === "search"
                  ? "text-blue-400"
                  : "text-white"
              }
            >
              <Search size={22} />
            </button>

            <button
              onClick={() => setActiveTab("library")}
              className={
                activeTab === "library"
                  ? "text-blue-400"
                  : "text-white"
              }
            >
              <Library size={22} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}