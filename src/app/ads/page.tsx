import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Check, Star } from 'lucide-react';

export default function AdsPage() {
  return (
    <div className="container max-w-2xl px-4 py-6 mx-auto sm:px-6 lg:px-8">
      <div className="space-y-8">
        <Card className="border-primary/50 shadow-[0_0_30px_hsl(var(--primary)/0.2)]">
          <CardHeader className="items-center text-center">
            <div className="p-3 mb-4 rounded-full bg-primary/10">
              <Star className="w-8 h-8 text-primary glowing-icon" />
            </div>
            <CardTitle className="text-3xl font-bold font-headline">
              TruthByte Pro
            </CardTitle>
            <CardDescription className="text-lg">
              Get unlimited scans &amp; new features coming soon!
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center">
            <p className="text-5xl font-bold">
              $0.99
              <span className="text-lg font-normal text-muted-foreground">
                /month
              </span>
            </p>
            
            <Button size="lg" className="w-full max-w-xs mt-6 text-lg h-12">
              Upgrade Now
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Cancel anytime.
            </p>
          </CardContent>
        </Card>

        {/* This area is reserved for future ad placements */}
        <div className="h-96 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
            <p>Future Ad Space</p>
        </div>
      </div>
    </div>
  );
}
