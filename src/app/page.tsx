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
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse group-hover:bg-primary/30 blur-2xl"></div>
            
            {/* Solid circle */}
            <div className="absolute inset-5 bg-background rounded-full shadow-lg flex items-center justify-center">
                <div className="w-48 h-48 flex items-center justify-center">
                    <svg viewBox="0 0 200 50" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <style>
                                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500&display=swap');
                            </style>
                        </defs>
                        <text x="10" y="35" fontFamily="Poppins, sans-serif" fontSize="24" fill="#BFAE99">
                            Truth
                        </text>
                        <text x="85" y="35" fontFamily="Poppins, sans-serif" fontSize="24" fill="#88B04B">
                            Byte
                        </text>
                        <path d="M 83 15 C 83 15, 85 10, 90 10 C 95 10, 97 15, 97 15 C 97 15, 95 20, 90 20 C 85 20, 83 15, 83 15 Z" fill="#88B04B" />
                    </svg>
                </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
