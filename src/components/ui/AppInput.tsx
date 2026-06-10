import { cn } from "../../lib/cn";
import type { InputHTMLAttributes } from "react";

type AppInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function AppInput({ label, error, className, ...props }: AppInputProps) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-100/90">
      <span className="font-medium tracking-wide">{label}</span>
      <input
        className={cn(
          "h-11 rounded-xl border border-white/20 bg-white/10 px-3 text-white outline-none placeholder:text-slate-200/60 focus:border-[#65b7ff]",
          className
        )}
        {...props}
      />
      {error ? <span className="text-xs text-rose-200">{error}</span> : null}
    </label>
  );
}
