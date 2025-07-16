'use client';
import type { GenerateTruthSummaryOutput } from '@/ai/flows/shared';
import type { Product, ScanHistoryItem } from '@/lib/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';

interface AnalysisSummaryProps {
  product: Product;
  analysis: GenerateTruthSummaryOutput;
  onClose: () => void;
}

export function AnalysisSummary({
  product,
  analysis,
  onClose,
}: AnalysisSummaryProps) {
  const { toast } = useToast();

  useEffect(() => {
    // Only save items with a valid barcode to history
    if (product.barcode === 'ocr-product') {
        return;
    }
    try {
      const history: ScanHistoryItem[] = JSON.parse(
        localStorage.getItem('scanHistory') || '[]'
      );
      const newHistoryItem: ScanHistoryItem = {
        barcode: product.barcode,
        name: product.name,
        brand: product.brand,
        imageUrl: product.imageUrl,
        dataAiHint: product.dataAiHint,
        scanDate: new Date().toISOString(),
      };

      // Avoid duplicates
      const existingIndex = history.findIndex(
        (item) => item.barcode === product.barcode
      );
      if (existingIndex > -1) {
        history.splice(existingIndex, 1);
      }

      const newHistory = [newHistoryItem, ...history].slice(0, 50);
      localStorage.setItem('scanHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Failed to save scan history:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save this scan to your history.',
      });
    }
  }, [product, toast]);

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-healthy';
    if (score <= 4) return 'text-unhealthy';
    return 'text-yellow-500';
  };

  return (
    <div className="flex flex-col h-full p-4 text-white bg-transparent">
        <div className="flex-shrink-0 pt-8 text-center">
            <div className="inline-block p-1 bg-white rounded-lg shadow-lg">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  width={160}
                  height={160}
                  className="object-contain w-40 h-40 rounded-md"
                  data-ai-hint={product.dataAiHint}
                  unoptimized
                />
            </div>
            <h2 className="mt-4 text-3xl font-bold">{product.name}</h2>
            {analysis.mainIngredient && (
                <p className="text-lg text-white/80">Main Ingredient: {analysis.mainIngredient}</p>
            )}
        </div>

        <div className="flex-grow mt-6 space-y-4 overflow-y-auto">
             <Card className="bg-white/10 border-white/20">
                <CardContent className="p-4">
                    <div className="flex items-center justify-center gap-4 text-center">
                        <div>
                            <p className="text-sm text-white/70">Health Score</p>
                            <p className={cn("text-6xl font-bold", getScoreColor(analysis.healthScore))}>
                                {analysis.healthScore}
                            </p>
                            <p className="text-sm text-white/70">out of 10</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            <Card className="bg-white/10 border-white/20">
                 <CardContent className="p-4">
                    <h3 className="mb-2 font-semibold text-center">AI Summary</h3>
                    <p className="text-sm text-center text-white/90">
                        {analysis.summary}
                    </p>
                </CardContent>
            </Card>

            {analysis.keyIngredients && analysis.keyIngredients.length > 0 && (
                <Card className="bg-white/10 border-white/20">
                    <CardContent className="p-4">
                        <h3 className="mb-2 font-semibold text-center">Key Ingredients</h3>
                        <div className="flex flex-wrap justify-center gap-2">
                            {analysis.keyIngredients.slice(0, 4).map((ing, i) => (
                                <Badge key={i} variant="secondary" className="text-sm rounded-full">
                                    {ing.name}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

        </div>

        <div className="flex-shrink-0 pt-4">
             {/* Only show button if it was a barcode scan with more details */}
             {product.barcode !== 'ocr-product' && (
                <Link href={`/analysis/${product.barcode}`} passHref>
                    <Button size="lg" className="w-full text-lg bg-primary h-14" onClick={onClose}>
                    View Full Analysis <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                </Link>
             )}
        </div>
    </div>
  );
}
