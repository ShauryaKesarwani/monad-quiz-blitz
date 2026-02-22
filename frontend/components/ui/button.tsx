import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "primary" | "danger" | "outline" | "ghost"
    size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-sm font-bold transition-all border-neo active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:pointer-events-none disabled:opacity-50",
                    {
                        "bg-neo-white text-black shadow-[var(--shadow-neo)] hover:shadow-[var(--shadow-neo-hover)]": variant === "default",
                        "bg-neo-blue text-black shadow-[var(--shadow-neo)] hover:shadow-[var(--shadow-neo-hover)]": variant === "primary",
                        "bg-neo-red text-black shadow-[var(--shadow-neo)] hover:shadow-[var(--shadow-neo-hover)]": variant === "danger",
                        "bg-transparent border-neo text-black hover:bg-black hover:text-white": variant === "outline",
                        "border-transparent hover:bg-black/10 text-black": variant === "ghost",
                        "h-10 px-4 py-2": size === "default",
                        "h-9 px-3 text-sm": size === "sm",
                        "h-12 px-8 text-lg": size === "lg",
                        "h-10 w-10": size === "icon",
                    },
                    className
                )}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
