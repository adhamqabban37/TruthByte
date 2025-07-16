'use client';
import Link from 'next/link';
import { Leaf, GlassWater } from 'lucide-react';

export default function Home() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-full p-4 overflow-hidden md:p-6">
      {/* Floating icons for aesthetic */}
      <Leaf className="absolute w-16 h-16 text-primary/10 top-20 left-10" />
      <GlassWater className="absolute w-20 h-20 text-primary/10 bottom-24 right-5" />

      <div className="z-10 flex flex-col items-center justify-center w-full max-w-md text-center">
        <Link href="/scan" passHref>
          <div
            className="relative flex items-center justify-center w-64 h-64 transition-all duration-300 rounded-full cursor-pointer group"
          >
            {/* Pulsing glow effect */}
            <div className="absolute inset-0 bg-accent/20 rounded-full animate-pulse group-hover:bg-accent/30 blur-2xl"></div>
            
            {/* Solid circle */}
            <div className="absolute inset-5 bg-primary rounded-full shadow-lg flex items-center justify-center">
                <div className="bg-white w-32 h-32 flex items-center justify-center">
                     <h1 className="text-2xl font-bold tracking-tight text-primary font-headline drop-shadow-sm">
                        TruthByte
                    </h1>
                </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
