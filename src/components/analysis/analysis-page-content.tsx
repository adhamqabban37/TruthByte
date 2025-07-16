
'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { analyzeBarcode } from '@/ai/flows/analyze-barcode';
import { AnalysisClient } from '@/components/analysis/analysis-client';
import { getProductFromApi } from '@/lib/data-service';
import type { Product } from '@/lib/types';
import type { AnalyzeBarcodeOutput } from '@/ai/flows/analyze-barcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function AnalysisPageContent({ params }: { params: { barcode: string } }) {
  const [result, setResult] = useState<AnalyzeBarcodeOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      if (!params.barcode) return;
      setIsLoading(true);
      setError(null);
      try {
        let analysisResult;
        // OCR products are not in the API, so we can't re-fetch them.
        // We could store the full analysis in localStorage in the future.
        if (params.barcode === 'ocr-product') {
          setError("Analysis for images can't be saved or reloaded. Please perform a new scan.");
          setIsLoading(false);
          return;
        }

        // First, try to get data from the API to show something quickly
        const initialProduct = await getProductFromApi(params.barcode);

        if (!initialProduct) {
          setError('Product not found. It may have been removed or the barcode is incorrect.');
          setIsLoading(false);
          return;
        }
        
        // Show initial product info while AI analysis is running
        setResult({
          method: 'barcode',
          productName: initialProduct.name,
          productBrand: initialProduct.brand,
          productImageUrl: initialProduct.imageUrl,
          analysis: undefined, // Analysis is pending
        });

        // Then, get the full AI analysis
        analysisResult = await analyzeBarcode({ barcode: params.barcode });

        if (analysisResult.method === 'none' || !analysisResult.analysis) {
           setError('Could not retrieve AI analysis for this product.');
        } else {
            setResult(analysisResult);
        }

      } catch (err) {
        console.error('Failed to fetch analysis:', err);
        setError('An unexpected error occurred while fetching the analysis.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalysis();
  }, [params.barcode]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="w-16 h-16 mb-4 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Analyzing Product...</p>
      </div>
    );
  }

  if (error) {
    return (
       <Card className="mt-20 text-center border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Analysis Unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/scan">
              <Button>Scan Another Product</Button>
            </Link>
          </CardContent>
        </Card>
    );
  }

  if (!result || !result.analysis) {
    return (
        <Card className="mt-20 text-center">
            <CardHeader>
                <CardTitle>Analysis Incomplete</CardTitle>
                <CardDescription>We found the product, but the AI analysis could not be completed.</CardDescription>
            </CardHeader>
            <CardContent>
                <Link href="/scan">
                <Button>Scan Another Product</Button>
                </Link>
            </CardContent>
        </Card>
    );
  }

  const product: Product = {
    barcode: params.barcode,
    name: result.productName || 'Unknown Product',
    brand: result.productBrand || 'Unknown Brand',
    imageUrl: result.productImageUrl || 'https://placehold.co/400x400.png',
    dataAiHint: result.productName ? result.productName.split(' ').slice(0, 2).join(' ') : 'food product',
  };

  return <AnalysisClient product={product} analysis={result.analysis} />;
}

    