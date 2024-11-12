"use client"

import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ChevronDown, ChevronUp, Copy, ExternalLink, Loader2, Music } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useState } from "react";

interface Song {
    name: string;
    artist: string;
    album?: string;
    year?: string;
    genres?: string[];
    explanation?: string;
    spotifyId?: string;
}

interface PlaylistResultProps {
    playlist: Song[];
}

export default function PlaylistResult({ playlist }: PlaylistResultProps) {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [copiedAll, setCopiedAll] = useState(false);
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const [creatingPlaylist, setCreatingPlaylist] = useState(false);

    const copyToClipboard = (text: string, index?: number) => {
        navigator.clipboard.writeText(text).then(() => {
            if (index !== undefined) {
                setCopiedIndex(index);
                setTimeout(() => setCopiedIndex(null), 2000);
            } else {
                setCopiedAll(true);
                setTimeout(() => setCopiedAll(false), 2000);
            }
        });
    };

    const copyAllSongs = () => {
        const allSongs = playlist
            .map((song, index) => `${index + 1}. ${song.name} - ${song.artist}`)
            .join("\n");
        copyToClipboard(allSongs);
    };

    const toggleExpand = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    const createSpotifyPlaylist = async () => {
        setCreatingPlaylist(true);
        try {
            const accessToken = localStorage.getItem("spotifyAccessToken");
            const tokenExpiry = localStorage.getItem("spotifyTokenExpiry");

            if (!accessToken || !tokenExpiry || Date.now() > parseInt(tokenExpiry)) {
                window.location.href = "/api/spotify/auth";
                return;
            }

            const response = await fetch("/api/spotify/create-playlist", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    accessToken,
                    playlistName: "Moodify AI Playlist Generator",
                    tracks: playlist
                        .map((song) => song.spotifyId ? `spotify:track:${song.spotifyId}` : null)
                        .filter(Boolean),
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success("Playlist created successfully!", {
                    description: `You can now view your playlist on Spotify. Redirecting...
                    `,
                    duration: 5000,
                },
                );
                // Add a delay before opening the new window
                setTimeout(() => {
                    window.open(`https://open.spotify.com/playlist/${data.playlistId}`, "_blank");
                }, 5000); // 5000 milliseconds = 5 seconds delay
            } else {
                throw new Error(data.error || "Failed to create playlist");
            }
        } catch (error) {
            console.error("Error creating Spotify playlist:", error);
            alert("Failed to create Spotify playlist. Please try again.");
        } finally {
            setCreatingPlaylist(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="w-full max-w-4xl  mt-6 md:mt-10 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Music className="h-5 w-5 text-purple-400" />
                        </div>
                        <CardTitle className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                            Your Playlist
                        </CardTitle>
                    </div>
                    {playlist.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={copyAllSongs}
                            className="text-slate-400 hover:text-purple-400 hover:bg-purple-500/10"
                        >
                            {copiedAll ? (
                                <Check className="h-4 w-4 mr-2" />
                            ) : (
                                <Copy className="h-4 w-4 mr-2" />
                            )}
                            {copiedAll ? "Copied!" : "Copy All"}
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[400px] pr-4">
                        <motion.ul className="space-y-4">
                            {playlist.map((song, index) => (
                                <motion.li
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-slate-950/50 rounded-lg border border-slate-800 p-4 hover:border-purple-500/30 transition-all duration-300"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="flex-1">
                                                <p className="font-semibold text-slate-200">
                                                    {song.name}
                                                </p>
                                                <p className="text-sm text-slate-400">{song.artist}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => copyToClipboard(`${song.name} - ${song.artist}`, index)}
                                            className="text-slate-400 hover:text-purple-400 hover:bg-purple-500/10"
                                        >
                                            {copiedIndex === index ? (
                                                <Check className="h-4 w-4" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>

                                    {(song.album || song.year || song.genres) && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {song.album && (
                                                <span className="text-xs px-2 py-1 rounded-full bg-slate-800/50 text-slate-400">
                                                    {song.album}
                                                </span>
                                            )}
                                            {song.year && (
                                                <span className="text-xs px-2 py-1 rounded-full bg-slate-800/50 text-slate-400">
                                                    {song.year}
                                                </span>
                                            )}
                                            {song.genres && song.genres.map((genre, idx) => (
                                                <span key={idx} className="text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-400">
                                                    {genre}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {song.explanation && (
                                        <div className="mt-3">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleExpand(index)}
                                                className="text-slate-400 hover:text-purple-400 hover:bg-purple-500/10"
                                            >
                                                {expandedIndex === index ? "Hide" : "Show"} explanation
                                                {expandedIndex === index ? (
                                                    <ChevronUp className="h-4 w-4 ml-2" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4 ml-2" />
                                                )}
                                            </Button>
                                            <AnimatePresence>
                                                {expandedIndex === index && (
                                                    <motion.p
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="mt-2 text-sm text-slate-400 border-l-2 border-purple-500/30 pl-3"
                                                    >
                                                        {song.explanation}
                                                    </motion.p>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </motion.li>
                            ))}
                        </motion.ul>
                    </ScrollArea>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-6"
                    >
                        <Button
                            onClick={createSpotifyPlaylist}
                            disabled={creatingPlaylist}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium"
                        >
                            {creatingPlaylist ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Playlist...
                                </>
                            ) : (
                                <>
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Export to Spotify
                                </>
                            )}
                        </Button>
                    </motion.div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
