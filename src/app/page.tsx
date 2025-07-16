'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Apple, Leaf, GlassWater, Dumbbell } from 'lucide-react';

export default function Home() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-full p-4 overflow-hidden md:p-6">
      {/* Floating icons for aesthetic */}
      <Leaf className="absolute w-16 h-16 text-green-500/10 top-20 left-10 animate-pulse" />
      <GlassWater className="absolute w-20 h-20 text-blue-400/10 bottom-24 right-5 animate-pulse delay-500" />
      <Dumbbell className="absolute w-12 h-12 text-gray-400/10 bottom-40 left-16 animate-pulse delay-1000" />
      <Apple className="absolute w-12 h-12 text-red-400/10 top-40 right-16 animate-pulse delay-700" />


      <div className="z-10 flex flex-col items-center justify-center w-full max-w-md text-center">
        <Link href="/scan" passHref>
          <div
            className="relative flex items-center justify-center w-64 h-64 transition-all duration-300 rounded-full cursor-pointer group"
          >
            {/* Pulsing glow effect */}
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse group-hover:bg-primary/30 blur-2xl"></div>
            
            {/* Solid circle */}
            <div className="absolute inset-2.5 bg-primary rounded-full shadow-lg"></div>

            <div className="relative flex flex-col items-center justify-center text-primary-foreground">
                <h1 className="text-4xl font-bold tracking-tight text-white font-headline drop-shadow-md">
                    TruthByte
                </h1>
                <p className="mt-1 text-sm font-medium text-white/80">Tap to Scan</p>
            </div>

          </div>
        </Link>
      </div>
    </div>
  );
}
