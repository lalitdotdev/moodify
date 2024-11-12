"use client"

import { Github, Loader2, Music, Sparkles, Star } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PlaylistResult from '@/components/playlist-result';
import { toast } from 'sonner';

interface Song {
    name: string;
    artist: string;
    album?: string;
    year?: string;
    genres?: string[];
    explanation?: string;
}

const BackgroundGradient = () => (
    <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10 animate-pulse" />
    </div>
);

const FloatingParticles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
            <div
                key={i}
                className="absolute w-1 h-1 bg-purple-400/20 rounded-full animate-float"
                style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 5}s`,
                    animationDuration: `${5 + Math.random() * 10}s`
                }}
            />
        ))}
    </div>
);

export default function Home() {
    const [inputSong, setInputSong] = useState("");
    const [loading, setLoading] = useState(false);
    const [playlist, setPlaylist] = useState<Song[]>([]);
    const [error, setError] = useState("");
    const [suggestions, setSuggestions] = useState<Song[]>([]);
    const [isInputFocused, setIsInputFocused] = useState(false);

    const allSongs: Song[] = [
        { name: "Bohemian Rhapsody", artist: "Queen" },
        { name: "Imagine", artist: "John Lennon" },
        { name: "Like a Rolling Stone", artist: "Bob Dylan" },
        { name: "Smells Like Teen Spirit", artist: "Nirvana" },
        { name: "Billie Jean", artist: "Michael Jackson" },
        { name: "Hey Jude", artist: "The Beatles" },
        { name: "Purple Rain", artist: "Prince" },
        { name: "Stairway to Heaven", artist: "Led Zeppelin" },
        { name: "What's Going On", artist: "Marvin Gaye" },
        { name: "Respect", artist: "Aretha Franklin" },
        { name: "Born to Run", artist: "Bruce Springsteen" },
        { name: "Hotel California", artist: "Eagles" },
        { name: "Good Vibrations", artist: "The Beach Boys" },
        { name: "London Calling", artist: "The Clash" },
        { name: "Waterloo Sunset", artist: "The Kinks" },
    ];

    useEffect(() => {
        const getRandomSuggestions = (count: number) => {
            const shuffled = [...allSongs].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, count);
        };

        setSuggestions(getRandomSuggestions(3));

        const interval = setInterval(() => {
            setSuggestions(getRandomSuggestions(6));
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const generatePlaylist = async () => {
        setLoading(true);
        setError("");
        setPlaylist([]);

        const loadingToast = toast.loading("Generating your playlist...");

        try {
            if (!inputSong || !inputSong.trim()) {
                throw new Error("Please enter a song name");
            }

            const response = await fetch("/api/generate-playlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ song: inputSong }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json().catch(() => {
                throw new Error('Failed to parse response JSON');
            });

            if (!Array.isArray(data.playlist) || data.playlist.length === 0) {
                throw new Error("Failed to generate a valid playlist");
            }

            setPlaylist(data.playlist);
            toast.success("Playlist generated successfully!", {
                id: loadingToast,
            });
        } catch (error) {
            console.error("Error generating playlist:", error);
            setError(error instanceof Error ? error.message : "An unexpected error occurred");
        } finally {
            setLoading(false);
            toast.dismiss(loadingToast); // Dismiss the loading toast
        }
    };


    // ADD PROMISE TOAST NOTIFICATION FOR STATE WHEN GENERATING PLAYLIST AND WHEN ERROR OCCURS


    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-950">
            <BackgroundGradient />
            <FloatingParticles />

            <header className="relative z-10 flex justify-between items-center p-6">
                <div className="flex items-center space-x-3 group">
                    <div className="p-2 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors duration-300">
                        <Music className="w-6 h-6 text-purple-400" />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                        Moodify
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <Button variant="ghost" className="text-slate-400 hover:text-purple-400">
                        <Star className="w-5 h-5 mr-2" />
                        Pro Version
                    </Button>
                    <a
                        href="https://github.com/lalitdotdev"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-full hover:bg-white/10 transition-colors duration-200"
                    >
                        <Github className="w-6 h-6 text-slate-400 hover:text-purple-400" />
                    </a>
                </div>
            </header>

            <main className="relative z-10 flex flex-col items-center justify-center px-4 py-16 md:py-24">
                <div className="text-center space-y-6 mb-12 max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient">
                            Discover Your Perfect
                        </span>
                        <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient-slow">
                            AI-Curated Playlist
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        Experience the future of music discovery. Let our AI transform your favorite song into
                        a perfectly tailored playlist that matches your unique taste.
                    </p>
                </div>

                <div className="w-full max-w-2xl relative">
                    <Card className={`p-2 bg-slate-900/50 backdrop-blur-xl border-slate-800 transition-all duration-300 ${isInputFocused ? 'ring-2 ring-purple-500/50' : ''}`}>
                        <div className="relative flex items-center">
                            <Music className="w-5 h-5 text-slate-500 absolute left-4" />
                            <Input
                                type="text"
                                placeholder="Enter your favorite song..."
                                value={inputSong}
                                onChange={(e) => setInputSong(e.target.value)}
                                onFocus={() => setIsInputFocused(true)}
                                onBlur={() => setIsInputFocused(false)}
                                className="w-full bg-slate-950/50 text-slate-200 pl-12 pr-32 py-6 text-lg border-slate-800 placeholder-slate-500 focus-visible:ring-purple-400/50"
                            />
                            <Button
                                onClick={generatePlaylist}
                                disabled={loading}
                                className="absolute right-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-6"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        Generate
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                )}
                            </Button>
                        </div>
                    </Card>
                </div>

                {!loading && !playlist.length && (
                    <div className="mt-12 w-full max-w-2xl">
                        <h3 className="text-lg font-medium text-slate-400 mb-4 text-center">
                            Popular Picks
                        </h3>
                        <div className="flex flex-wrap justify-center gap-3">
                            {suggestions.map((song, index) => (
                                <button
                                    key={index}
                                    onClick={() => setInputSong(`${song.name} by ${song.artist}`)}
                                    className="px-4 py-2 rounded-full text-sm bg-slate-800/50 hover:bg-purple-500/20 text-slate-300 border border-slate-700/50 hover:border-purple-500/50 transition-all duration-200 group"
                                >
                                    <span className="flex items-center gap-2">
                                        <Music className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {song.name} - {song.artist}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-red-400 text-center">{error}</p>
                    </div>
                )}

                {!loading && playlist.length > 0 && (
                    <PlaylistResult playlist={playlist} />
                )}
            </main>


        </div>
    );
}
