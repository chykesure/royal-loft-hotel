'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCheck, UserMinus, Clock, Phone, AlertCircle, ArrowDownCircle, ArrowUpCircle, Search } from 'lucide-react';

export function FrontDeskModule() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-teal-100 p-2.5"><ArrowDownCircle className="h-5 w-5 text-teal-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Expected Arrivals</p>
              <p className="text-xl font-bold text-teal-600">5</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2.5"><ArrowUpCircle className="h-5 w-5 text-orange-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Expected Departures</p>
              <p className="text-xl font-bold text-orange-600">3</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5"><Clock className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Overdue Checkouts</p>
              <p className="text-xl font-bold text-red-600">1</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="checkin">
        <TabsList>
          <TabsTrigger value="checkin"><UserCheck className="h-4 w-4 mr-1.5" /> Check-in</TabsTrigger>
          <TabsTrigger value="checkout"><UserMinus className="h-4 w-4 mr-1.5" /> Check-out</TabsTrigger>
          <TabsTrigger value="walkin"><AlertCircle className="h-4 w-4 mr-1.5" /> Walk-in</TabsTrigger>
        </TabsList>

        <TabsContent value="checkin" className="mt-4">
          <Card className="border-none shadow-sm max-w-lg">
            <CardHeader><CardTitle className="text-base">Guest Check-in</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by reservation code, guest name, or phone..." className="pl-9" />
              </div>
              <div className="grid gap-2">
                <Label>Room</Label>
                <Select><SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                  <SelectContent><SelectItem value="101">101 - Standard</SelectItem><SelectItem value="201">201 - Deluxe</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>ID Type</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="nin">NIN</SelectItem><SelectItem value="passport">Passport</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>ID Number</Label><Input placeholder="ID number" /></div>
              </div>
              <div className="grid gap-2"><Label>Special Requests</Label><Input placeholder="Any special requests..." /></div>
              <div className="flex gap-2">
                <Button className="bg-amber-500 hover:bg-amber-600 text-white flex-1"><UserCheck className="h-4 w-4 mr-2" />Process Check-in</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkout" className="mt-4">
          <Card className="border-none shadow-sm max-w-lg">
            <CardHeader><CardTitle className="text-base">Guest Check-out</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Enter room number or guest name..." />
              <div className="rounded-lg border p-4 bg-muted/30">
                <div className="flex justify-between mb-2"><span className="text-sm text-muted-foreground">Room 102 - Standard</span><Badge>Occupied</Badge></div>
                <div className="flex justify-between mb-2"><span className="text-sm">Guest: Adebayo Okonkwo</span></div>
                <div className="flex justify-between mb-2"><span className="text-sm text-muted-foreground">Stay: 2 nights</span><span className="text-sm font-medium">₦30,000</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Extras: Food + Bar</span><span className="text-sm font-medium">₦12,500</span></div>
                <hr className="my-2" />
                <div className="flex justify-between font-bold"><span>Total Due</span><span className="text-amber-600">₦42,500</span></div>
              </div>
              <Button className="bg-amber-500 hover:bg-amber-600 text-white w-full"><UserMinus className="h-4 w-4 mr-2" />Process Check-out</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="walkin" className="mt-4">
          <Card className="border-none shadow-sm max-w-lg">
            <CardHeader><CardTitle className="text-base">Walk-in Registration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>First Name</Label><Input /></div>
                <div className="grid gap-2"><Label>Last Name</Label><Input /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Phone</Label><Input /></div>
                <div className="grid gap-2"><Label>Email</Label><Input type="email" /></div>
              </div>
              <div className="grid gap-2"><Label>Room Type</Label>
                <Select><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (₦15,000)</SelectItem>
                    <SelectItem value="deluxe">Deluxe (₦25,000)</SelectItem>
                    <SelectItem value="suite">Suite (₦45,000)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="bg-amber-500 hover:bg-amber-600 text-white w-full">Register & Check-in</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
