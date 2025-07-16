'use client';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative flex flex-col items-center justify-between min-h-screen p-6 overflow-hidden md:p-8 bg-background">
      <div className="z-10 w-full max-w-md text-center mt-12">
        <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-pink-500 to-yellow-500 animate-rainbow-text [background-size:200%_auto]">
          Instant ingredient intelligence.
        </h1>
      </div>
      
      <div className="z-10 flex flex-col items-center justify-center w-full flex-grow">
        <Link href="/scan" passHref>
          <div className="relative flex items-center justify-center w-64 h-64 transition-all duration-300 rounded-full cursor-pointer group">
            {/* Pulsing glow effect */}
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse group-hover:bg-primary/30 blur-2xl"></div>

            {/* Solid circle */}
            <div className="absolute inset-5 bg-background/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center">
              <div className="w-56 h-56 flex items-center justify-center">
                <svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <style>
                      {`
                        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500&display=swap');
                        .truth-text { fill: hsl(var(--foreground)); font-family: 'Poppins', sans-serif; font-size: 28px; font-weight: 500; }
                        .byte-text { fill: hsl(var(--primary)); font-family: 'Poppins', sans-serif; font-size: 28px; font-weight: 600; }
                        .leaf-fill { fill: hsl(var(--primary)); }
                      `}
                    </style>
                  </defs>
                  <text x="35" y="40" className="truth-text">
                    Truth
                  </text>
                  <text x="105" y="40" className="byte-text">
                    Byte
                  </text>
                  <path
                    className="leaf-fill"
                    d="M 102 12 C 102 12, 104 8, 108 8 C 112 8, 114 12, 114 12 C 114 12, 112 16, 108 16 C 104 16, 102 12, 102 12 Z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Add a dummy div to help with the justify-between spacing */}
      <div className="w-full max-w-md h-12"></div>
    </div>
  );
}
