'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Clock, DollarSign, UserPlus } from 'lucide-react';

const staffList = [
  { name: 'Adaobi Nwosu', role: 'Front Desk Agent', dept: 'front_desk', status: 'active', shift: 'Morning' },
  { name: 'Kola Babatunde', role: 'Housekeeper', dept: 'housekeeping', status: 'active', shift: 'Morning' },
  { name: 'Ngozi Eze', role: 'Chef', dept: 'kitchen', status: 'active', shift: 'Morning' },
  { name: 'Musa Ibrahim', role: 'Security Guard', dept: 'security', status: 'on_leave', shift: 'Night' },
  { name: 'Funke Adeyemi', role: 'Accountant', dept: 'accounts', status: 'active', shift: 'Morning' },
  { name: 'Chinedu Okafor', role: 'Maintenance', dept: 'maintenance', status: 'active', shift: 'Morning' },
];

export function StaffPayrollModule() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5"><Users className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-xs text-muted-foreground">Total Staff</p><p className="text-xl font-bold">24</p></div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2.5"><Clock className="h-5 w-5 text-emerald-600" /></div>
            <div><p className="text-xs text-muted-foreground">Present Today</p><p className="text-xl font-bold text-emerald-600">20</p></div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2.5"><Clock className="h-5 w-5 text-orange-600" /></div>
            <div><p className="text-xs text-muted-foreground">On Leave</p><p className="text-xl font-bold text-orange-600">3</p></div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-violet-100 p-2.5"><DollarSign className="h-5 w-5 text-violet-600" /></div>
            <div><p className="text-xs text-muted-foreground">Monthly Payroll</p><p className="text-xl font-bold">₦3.2M</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Staff Directory</CardTitle>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white"><UserPlus className="h-4 w-4 mr-1" /> Add Staff</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {staffList.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-semibold">
                      {s.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.role} • {s.shift} Shift</p>
                    </div>
                  </div>
                  <Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                    {s.status === 'active' ? 'Active' : 'On Leave'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-base">Payroll Summary — April 2026</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { dept: 'Front Desk', count: 6, amount: '₦720,000' },
                { dept: 'Housekeeping', count: 8, amount: '₦640,000' },
                { dept: 'Kitchen', count: 4, amount: '₦480,000' },
                { dept: 'Security', count: 3, amount: '₦360,000' },
                { dept: 'Management', count: 2, amount: '₦600,000' },
                { dept: 'Maintenance', count: 1, amount: '₦200,000' },
              ].map((item) => (
                <div key={item.dept} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{item.dept}</p>
                    <p className="text-xs text-muted-foreground">{item.count} staff</p>
                  </div>
                  <span className="text-sm font-semibold">{item.amount}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
