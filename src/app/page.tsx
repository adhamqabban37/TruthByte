'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { trendingProducts } from '@/lib/mock-data';
import Image from 'next/image';
import { ScanLine } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 md:p-6">
      <div className="w-full max-w-md text-center">
        <ScanLine className="w-16 h-16 mx-auto text-primary" />
        <h1 className="mt-4 text-3xl font-bold font-headline text-foreground">
          Welcome to TruthByte
        </h1>
        <p className="mt-2 text-muted-foreground">
          Uncover the truth in what you eat.
        </p>

        <Link href="/scan" passHref>
          <Button size="lg" className="w-full mt-8 text-lg h-14 animate-pulse">
            <ScanLine className="w-6 h-6 mr-2" />
            Scan Barcode
          </Button>
        </Link>
      </div>

      <div className="w-full max-w-md mt-12">
        <h2 className="text-2xl font-bold text-center font-headline">
          Trending Products
        </h2>
        <Carousel
          opts={{
            align: 'start',
            loop: true,
          }}
          className="w-full mt-4"
        >
          <CarouselContent>
            {trendingProducts.map((product) => (
              <CarouselItem key={product.barcode} className="md:basis-1/2">
                <div className="p-1">
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center p-4 aspect-square">
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        width={150}
                        height={150}
                        className="rounded-md"
                        data-ai-hint={product.dataAiHint}
                      />
                      <span className="mt-4 text-sm font-semibold text-center">
                        {product.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {product.brand}
                      </span>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex" />
          <CarouselNext className="hidden sm:flex" />
        </Carousel>
      </div>
    </div>
  );
}
