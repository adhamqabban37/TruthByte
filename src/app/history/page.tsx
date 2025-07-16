'use client';

import { useEffect, useState } from 'react';
import type { ScanHistoryItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Trash2, ShieldX } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function HistoryPage() {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const storedHistory = localStorage.getItem('scanHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Could not parse history from localStorage", error);
    }
  }, []);

  const clearHistory = () => {
    localStorage.removeItem('scanHistory');
    setHistory([]);
  };

  const removeItem = (barcode: string) => {
    const newHistory = history.filter((item) => item.barcode !== barcode);
    setHistory(newHistory);
    localStorage.setItem('scanHistory', JSON.stringify(newHistory));
  };
  
  if (!isMounted) {
    return null; // or a loading skeleton
  }

  return (
    <div className="container max-w-2xl px-4 py-6 mx-auto sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Scan History</h1>
        {history.length > 0 && (
          <Button variant="destructive" onClick={clearHistory}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      <Alert className="mt-4 bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
        <AlertDescription className="text-center text-blue-700 dark:text-blue-300">
          This is a placeholder for a banner ad.
        </AlertDescription>
      </Alert>

      {history.length === 0 ? (
        <Card className="mt-6 text-center">
            <CardContent className="p-10">
                <ShieldX className="w-16 h-16 mx-auto text-muted-foreground" />
                <h3 className="mt-4 text-xl font-semibold">No Scans Yet</h3>
                <p className="mt-2 text-muted-foreground">Start scanning products to see your history here.</p>
                <Link href="/scan">
                    <Button className="mt-4">Scan a Product</Button>
                </Link>
            </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {history.map((item) => (
            <Card key={item.barcode} className="overflow-hidden transition-shadow hover:shadow-md">
              <div className="flex items-center">
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  width={80}
                  height={80}
                  className="object-contain h-24 w-28"
                  data-ai-hint={item.dataAiHint}
                  unoptimized
                />
                <div className="flex-grow p-4">
                  <Link href={`/analysis/${item.barcode}`} className="font-semibold hover:underline">
                      {item.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{item.brand}</p>
                  <div className="flex items-center mt-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span>
                      Scanned {formatDistanceToNow(new Date(item.scanDate))} ago
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-4 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(item.barcode)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
