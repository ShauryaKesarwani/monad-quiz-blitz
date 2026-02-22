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

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [displayName, setDisplayName] = useState("");
    const [stakeValue, setStakeValue] = useState("1"); // Default 1 MON

    const handleCreateRoom = async () => {
        if (!displayName.trim() || !stakeValue.trim()) return;

        setIsCreating(true);
        // Save to local storage for the next page to use
        localStorage.setItem("monadArenaName", displayName.trim());
        localStorage.setItem("monadArenaStake", stakeValue.trim());

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

        // Let's ask them for a name too if they don't have one? For simplicity assume they set it somewhere, or we just prompt
        // A minimal approach is just routing. We can use localStorage name if it exists.

        setIsJoining(true);
        router.push(`/match/${roomCode.trim()}`);
    };

    return (
        <div className="flex-1 flex flex-col items-center w-full min-h-screen bg-neo-purple bg-neo-dots">
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
                                onClick={() => setShowCreateModal(true)}
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
                                    {isJoining ? "Joining..." : "Join Online Servers"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Create Room Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
                    <Card className="max-w-md w-full border-[4px] border-black shadow-[var(--shadow-neo-lg)] bg-neo-white">
                        <CardHeader className="border-b-[4px] border-black bg-neo-yellow">
                            <CardTitle className="text-3xl font-black uppercase">Room Settings</CardTitle>
                            <CardDescription className="text-black font-bold text-lg">
                                Set your identity and stakes for this match.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="font-bold text-lg">Display Name</label>
                                <Input
                                    placeholder="Enter your nickname..."
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="text-xl h-14 font-bold border-[3px]"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="font-bold text-lg">Stake Amount (MON)</label>
                                <Input
                                    type="number"
                                    placeholder="1.0"
                                    min="0.1"
                                    step="0.1"
                                    value={stakeValue}
                                    onChange={(e) => setStakeValue(e.target.value)}
                                    className="text-xl h-14 font-bold border-[3px]"
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <Button
                                    variant="outline"
                                    className="flex-1 text-xl py-6"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    className="flex-1 text-xl py-6"
                                    onClick={handleCreateRoom}
                                    disabled={!displayName.trim() || !stakeValue.trim() || isCreating}
                                >
                                    Confirm
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
