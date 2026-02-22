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

    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Attempt WebSocket connection
        try {
            ws.current = new WebSocket("ws://localhost:3001/ws");

            ws.current.onopen = () => {
                console.log("WS Connected for match", matchId);
                // Send JOIN_MATCH event
                ws.current?.send(JSON.stringify({
                    event: "JOIN_MATCH",
                    payload: {
                        matchId,
                        player: {
                            id: myPlayerId,
                            address: "0xMockAddress",
                            username: "Atokuwu"
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
                setBombTimer((t) => (t > 0 ? Number((t - 0.1).toFixed(1)) : 0));
            }, 100);
            return () => clearInterval(interval);
        }
    }, []);

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
            setCurrentPlayerId("p3"); // Pass turn
        }
        setAnswerInput("");
    };

    const isMyTurn = myPlayerId === currentPlayerId;

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

            <main className="flex-1 flex flex-col items-center justify-between p-4 relative overflow-hidden bg-neo-yellow pattern-grid-lg">

                {phase === "PREDICTION" && (
                    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
                        <div className="bg-neo-white border-neo shadow-[var(--shadow-neo-lg)] p-8 max-w-xl w-full text-center">
                            <h2 className="text-4xl font-black mb-4">Prediction Phase</h2>
                            <p className="text-xl font-bold mb-8">Place your stakes on Monad Testnet before the match starts!</p>
                            {/* Mock Prediction Buttons */}
                            <div className="space-y-4">
                                <Button className="w-full" size="lg" variant="primary">Predict Winner (1 MON)</Button>
                                <Button className="w-full" size="lg" variant="danger">Predict First Eliminated (1 MON)</Button>
                            </div>
                            <Button className="mt-8 font-bold" variant="outline" onClick={() => setPhase("NORMAL")}>
                                [DEV] Skip Prediction Phase
                            </Button>
                        </div>
                    </div>
                )}

                <div className="w-full h-full flex items-center justify-center pt-8 pb-32">
                    {/* Main layout ring with Bomb in center */}
                    <ArenaLayout
                        players={players}
                        currentPlayerId={currentPlayerId}
                        bombTimer={bombTimer}
                        category={category}
                    />
                </div>

                {/* Input Area (Pinned to bottom) */}
                <div className="absolute bottom-0 left-0 w-full bg-neo-black border-t-8 border-black p-4 sm:p-8 flex justify-center z-40">
                    <form
                        onSubmit={handleSubmitAnswer}
                        className="w-full max-w-3xl flex gap-4"
                    >
                        <Input
                            value={answerInput}
                            onChange={(e) => setAnswerInput(e.target.value)}
                            placeholder={isMyTurn ? "Type your answer..." : "Waiting for other players..."}
                            disabled={!isMyTurn}
                            className="text-2xl h-16 sm:h-20 uppercase font-black"
                            autoFocus
                        />
                        <Button
                            type="submit"
                            size="lg"
                            variant="primary"
                            disabled={!isMyTurn || !answerInput.trim()}
                            className="h-16 sm:h-20 px-8 sm:px-12 text-2xl"
                        >
                            SUBMIT
                        </Button>
                    </form>
                </div>

            </main>
        </div>
    );
}
