"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

import { motion } from "framer-motion";

import {
    Shuffle,
    SkipBack,
    SkipForward,
    Repeat,
    Play,
    Pause,
    Volume2,
} from "lucide-react";

type Song = {
    title: string;
    artist: string;
    cover: string;
    src: string;
};

type Props = {
    songs: Song[];
    currentSong: Song;
    currentIndex: number;
    setCurrentIndex: React.Dispatch<
        React.SetStateAction<number>
    >;
};

export default function MusicPlayer({
    songs,
    currentSong,
    currentIndex,
    setCurrentIndex,
}: Props) {
    const audioRef =
        useRef<HTMLAudioElement>(null);

    const [playing, setPlaying] =
        useState(false);

    const [shuffle, setShuffle] =
        useState(false);

    const [repeat, setRepeat] =
        useState(false);

    const [progress, setProgress] =
        useState(0);

    const [volume, setVolume] =
        useState(0.8);

    const nextSong = () => {
        if (!songs.length) return;

        if (repeat) {
            audioRef.current?.pause();

            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
            }

            return;
        }

        if (shuffle) {
            const random =
                Math.floor(
                    Math.random() *
                    songs.length
                );

            setCurrentIndex(random);

            return;
        }

        setCurrentIndex((prev) =>
            prev === songs.length - 1
                ? 0
                : prev + 1
        );
    };

    const prevSong = () => {
        if (!songs.length) return;

        if (repeat) {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
            }

            return;
        }

        setCurrentIndex((prev) =>
            prev === 0
                ? songs.length - 1
                : prev - 1
        );
    };

    useEffect(() => {
        if (!audioRef.current) return;

        audioRef.current.load();

        audioRef.current
            .play()
            .catch(() => { });

        setPlaying(true);
    }, [currentSong]);

    useEffect(() => {
        if (!audioRef.current) return;

        audioRef.current.volume =
            volume;
    }, [volume]);

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (playing) {
            audioRef.current.pause();

            setPlaying(false);
        } else {
            audioRef.current.play();

            setPlaying(true);
        }
    };

    const formatTime = (
        time: number
    ) => {
        if (!time || isNaN(time))
            return "0:00";

        const minutes =
            Math.floor(time / 60);

        const seconds =
            Math.floor(time % 60);

        return `${minutes}:${seconds
            .toString()
            .padStart(2, "0")}`;
    };

    const seekAudio = (
        clientX: number,
        rect: DOMRect
    ) => {
        if (!audioRef.current) return;

        const percent =
            Math.min(
                Math.max(
                    (clientX - rect.left) /
                    rect.width,
                    0
                ),
                1
            );

        audioRef.current.currentTime =
            percent *
            audioRef.current.duration;
    };

    const currentTime =
        audioRef.current?.currentTime ||
        0;

    const duration =
        audioRef.current?.duration || 0;
    return (
        <div
  className="fixed bottom-2 left-2 md:left-[300px] right-2 z-[9999] pointer-events-auto"
>
            <div className="glass rounded-2xl p-2 md:p-4 relative overflow-hidden">
                {/* Bubbles */}

                {[...Array(20)].map((_, i) => (
  <span
    key={i}
    className="music-bubble"
    style={{
      left: `${i * 5}%`,
      animationDelay: `${i * 0.25}s`,
      animationDuration: `${4 + (i % 4)}s`,
    }}
  />
))}

                <div
                    className="flex flex-col xl:flex-row items-center gap-3 justify-between"
                >
                    {/* SONG INFO */}

                    <div
                        className="flex items-center gap-3 w-full xl:w-72"
                    >
                        <motion.div
                            animate={
                                playing
                                    ? {
                                        rotate: 360,
                                    }
                                    : {}
                            }
                            transition={{
                                duration: 12,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                        >
                            <img
                                src={currentSong.cover}
                                alt={currentSong.title}
                                className="w-8 h-8 md:w-14 md:h-14 rounded-full object-cover border border-white/10 shadow-lg"
                            />
                        </motion.div>

                        <div
                            className="flex-1 min-w-0 max-w-[220px] md:max-w-none"
                        >
                            <h3
                                className="font-semibold truncate text-sm md:text-base"
                            >
                                {currentSong.title}
                            </h3>

                            <p
                                className="text-xs md:text-sm text-gray-400 truncate"
                            >
                                {currentSong.artist}
                            </p>
                        </div>
                    </div>

                    {/* PLAYER CONTROLS */}

                    <div
                        className="flex flex-col items-center gap-4 w-full max-w-2xl"
                    >
                        <div
                            className="flex items-center justify-center gap-2 md:gap-4"
                        >
                            <button
                                onClick={() =>
                                    setShuffle(
                                        !shuffle
                                    )
                                }
                                className={
                                    shuffle
                                        ? "text-blue-400"
                                        : ""
                                }
                            >
                                <Shuffle />
                            </button>

                            <button
                                onClick={
                                    prevSong
                                }
                            >
                                <SkipBack />
                            </button>

                            <button
                                onClick={
                                    togglePlay
                                }
                                className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-blue-500 flex items-center justify-center shadow-lg"
                            >
                                {playing ? (
                                    <Pause />
                                ) : (
                                    <Play />
                                )}
                            </button>

                            <button
                                onClick={
                                    nextSong
                                }
                            >
                                <SkipForward />
                            </button>

                            <button
                                onClick={() =>
                                    setRepeat(
                                        !repeat
                                    )
                                }
                                className={
                                    repeat
                                        ? "text-blue-400"
                                        : ""
                                }
                            >
                                <Repeat />
                            </button>
                        </div>

                        {/* PROGRESS */}

                        <div className="w-full">

                            <div
                                className="flex justify-between text-xs text-gray-400 mb-2"
                            >
                                <span>
                                    {formatTime(
                                        currentTime
                                    )}
                                </span>

                                <span>
                                    {formatTime(
                                        duration
                                    )}
                                </span>
                            </div>

                            <div
                                className="h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer"
                                onPointerDown={(e) => {
                                    const rect =
                                        e.currentTarget.getBoundingClientRect();

                                    seekAudio(
                                        e.clientX,
                                        rect
                                    );

                                    const move = (
                                        event: PointerEvent
                                    ) => {
                                        seekAudio(
                                            event.clientX,
                                            rect
                                        );
                                    };

                                    const up = () => {
                                        window.removeEventListener(
                                            "pointermove",
                                            move
                                        );

                                        window.removeEventListener(
                                            "pointerup",
                                            up
                                        );
                                    };

                                    window.addEventListener(
                                        "pointermove",
                                        move
                                    );

                                    window.addEventListener(
                                        "pointerup",
                                        up
                                    );
                                }}
                            >
                                <div
                                    className="h-full bg-blue-400"
                                    style={{
                                        width: `${progress}%`,
                                        boxShadow:
                                            "0 0 15px #4f7cff",
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* VOLUME */}

                    <div
  className="hidden md:flex items-center gap-2 w-32 self-start xl:self-center -mt-2"
                    >
                        <Volume2
                            size={14}
                        />

                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={(e) =>
                                setVolume(
                                    Number(e.target.value)
                                )
                            }
                            className="w-full h-1 accent-blue-400 cursor-pointer"
                        />
                    </div>
                </div>

                <audio
                    ref={audioRef}
                    onTimeUpdate={() => {
                        const audio =
                            audioRef.current;

                        if (!audio)
                            return;

                        setProgress(
                            (audio.currentTime /
                                audio.duration) *
                            100 || 0
                        );
                    }}
                    onEnded={() => {
                        if (repeat) {
                            if (
                                audioRef.current
                            ) {
                                audioRef.current.currentTime =
                                    0;

                                audioRef.current.play();
                            }

                            return;
                        }

                        nextSong();
                    }}
                >
                    <source
                        src={currentSong.src}
                        type="audio/mpeg"
                    />
                </audio>
            </div>
        </div>
    );
}