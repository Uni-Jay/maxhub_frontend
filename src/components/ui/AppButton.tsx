import { cn } from "../../lib/cn";
import type { ButtonHTMLAttributes } from "react";

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export function AppButton({ className, loading, children, ...props }: AppButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#133f73] via-[#174f8f] to-[#1f73bf] px-4 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}
