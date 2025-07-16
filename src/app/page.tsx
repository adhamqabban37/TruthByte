'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ScanLine, Apple, Smoothie, Dumbbell } from 'lucide-react';

export default function Home() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-full p-4 overflow-hidden md:p-6">
      {/* Floating icons for aesthetic */}
      <Apple className="absolute w-16 h-16 text-green-300/20 top-20 left-10 animate-pulse" />
      <Smoothie className="absolute w-20 h-20 text-white/10 bottom-24 right-5 animate-pulse delay-500" />
      <Dumbbell className="absolute w-12 h-12 text-aqua-300/15 bottom-40 left-16 animate-pulse delay-1000" />

      <div className="z-10 w-full max-w-md text-center">
        <h1 className="text-4xl font-bold tracking-tight text-transparent sm:text-5xl font-headline bg-clip-text bg-gradient-to-br from-white to-slate-400">
          TruthByte
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Uncover the truth in what you eat.
        </p>

        <Link href="/scan" passHref>
          <Button
            size="lg"
            className="relative w-48 h-48 p-0 mx-auto mt-20 rounded-full shadow-[0_0_30px_hsl(var(--primary)/0.5)] border-2 border-primary/50 bg-primary/10 hover:bg-primary/20 hover:shadow-[0_0_40px_hsl(var(--primary)/0.7)] transition-all duration-300"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 via-transparent to-primary/10 animate-pulse"></div>
            <div className="flex flex-col items-center">
              <ScanLine className="w-16 h-16 text-primary drop-shadow-[0_0_10px_hsl(var(--primary)/0.8)]" />
              <span className="mt-2 text-lg font-semibold text-primary">Scan</span>
            </div>
          </Button>
        </Link>
      </div>

       <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-background to-transparent pointer-events-none"></div>
    </div>
  );
}
