'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollText, Plus, Edit, Eye } from 'lucide-react';

const policies = [
  { title: 'Check-in & Check-out', cat: 'Check-in/out', active: true, guest: true, desc: 'Check-in at 2:00 PM, Checkout at 12:00 PM noon.' },
  { title: 'Cancellation Policy', cat: 'Cancellation', active: true, guest: true, desc: 'Free cancellation 24hrs before. Late cancel charged 1 night.' },
  { title: 'Payment Policy', cat: 'Payment', active: true, guest: true, desc: 'Nigerian Naira only. Cash, POS, Transfer, OPay, PalmPay, Moniepoint.' },
  { title: 'Guest Conduct', cat: 'Conduct', active: true, guest: true, desc: 'Peaceful behavior required. No damage to property.' },
  { title: 'No Smoking Policy', cat: 'Smoking', active: true, guest: true, desc: 'Non-smoking indoors. ₦50,000 cleaning fee for violations.' },
  { title: 'Children Policy', cat: 'Children', active: true, guest: true, desc: 'Under 12 stay free. Cribs available on request.' },
  { title: 'Pet Policy', cat: 'Pets', active: true, guest: true, desc: 'No pets allowed. Service animals welcome with documentation.' },
];

export function HotelRulesModule() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{policies.length} active policies</p>
        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white"><Plus className="h-4 w-4 mr-1" /> Add Policy</Button>
      </div>

      <div className="space-y-3">
        {policies.map((p, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-sm">{p.title}</h3>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{p.cat}</Badge>
                    {p.guest && <Badge className="bg-sky-100 text-sky-700 text-[10px] px-1.5 py-0 h-4">Visible to Guests</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{p.desc}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7"><Edit className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
