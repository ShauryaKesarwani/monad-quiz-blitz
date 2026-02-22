"use client";

import { useState, useEffect } from "react";
import { Player, PlayerStatus } from "@/shared/types/game" // I'll mock these if the import absolute path is an issue
import { cn } from "@/lib/utils";

// Make a local version for the UI to prevent build errors if the shared folder isn't configured in tsconfig properly.
// In a real setup, we'd alias it.
export interface UIPlayer {
    id: string;
    username: string;
    status: 'ALIVE' | 'ELIMINATED' | 'WINNER';
    avatarUrl?: string; // Mocks
}

interface ArenaLayoutProps {
    players: UIPlayer[];
    currentPlayerId?: string;
    bombTimer?: number;
    centerText?: string;
    category?: string;
}

export function ArenaLayout({ players, currentPlayerId, bombTimer, centerText, category }: ArenaLayoutProps) {
    // We'll calculate positions radially
    // Container will be relative, items absolute

    return (
        <div className="relative w-full max-w-4xl aspect-square max-h-[70vh] flex items-center justify-center mx-auto">

            {/* Center Element (Bomb / Category) */}
            <div className="absolute z-10 flex flex-col items-center justify-center text-center">
                <div className={cn(
                    "w-32 h-32 sm:w-48 sm:h-48 rounded-full border-[6px] border-black bg-neo-black text-neo-yellow flex items-center justify-center shadow-[var(--shadow-neo-lg)] transition-all",
                    bombTimer && bombTimer < 4 && "animate-pulse bg-neo-red text-white"
                )}>
                    <span className="text-5xl font-black">{bombTimer ? bombTimer.toFixed(1) : "💣"}</span>
                </div>
                {category && (
                    <div className="mt-6 bg-neo-white border-neo px-6 py-3 shadow-[var(--shadow-neo)]">
                        <p className="text-xl font-bold uppercase tracking-wide">Category:</p>
                        <p className="text-2xl font-black">{category}</p>
                    </div>
                )}
            </div>

            {/* Players Circle */}
            {players.map((player, index) => {
                const total = players.length;
                // Start from top (-90 degrees)
                const angle = (index * (360 / total) - 90) * (Math.PI / 180);

                // Use percentage for responsive absolute positioning
                // 50% is center. Radius is ~35%
                const radius = 38;
                const left = 50 + radius * Math.cos(angle) + "%";
                const top = 50 + radius * Math.sin(angle) + "%";

                const isCurrent = player.id === currentPlayerId;
                const isEliminated = player.status === "ELIMINATED";

                return (
                    <div
                        key={player.id}
                        className={cn(
                            "absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300",
                            isCurrent && "scale-110 z-20",
                            isEliminated && "opacity-50 grayscale"
                        )}
                        style={{ left, top }}
                    >
                        {/* Avatar block */}
                        <div className={cn(
                            "w-16 h-16 sm:w-20 sm:h-20 bg-neo-blue border-neo rounded-sm shadow-[var(--shadow-neo)] flex items-center justify-center text-2xl font-black overflow-hidden relative",
                            isCurrent && "border-neo bg-neo-yellow shadow-[var(--shadow-neo-lg)] ring-4 ring-neo-black",
                            isEliminated && "bg-gray-400 border-gray-600"
                        )}>
                            {player.avatarUrl ? (
                                <img src={player.avatarUrl} alt={player.username} className="w-full h-full object-cover" />
                            ) : (
                                player.username.substring(0, 2).toUpperCase()
                            )}
                            {isCurrent && (
                                <div className="absolute -top-3 -right-3 w-6 h-6 bg-neo-red rounded-full border-2 border-neo-black animate-pulse" />
                            )}
                        </div>
                        {/* Username label */}
                        <div className="mt-2 bg-white border-2 border-black px-2 py-1 text-sm font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)] text-center max-w-[100px] truncate">
                            {player.username}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
