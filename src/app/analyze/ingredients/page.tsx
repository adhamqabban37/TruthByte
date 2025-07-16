'use client';
import { useState, useRef } from 'react';
import {
  generateTruthSummaryFromImage,
  GenerateTruthSummaryFromImageInput,
} from '@/ai/flows/generate-truth-summary-from-image';
import type { GenerateTruthSummaryOutput } from '@/ai/flows/generate-truth-summary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { AnalysisClient } from '@/components/analysis/analysis-client';
import type { Product } from '@/lib/types';
import { Upload, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function AnalysisSkeleton() {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="w-32 h-32 rounded-lg bg-muted animate-pulse" />
          <div className="space-y-2 text-center sm:text-left">
            <div className="w-48 h-8 rounded bg-muted animate-pulse" />
            <div className="w-32 h-6 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="w-40 h-7 rounded bg-muted animate-pulse" />
          <div className="p-4 space-y-3 border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
              <div className="w-full h-5 rounded bg-muted animate-pulse" />
            </div>
            <div className="w-3/4 h-5 rounded bg-muted animate-pulse" />
            <div className="w-1/2 h-5 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="w-48 h-7 rounded bg-muted animate-pulse" />
           <div className="flex flex-wrap gap-2">
              <div className="w-24 h-8 rounded-full bg-muted animate-pulse" />
              <div className="w-32 h-8 rounded-full bg-muted animate-pulse" />
              <div className="w-20 h-8 rounded-full bg-muted animate-pulse" />
              <div className="w-28 h-8 rounded-full bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

export default function AnalyzeIngredientsPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<GenerateTruthSummaryOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        toast({
            variant: 'destructive',
            title: 'Image too large',
            description: 'Please select an image smaller than 4MB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setImagePreview(URL.createObjectURL(file));
        setImageDataUri(dataUri);
        setAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeClick = async () => {
    if (!imageDataUri) return;
    setIsLoading(true);
    setAnalysis(null);
    try {
      const input: GenerateTruthSummaryFromImageInput = { photoDataUri: imageDataUri };
      const result = await generateTruthSummaryFromImage(input);
      setAnalysis(result);
    } catch (error) {
      console.error('Error analyzing ingredients:', error);
       toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: 'Could not analyze the ingredients from the image. Please try again with a clearer picture.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemoveImage = () => {
      setImagePreview(null);
      setImageDataUri(null);
      setAnalysis(null);
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  }

  const mockProduct: Product = {
    barcode: 'image-analysis',
    name: 'Analyzed Ingredients',
    brand: 'From your photo',
    imageUrl: imagePreview || 'https://placehold.co/400x400.png',
    dataAiHint: 'food product',
  };

  return (
    <div className="container max-w-2xl px-4 py-6 mx-auto sm:px-6 lg:px-8">
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Analyze Ingredients from a Photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!imagePreview && (
                <div 
                    className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className="w-12 h-12 text-muted-foreground"/>
                    <p className="mt-2 text-muted-foreground">Click to upload or take a photo</p>
                    <p className="text-xs text-muted-foreground/80">PNG, JPG, WEBP up to 4MB</p>
                </div>
            )}
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            {imagePreview && (
              <div className="relative group">
                <Image
                  src={imagePreview}
                  alt="Ingredients preview"
                  width={400}
                  height={400}
                  className="object-contain w-full rounded-lg max-h-96"
                />
                 <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleRemoveImage}
                >
                    <X className="w-5 h-5"/>
                </Button>
              </div>
            )}
            <Button onClick={handleAnalyzeClick} disabled={!imageDataUri || isLoading} className="w-full">
                {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin"/>
                        Analyzing...
                    </>
                ) : 'Analyze Ingredients'}
            </Button>
          </CardContent>
        </Card>

        {isLoading && <AnalysisSkeleton />}

        {analysis && (
          <AnalysisClient product={mockProduct} analysis={analysis} />
        )}
      </div>
    </div>
  );
}
