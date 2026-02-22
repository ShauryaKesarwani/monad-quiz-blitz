"use client";

import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

export function TopBar() {
    // Mocked user profile for now
    const mockAddress = "0x1234...ABCD";
    const mockBalance = "1.5 MON";

    return (
        <header className="w-full flex items-center justify-between p-4 sm:p-6 border-b-[3px] border-neo-black bg-neo-white">
            <h2 className="text-2xl font-black uppercase tracking-tight">Blitz Quiz</h2>

            <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 bg-neo-yellow px-4 py-2 border-neo font-bold shadow-[var(--shadow-neo)]">
                    <span>{mockBalance}</span>
                </div>

                <div className="flex items-center gap-2 bg-neo-purple text-white px-4 py-2 border-neo font-bold shadow-[var(--shadow-neo)]">
                    <User size={18} />
                    <span>{mockAddress}</span>
                </div>
            </div>
        </header>
    );
}
