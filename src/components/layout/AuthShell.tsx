import { motion } from "framer-motion";
import type { PropsWithChildren } from "react";

type AuthShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
}>;

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-brand-gradient px-5 py-8 text-white lg:px-12 lg:py-12">
      <div className="mx-auto grid max-w-6xl items-stretch gap-6 lg:grid-cols-[1.1fr_1fr]">
        <motion.aside
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-xl"
        >
          <div className="space-y-4">
            <p className="font-display text-2xl tracking-wide">Max Hub</p>
            <h1 className="font-serif text-4xl leading-tight text-white lg:text-5xl">{title}</h1>
            <p className="max-w-xl text-sm text-slate-100/80 lg:text-base">{subtitle}</p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <img
              src="/brand/kurios-sat_logo.jpeg"
              alt="Kurios SAT logo"
              className="h-36 w-full rounded-2xl border border-white/25 bg-white object-cover p-2"
            />
            <img
              src="/brand/visamax_logo.jpeg"
              alt="Visa Max logo"
              className="h-36 w-full rounded-2xl border border-white/25 bg-white object-cover p-2"
            />
          </div>

          <img
            src="/brand/beadmaxlogo.jpeg"
            alt="Bead Max logo"
            className="mt-5 h-40 w-full rounded-2xl border border-white/25 bg-white object-cover p-2"
          />
        </motion.aside>

        <main className="flex items-center">{children}</main>
      </div>
    </div>
  );
}
