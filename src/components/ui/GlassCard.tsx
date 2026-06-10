import { motion } from "framer-motion";
import { cn } from "../../lib/cn";
import type { PropsWithChildren } from "react";

type GlassCardProps = PropsWithChildren<{
  className?: string;
}>;

export function GlassCard({ className, children }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={cn(
        "rounded-3xl border border-white/25 bg-white/10 p-7 backdrop-blur-2xl shadow-[0_20px_60px_rgba(20,20,30,0.25)]",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
