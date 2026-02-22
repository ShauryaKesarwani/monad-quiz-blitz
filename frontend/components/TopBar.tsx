"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";

function shortAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function TopBar() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { connect, connectors, isPending: isConnecting } = useConnect();
    const { disconnect } = useDisconnect();

    const { data: balance, isLoading: isBalanceLoading } = useBalance({
        address,
        query: {
            enabled: Boolean(address),
        },
    });

    const balanceLabel = !isConnected
        ? "—"
        : isBalanceLoading
        ? "Loading…"
        : balance
        ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}`
        : "—";

    return (
        <header className="w-full flex items-center justify-between p-4 sm:p-6 border-b-[3px] border-neo-black bg-neo-white">
            <button onClick={() => router.push("/home")} className="text-2xl font-black uppercase tracking-tight hover:underline text-left">
                Blitz Quiz
            </button>

            <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 bg-neo-yellow px-4 py-2 border-neo font-bold shadow-[var(--shadow-neo)]">
                    <span>{balanceLabel}</span>
                </div>

                <div className="flex items-center gap-2 bg-neo-purple text-white px-4 py-2 border-neo font-bold shadow-[var(--shadow-neo)]">
                    <User size={18} />
                    <span>{address ? shortAddress(address) : "Not connected"}</span>
                </div>

                {isConnected ? (
                    <Button size="sm" variant="outline" onClick={() => disconnect()}>
                        Disconnect
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        variant="default"
                        onClick={() => connect({ connector: connectors[0] })}
                        disabled={isConnecting || connectors.length === 0}
                    >
                        {isConnecting ? "Connecting..." : "Connect"}
                    </Button>
                )}
            </div>
        </header>
    );
}
