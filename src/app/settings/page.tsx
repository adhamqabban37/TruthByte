import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ChevronRight, FileText, Gift, HelpCircle, Languages, Shield, Trash2, MessageSquareWarning } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="container max-w-2xl px-4 py-6 mx-auto sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold font-headline">Settings</h1>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="font-medium">Theme</label>
            <ThemeToggle />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <label htmlFor="language-select" className="font-medium flex items-center gap-2"><Languages className="w-5 h-5 text-muted-foreground" /> Language</label>
            <Select defaultValue="en">
              <SelectTrigger id="language-select" className="w-[180px]">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Manage your scan history and data.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-muted-foreground" /> Clear Scan History
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground"/>
            </Button>
        </CardContent>
      </Card>
      
       <Card className="mt-6">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Gift className="w-5 h-5 text-primary" /> Remove Ads</CardTitle>
            <CardDescription>Enjoy an ad-free experience and support our mission.</CardDescription>
        </Header>
        <CardContent>
            <Button className="w-full">Upgrade to Pro</Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
                <HelpCircle className="w-5 h-5" /> About TruthByte
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
                <MessageSquareWarning className="w-5 h-5" /> Feedback & Report an Issue
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
                <Shield className="w-5 h-5" /> Privacy Policy
            </Button>
             <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
                <FileText className="w-5 h-5" /> Terms of Service
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
