'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cloud, FolderOpen, File, Upload, Download, Eye } from 'lucide-react';

const folders = [
  { name: 'Contracts & Agreements', count: 12, size: '24.5 MB' },
  { name: 'Licenses & Permits', count: 8, size: '15.2 MB' },
  { name: 'Guest IDs', count: 156, size: '312.8 MB' },
  { name: 'Invoices', count: 342, size: '89.4 MB' },
  { name: 'Staff Documents', count: 24, size: '45.6 MB' },
  { name: 'Reports', count: 18, size: '12.3 MB' },
];

const recentFiles = [
  { name: 'Q1_Financial_Report.pdf', size: '2.4 MB', date: 'Today', cat: 'Reports' },
  { name: 'Guest_ID_Okonkwo.jpg', size: '1.2 MB', date: 'Yesterday', cat: 'Guest IDs' },
  { name: 'Laundry_Contract_2026.pdf', size: '4.5 MB', date: '2 days ago', cat: 'Contracts' },
  { name: 'Fire_Safety_Permit.pdf', size: '890 KB', date: '3 days ago', cat: 'Licenses' },
  { name: 'Staff_Handbook_v3.pdf', size: '3.2 MB', date: '1 week ago', cat: 'Staff Documents' },
];

export function CloudStorageModule() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5"><Cloud className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-xs text-muted-foreground">Storage Used</p><p className="text-xl font-bold">489.8 MB</p></div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-sky-100 p-2.5"><FolderOpen className="h-5 w-5 text-sky-600" /></div>
            <div><p className="text-xs text-muted-foreground">Total Folders</p><p className="text-xl font-bold">{folders.length}</p></div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2.5"><File className="h-5 w-5 text-emerald-600" /></div>
            <div><p className="text-xs text-muted-foreground">Total Files</p><p className="text-xl font-bold">560</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-base">Folders</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {folders.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.count} files • {f.size}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7"><Eye className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Files</CardTitle>
            <Button size="sm" variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Upload className="h-4 w-4 mr-1" /> Upload</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentFiles.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <File className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.size} • {f.date}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-[10px]">{f.cat}</Badge>
                    <Button size="sm" variant="ghost" className="h-7"><Download className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
