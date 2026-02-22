"use client";

import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
    const router = useRouter();
    const [roomCode, setRoomCode] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);

    const handleCreateRoom = async () => {
        setIsCreating(true);
        try {
            const res = await fetch("http://localhost:3001/api/matches", {
                method: "POST",
            });
            if (res.ok) {
                const data = await res.json();
                router.push(`/match/${data.matchId}`);
            } else {
                console.error("Failed to create match");
                setIsCreating(false);
            }
        } catch (err) {
            console.error(err);
            setIsCreating(false);
            // Fallback in case backend is not running to test UI flow
            router.push(`/match/mock-room-123`);
        }
    };

    const handleJoinRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomCode.trim()) return;
        setIsJoining(true);
        // Usually we would check if match exists, but we'll just navigate
        router.push(`/match/${roomCode.trim()}`);
    };

    return (
        <div className="flex-1 flex flex-col items-center w-full min-h-screen">
            <TopBar />

            <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-4xl mx-auto space-y-12">
                <div className="text-center">
                    <h1 className="text-5xl sm:text-6xl font-black uppercase text-white drop-shadow-[4px_4px_0_rgba(17,17,17,1)]">
                        Arena Menu
                    </h1>
                    <p className="text-xl font-bold mt-2 text-black">
                        Start a new match or join your friends.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                    {/* Create Room */}
                    <Card className="bg-neo-yellow border-[4px] shadow-[var(--shadow-neo-lg)] hover:translate-y-[-4px] transition-transform duration-200">
                        <CardHeader className="border-b-[4px] border-black">
                            <CardTitle className="flex items-center gap-3 text-3xl">
                                <div className="p-2 bg-neo-pink rounded-sm border-neo text-black">
                                    <Plus size={28} strokeWidth={3} />
                                </div>
                                Create Room
                            </CardTitle>
                            <CardDescription className="text-black font-semibold mt-2">
                                Start a fresh lobby. You will be the host and can invite others.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="mt-6 flex justify-center">
                            <Button
                                size="lg"
                                variant="primary"
                                className="w-full text-2xl py-8"
                                onClick={handleCreateRoom}
                                disabled={isCreating}
                            >
                                {isCreating ? "Creating..." : "Create New Arena"}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Join Room */}
                    <Card className="bg-neo-blue border-[4px] shadow-[var(--shadow-neo-lg)] hover:translate-y-[-4px] transition-transform duration-200">
                        <CardHeader className="border-b-[4px] border-black text-white">
                            <CardTitle className="flex items-center gap-3 text-3xl text-black">
                                <div className="p-2 bg-neo-white rounded-sm border-neo text-black">
                                    <LogIn size={28} strokeWidth={3} />
                                </div>
                                Join Room
                            </CardTitle>
                            <CardDescription className="text-black font-semibold mt-2">
                                Enter a room code to jump into an active prediction or lobby phase.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="mt-6">
                            <form onSubmit={handleJoinRoom} className="space-y-4">
                                <Input
                                    placeholder="Enter Room Code (e.g. xyz-123)"
                                    value={roomCode}
                                    onChange={(e) => setRoomCode(e.target.value)}
                                    className="text-xl text-center h-16 uppercase placeholder:normal-case font-bold"
                                />
                                <Button
                                    type="submit"
                                    size="lg"
                                    variant="default"
                                    className="w-full text-2xl py-8"
                                    disabled={!roomCode.trim() || isJoining}
                                >
                                    {isJoining ? "Joining..." : "Enter Arena"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
