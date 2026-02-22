"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { ArenaLayout, UIPlayer } from "@/components/ArenaLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Basic mocks for now before doing full WS payload matching
const MOCK_PLAYERS: UIPlayer[] = [
    { id: "p1", username: "Atokuwu", status: "ALIVE" },
    { id: "p2", username: "Davizin", status: "ELIMINATED" },
    { id: "p3", username: "rayman", status: "ALIVE" },
    { id: "p4", username: "papa", status: "ALIVE" },
    { id: "p5", username: "Royally", status: "ALIVE" },
    { id: "p6", username: "voong", status: "ALIVE" },
    { id: "p7", username: "SORE", status: "ALIVE" },
    { id: "p8", username: "YOYO", status: "ALIVE" },
];

export default function MatchPage() {
    const params = useParams();
    const matchId = params.id as string;
    const router = useRouter();

    // Local state based on shared MatchState
    const [players, setPlayers] = useState<UIPlayer[]>(MOCK_PLAYERS);
    const [currentPlayerId, setCurrentPlayerId] = useState<string>("p1");
    const [bombTimer, setBombTimer] = useState<number>(10);
    const [category, setCategory] = useState<string>("Words containing 'ON'");
    const [bannedLetters, setBannedLetters] = useState<string[]>([]);
    const [phase, setPhase] = useState<string>("NORMAL"); // PREDICTION | NORMAL | ENDED

    const [myPlayerId, setMyPlayerId] = useState<string>("p1"); // Mocking that "I" am Atokuwu
    const [answerInput, setAnswerInput] = useState("");

    const [savedName, setSavedName] = useState("Player");
    const [savedStake, setSavedStake] = useState("1");

    useEffect(() => {
        setSavedName(localStorage.getItem("monadArenaName") || "Player");
        setSavedStake(localStorage.getItem("monadArenaStake") || "1");
    }, []);

    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Attempt WebSocket connection
        try {
            ws.current = new WebSocket("ws://localhost:3001/ws");

            ws.current.onopen = () => {
                const name = localStorage.getItem("monadArenaName") || "Player";
                console.log("WS Connected for match", matchId);
                // Send JOIN_MATCH event
                ws.current?.send(JSON.stringify({
                    event: "JOIN_MATCH",
                    payload: {
                        matchId,
                        player: {
                            id: myPlayerId,
                            address: "0xMockAddress",
                            username: name
                        }
                    }
                }));
            };

            ws.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.event === "MATCH_UPDATED") {
                    const matchData = data.payload.match;
                    if (matchData) {
                        setPhase(matchData.phase);
                        setCategory(matchData.currentCategory?.name || "Waiting...");
                        setBombTimer(matchData.currentTurnTimer || 0);
                        setCurrentPlayerId(matchData.currentPlayerId);
                        setPlayers(matchData.players.map((p: any) => ({
                            id: p.id,
                            username: p.username,
                            status: p.status,
                        })));
                        if (matchData.constraints?.bannedLetters) {
                            setBannedLetters(matchData.constraints.bannedLetters);
                        }
                    }
                }
            };

            ws.current.onerror = (err) => {
                console.error("WS Error fallback to mock ui", err);
            };

        } catch (e) {
            console.log("No WS server running. Using mock data.");
        }

        return () => {
            ws.current?.close();
        };
    }, [matchId, myPlayerId]);

    // Mock Timer decrement if disconnected
    useEffect(() => {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
            const interval = setInterval(() => {
                setBombTimer((t) => {
                    const nextTime = Number((t - 0.1).toFixed(1));
                    if (nextTime <= 0) {
                        // Time's up! Eliminate current player
                        setPlayers(prev => {
                            const updated = prev.map(p =>
                                p.id === currentPlayerId ? { ...p, status: "ELIMINATED" as const } : p
                            );

                            // Pass turn to next alive player clockwise
                            const currentIndex = updated.findIndex(p => p.id === currentPlayerId);
                            let nextIndex = (currentIndex + 1) % updated.length;
                            while (updated[nextIndex].status === "ELIMINATED" && nextIndex !== currentIndex) {
                                nextIndex = (nextIndex + 1) % updated.length;
                            }
                            setCurrentPlayerId(updated[nextIndex].id);
                            return updated;
                        });

                        // Change category mock
                        const cats = ["Crypto tokens", "Animals that swim", "Start with letter A"];
                        setCategory(cats[Math.floor(Math.random() * cats.length)]);

                        return 8; // Reset timer
                    }
                    return nextTime;
                });
            }, 100);
            return () => clearInterval(interval);
        }
    }, [currentPlayerId]);

    const handleSubmitAnswer = (e: React.FormEvent) => {
        e.preventDefault();
        if (!answerInput.trim() || currentPlayerId !== myPlayerId) return;

        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                event: "SUBMIT_ANSWER",
                payload: {
                    matchId,
                    playerId: myPlayerId,
                    answer: answerInput.trim()
                }
            }));
        } else {
            // Mock progression
            console.log("Submitted (Mock):", answerInput);
            setBombTimer(8);

            // Pass turn clockwise
            const currentIndex = players.findIndex(p => p.id === currentPlayerId);
            let nextIndex = (currentIndex + 1) % players.length;
            while (players[nextIndex].status === "ELIMINATED" && nextIndex !== currentIndex) {
                nextIndex = (nextIndex + 1) % players.length;
            }
            setCurrentPlayerId(players[nextIndex].id);
        }
        setAnswerInput("");
    };

    const isMyTurn = myPlayerId === currentPlayerId;

    const handlePredict = (type: "winner" | "first_eliminated") => {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
            console.log("Mock prediction submitted:", type);
            // In mock mode, we immediately drop them into Normal
            setPhase("NORMAL");
            return;
        }

        // Let's just predict a random opponent for now depending on type
        // In a real game you'd select the player from a dropdown
        const opponent = players.find(p => p.id !== myPlayerId) || players[0];

        ws.current.send(JSON.stringify({
            event: "SUBMIT_PREDICTION",
            payload: {
                matchId,
                prediction: {
                    playerId: myPlayerId,
                    predictedWinner: type === "winner" ? opponent.id : "none",
                    predictedFirstElimination: type === "first_eliminated" ? opponent.id : "none"
                }
            }
        }));
        // Note: Actual transition from PREDICTION -> NORMAL is handled by the server (MATCH_UPDATED)
        console.log("Prediction sent!", type);
    };

    return (
        <div className="flex-1 flex flex-col min-h-screen">
            <TopBar />

            {/* Game Header Area / Bans */}
            <div className="w-full flex justify-between items-center p-4 bg-neo-black text-white border-b-4 border-black">
                <h2 className="text-2xl font-black">Room: {matchId.substring(0, 6)}</h2>
                {bannedLetters.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-neo-red">BANNED LETTERS:</span>
                        <div className="flex gap-2">
                            {bannedLetters.map(letter => (
                                <span key={letter} className="bg-neo-red px-2 py-1 font-bold rounded-sm border-2 border-neo-white">
                                    {letter}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <main className="flex-1 flex flex-col items-center p-4 relative overflow-hidden bg-neo-purple bg-neo-dots pb-32">

                {phase === "PREDICTION" ? (
                    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
                        <div className="bg-neo-white border-neo shadow-[var(--shadow-neo-lg)] p-8 max-w-xl w-full text-center">
                            <h2 className="text-4xl font-black mb-4">Prediction Phase</h2>
                            <p className="text-xl font-bold mb-8">Place your stakes on Monad Testnet before the match starts! (Stake: {savedStake} MON)</p>
                            {/* Mock Prediction Buttons */}
                            <div className="space-y-4">
                                <Button className="w-full" size="lg" variant="primary" onClick={() => handlePredict("winner")}>
                                    Predict Winner ({savedStake} MON)
                                </Button>
                                <Button className="w-full" size="lg" variant="danger" onClick={() => handlePredict("first_eliminated")}>
                                    Predict First Eliminated ({savedStake} MON)
                                </Button>
                            </div>
                            <Button className="mt-8 font-bold" variant="outline" onClick={() => setPhase("NORMAL")}>
                                [DEV] Skip Prediction Phase
                            </Button>
                        </div>
                    </div>
                ) : null}

                <div className="w-full flex-1 flex items-center justify-center relative mt-12 mb-12">
                    {/* Main layout ring with Bomb in center */}
                    <ArenaLayout
                        players={players}
                        currentPlayerId={currentPlayerId}
                        bombTimer={bombTimer}
                        category={category}
                    />
                </div>

                {/* Input Area (Pinned to bottom) */}
                <div className="absolute bottom-0 left-0 w-full bg-neo-yellow border-t-8 border-black p-4 sm:p-8 flex justify-center z-40">
                    <form
                        onSubmit={handleSubmitAnswer}
                        className="w-full max-w-3xl flex gap-4"
                    >
                        <Input
                            value={answerInput}
                            onChange={(e) => setAnswerInput(e.target.value)}
                            placeholder={isMyTurn ? "Type your answer..." : "Waiting for other players..."}
                            disabled={!isMyTurn}
                            className="text-2xl h-16 sm:h-20 uppercase font-black border-[4px]"
                            autoFocus
                        />
                        <Button
                            type="submit"
                            size="lg"
                            variant="danger"
                            disabled={!isMyTurn || !answerInput.trim()}
                            className="h-16 sm:h-20 px-8 sm:px-12 text-2xl border-[4px] border-black bg-neo-red text-white"
                        >
                            SUBMIT
                        </Button>
                    </form>
                </div>

            </main>
        </div>
    );
}
