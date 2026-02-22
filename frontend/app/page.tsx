"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bomb, Brain, Clock, Coins } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAccount, useConnect } from "wagmi";

export default function LandingPage() {
    const router = useRouter();
    const { isConnected } = useAccount();
    const { connect, connectors, isPending } = useConnect();

    useEffect(() => {
        if (isConnected) router.push("/home");
    }, [isConnected, router]);

    const handleConnectWallet = () => {
        if (connectors.length === 0) return;
        connect({ connector: connectors[0] });
    };

    return (
        <div className="flex-1 flex flex-col items-center w-full min-h-screen bg-neo-purple bg-neo-dots">
            <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 max-w-5xl mx-auto w-full">
                <div className="text-center mb-12 space-y-6">
                    <div className="inline-flex items-center justify-center p-4 bg-neo-red rounded-full border-neo shadow-[var(--shadow-neo)] mb-4">
                        <Bomb size={48} className="text-white" />
                    </div>
                    <h1 className="text-6xl sm:text-7xl font-black tracking-tighter uppercase drop-shadow-[4px_4px_0_rgba(17,17,17,1)] text-white">
                        Blitz Quiz
                    </h1>
                    <p className="text-2xl sm:text-3xl font-bold max-w-2xl mx-auto mt-4">
                        Think fast. Type faster. Don&apos;t explode.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 w-full">
                    <Card className="bg-neo-blue">
                        <CardHeader>
                            <Brain size={32} className="mb-2" />
                            <CardTitle>Think</CardTitle>
                        </CardHeader>
                        <CardContent className="font-medium text-lg">
                            A category is given. You must submit a unique word fitting that category.
                        </CardContent>
                    </Card>

                    <Card className="bg-neo-green">
                        <CardHeader>
                            <Clock size={32} className="mb-2" />
                            <CardTitle>Survive</CardTitle>
                        </CardHeader>
                        <CardContent className="font-medium text-lg">
                            You only have a few seconds to answer. If the bomb goes off, you&apos;re out.
                        </CardContent>
                    </Card>

                    <Card className="bg-neo-pink">
                        <CardHeader>
                            <Coins size={32} className="mb-2" />
                            <CardTitle>Predict</CardTitle>
                        </CardHeader>
                        <CardContent className="font-medium text-lg">
                            Stake tokens on Monad Testnet predicting who will win or lose first.
                        </CardContent>
                    </Card>
                </div>

                <Button
                    size="lg"
                    variant="default"
                    className="w-full sm:w-auto text-2xl py-8 px-12 bg-white hover:bg-gray-100"
                    onClick={handleConnectWallet}
                    disabled={isPending || connectors.length === 0}
                >
                    {isPending ? "Connecting..." : "Connect Wallet"}
                </Button>

                <p className="mt-8 font-bold text-gray-800 text-center max-w-sm">
                    Connect your wallet to enter the arena and stake your predictions.
                </p>
            </main>
        </div>
    );
}
