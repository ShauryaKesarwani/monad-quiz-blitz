"use client";

import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BACKEND_URL } from "@/lib/runtime";
import { useAccount } from "wagmi";

export default function HomePage() {
    const router = useRouter();
    const { isConnected } = useAccount();
    const [roomCode, setRoomCode] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);

    // Config state
    const [displayName, setDisplayName] = useState("");
    const [stakeValue, setStakeValue] = useState("1"); // Default 1 MON
    const [isFetchingRooms, setIsFetchingRooms] = useState(false);
    const [activeRooms, setActiveRooms] = useState<Array<{ id: string; phase: string; players?: Array<any> }>>([]);

    useEffect(() => {
        if (!isConnected) router.push("/");
    }, [isConnected, router]);

    const handleCreateRoom = async () => {
        if (!displayName.trim() || !stakeValue.trim()) return;

        setIsCreating(true);
        // Save to local storage for the next page to use
        localStorage.setItem("monadArenaName", displayName.trim());
        localStorage.setItem("monadArenaStake", stakeValue.trim());

        try {
            const res = await fetch(`${BACKEND_URL}/api/matches`, {
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
        }
    };

    const handleOpenJoinModal = async () => {
        setShowJoinModal(true);
        setIsFetchingRooms(true);
        try {
            const res = await fetch("http://localhost:3001/api/matches");
            if (res.ok) {
                const data = await res.json();
                setActiveRooms(data.matches || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsFetchingRooms(false);
        }
    };

    const handleJoinSpecificRoom = (targetMatchId: string) => {
        // Also capture identity if they want, but let's assume they have it in local storage 
        // or we use a default if it's purely joining over modal.
        if (displayName.trim()) {
            localStorage.setItem("monadArenaName", displayName.trim());
        }
        setIsJoining(true);
        router.push(`/match/${targetMatchId}`);
    };

    const handleJoinRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomCode.trim()) return;

        if (displayName.trim()) {
            localStorage.setItem("monadArenaName", displayName.trim());
        }
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

            {/* Join Room Discovery Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
                    <Card className="max-w-xl w-full border-[4px] border-black shadow-[var(--shadow-neo-lg)] bg-neo-white max-h-[80vh] flex flex-col">
                        <CardHeader className="border-b-[4px] border-black bg-neo-blue text-white">
                            <CardTitle className="text-3xl font-black uppercase text-black">Online Servers</CardTitle>
                            <CardDescription className="text-black font-bold text-lg">
                                Select an active match to join.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 overflow-y-auto space-y-4 flex-1">
                            {/* Optional quick identity setup */}
                            <div className="space-y-1 mb-6 border-b-2 border-black pb-4">
                                <label className="font-bold text-md">Set Identity Before Joining:</label>
                                <Input
                                    placeholder="Enter nickname..."
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="text-lg h-12 font-bold border-[2px]"
                                />
                            </div>

                            {isFetchingRooms ? (
                                <p className="text-center font-bold text-xl py-8">Searching for rooms...</p>
                            ) : activeRooms.length === 0 ? (
                                <p className="text-center font-bold text-xl py-8 text-gray-600">No active rooms found. Try creating one!</p>
                            ) : (
                                <div className="space-y-4">
                                    {activeRooms.map((room) => (
                                        <div key={room.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-neo-white border-[3px] border-black shadow-[var(--shadow-neo)] hover:translate-y-[-2px] hover:shadow-[var(--shadow-neo-hover)] transition-all">
                                            <div>
                                                <p className="font-black text-xl leading-none">ID: {room.id.substring(0, 8)}</p>
                                                <p className="font-bold text-gray-700 mt-2">
                                                    Phase: {room.phase} &bull; Players: {room.players?.length || 0}/8
                                                </p>
                                            </div>
                                            <Button
                                                variant="primary"
                                                className="mt-4 sm:mt-0 px-8 py-6 text-lg font-black"
                                                onClick={() => handleJoinSpecificRoom(room.id)}
                                                disabled={isJoining}
                                            >
                                                JOIN
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                        <div className="p-4 border-t-[4px] border-black bg-neo-white">
                            <Button
                                variant="outline"
                                className="w-full text-xl py-6"
                                onClick={() => setShowJoinModal(false)}
                            >
                                Close
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

