'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, RefreshCw, BedDouble, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface RoomType {
  id: string;
  name: string;
  baseRate: number;
  maxOccupancy: number;
  description?: string | null;
  amenities?: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { rooms: number };
}

interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  status: string;
  currentCondition?: string | null;
  notes?: string | null;
  roomTypeId: string;
  roomType: RoomType;
}

const statusColors: Record<string, string> = {
  available: 'bg-emerald-500 hover:bg-emerald-600 text-white',
  occupied: 'bg-red-500 hover:bg-red-600 text-white',
  housekeeping: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  maintenance: 'bg-orange-500 hover:bg-orange-600 text-white',
  reserved: 'bg-sky-500 hover:bg-sky-600 text-white',
  out_of_service: 'bg-gray-500 hover:bg-gray-600 text-white',
};

const statusBadge: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700',
  occupied: 'bg-red-100 text-red-700',
  housekeeping: 'bg-yellow-100 text-yellow-700',
  maintenance: 'bg-orange-100 text-orange-700',
  reserved: 'bg-sky-100 text-sky-700',
  out_of_service: 'bg-gray-100 text-gray-700',
};

const emptyRoomForm = { roomNumber: '', floor: '1', roomTypeId: '', status: 'available', notes: '' };
const emptyRoomTypeForm = { name: '', baseRate: '', maxOccupancy: '', description: '' };

export function RoomsModule() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allRoomTypes, setAllRoomTypes] = useState<RoomType[]>([]);
  const [floors, setFloors] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Room dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyRoomForm);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Room type dialog
  const [rtDialogOpen, setRtDialogOpen] = useState(false);
  const [rtForm, setRtForm] = useState(emptyRoomTypeForm);
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null);

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'room' | 'room-type'; id: string; name: string } | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms);
        setAllRoomTypes(data.roomTypes);
        setFloors(data.floors);
      }
    } catch {
      toast.error('Failed to load rooms');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // ---- Room CRUD ----

  const openCreateRoom = () => {
    setEditingRoom(null);
    setForm(emptyRoomForm);
    setDialogOpen(true);
  };

  const openEditRoom = (room: Room) => {
    setEditingRoom(room);
    setForm({
      roomNumber: room.roomNumber,
      floor: String(room.floor),
      roomTypeId: room.roomTypeId,
      status: room.status,
      notes: room.notes || '',
    });
    setDialogOpen(true);
  };

  const handleCreateRoom = async () => {
    if (!form.roomNumber || !form.roomTypeId) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, floor: parseInt(form.floor) }),
      });
      if (res.ok) {
        toast.success('Room created successfully');
        setDialogOpen(false);
        setForm(emptyRoomForm);
        fetchRooms();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create room');
      }
    } catch {
      toast.error('Failed to create room');
    }
  };

  const handleUpdateRoom = async () => {
    if (!editingRoom || !form.roomNumber || !form.roomTypeId) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      const res = await fetch('/api/rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRoom.id,
          ...form,
          floor: parseInt(form.floor),
        }),
      });
      if (res.ok) {
        toast.success('Room updated successfully');
        setDialogOpen(false);
        setEditingRoom(null);
        setForm(emptyRoomForm);
        fetchRooms();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update room');
      }
    } catch {
      toast.error('Failed to update room');
    }
  };

  const handleRoomSubmit = () => {
    if (editingRoom) {
      handleUpdateRoom();
    } else {
      handleCreateRoom();
    }
  };

  const confirmDeleteRoom = (room: Room) => {
    setDeleteTarget({ type: 'room', id: room.id, name: room.roomNumber });
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/rooms', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id, action: deleteTarget.type === 'room' ? 'delete-room' : 'delete-room-type' }),
      });
      if (res.ok) {
        toast.success(`${deleteTarget.type === 'room' ? 'Room' : 'Room type'} deleted successfully`);
        setDeleteOpen(false);
        setDeleteTarget(null);
        fetchRooms();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleStatusChange = async (roomId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: roomId, status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Room status updated to ${newStatus.replace('_', ' ')}`);
        fetchRooms();
      }
    } catch {
      toast.error('Failed to update room status');
    }
  };

  // ---- Room Type CRUD ----

  const openCreateRoomType = () => {
    setEditingRoomType(null);
    setRtForm(emptyRoomTypeForm);
    setRtDialogOpen(true);
  };

  const openEditRoomType = (rt: RoomType) => {
    setEditingRoomType(rt);
    setRtForm({
      name: rt.name,
      baseRate: String(rt.baseRate),
      maxOccupancy: String(rt.maxOccupancy),
      description: rt.description || '',
    });
    setRtDialogOpen(true);
  };

  const handleRoomTypeSubmit = async () => {
    if (!rtForm.name || !rtForm.baseRate || !rtForm.maxOccupancy) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      if (editingRoomType) {
        const res = await fetch('/api/rooms', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update-room-type',
            id: editingRoomType.id,
            ...rtForm,
          }),
        });
        if (res.ok) {
          toast.success('Room type updated successfully');
          setRtDialogOpen(false);
          setEditingRoomType(null);
          fetchRooms();
        } else {
          const err = await res.json();
          toast.error(err.error || 'Failed to update room type');
        }
      } else {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create-room-type',
            ...rtForm,
          }),
        });
        if (res.ok) {
          toast.success('Room type created successfully');
          setRtDialogOpen(false);
          fetchRooms();
        } else {
          const err = await res.json();
          toast.error(err.error || 'Failed to create room type');
        }
      }
    } catch {
      toast.error('Failed to save room type');
    }
  };

  const confirmDeleteRoomType = (rt: RoomType) => {
    setDeleteTarget({ type: 'room-type', id: rt.id, name: rt.name });
    setDeleteOpen(true);
  };

  const filteredRooms = filter === 'all' ? rooms : rooms.filter((r) => r.status === filter);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'available', 'occupied', 'housekeeping', 'maintenance', 'reserved'].map((s) => (
            <Badge
              key={s}
              variant={filter === s ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-colors capitalize"
              onClick={() => setFilter(s)}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchRooms}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={openCreateRoom}>
            <Plus className="h-4 w-4 mr-1" /> Add Room
          </Button>
        </div>
      </div>

      <Tabs defaultValue="floorplan">
        <TabsList>
          <TabsTrigger value="floorplan">Floor Plan</TabsTrigger>
          <TabsTrigger value="list">Room List</TabsTrigger>
          <TabsTrigger value="room-types">Room Types</TabsTrigger>
        </TabsList>

        {/* Floor Plan Tab */}
        <TabsContent value="floorplan" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((f) => (
                <Card key={f}><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {floors.map((floor) => (
                <Card key={floor} className="border-none shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Floor {floor}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-2">
                      {rooms
                        .filter((r) => r.floor === floor)
                        .map((room) => (
                          <Tooltip key={room.id}>
                            <TooltipTrigger asChild>
                              <button
                                className={`${statusColors[room.status] || 'bg-gray-400'} p-2 rounded-lg text-center transition-all hover:scale-105 active:scale-95 min-h-[70px] flex flex-col items-center justify-center`}
                                onClick={() => handleStatusChange(room.id, room.status === 'available' ? 'housekeeping' : 'available')}
                              >
                                <BedDouble className="h-4 w-4 mb-1 opacity-80" />
                                <span className="text-xs font-bold">{room.roomNumber}</span>
                                <span className="text-[9px] opacity-80 mt-0.5">{room.roomType.name}</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{room.roomNumber} - {room.roomType.name}</p>
                              <p className="text-xs">Status: {room.status.replace('_', ' ')}</p>
                              <p className="text-xs">Rate: {formatCurrency(room.roomType.baseRate)}/night</p>
                              {room.currentCondition && <p className="text-xs">Condition: {room.currentCondition}</p>}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-[10px] text-muted-foreground">Available</span></div>
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /><span className="text-[10px] text-muted-foreground">Occupied</span></div>
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500" /><span className="text-[10px] text-muted-foreground">HK</span></div>
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-orange-500" /><span className="text-[10px] text-muted-foreground">Maint.</span></div>
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-sky-500" /><span className="text-[10px] text-muted-foreground">Reserved</span></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Room List Tab */}
        <TabsContent value="list" className="mt-4">
          {isLoading ? (
            <Card><CardContent className="p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)}</CardContent></Card>
          ) : (
            <Card className="border-none shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-left p-3 font-medium">Room</TableHead>
                        <TableHead className="text-left p-3 font-medium">Floor</TableHead>
                        <TableHead className="text-left p-3 font-medium hidden sm:table-cell">Type</TableHead>
                        <TableHead className="text-left p-3 font-medium hidden md:table-cell">Rate</TableHead>
                        <TableHead className="text-left p-3 font-medium">Status</TableHead>
                        <TableHead className="text-left p-3 font-medium hidden lg:table-cell">Condition</TableHead>
                        <TableHead className="text-left p-3 font-medium">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRooms.map((room) => (
                        <TableRow key={room.id} className="border-b hover:bg-muted/30 transition-colors">
                          <TableCell className="p-3 font-medium">{room.roomNumber}</TableCell>
                          <TableCell className="p-3">{room.floor}</TableCell>
                          <TableCell className="p-3 hidden sm:table-cell">{room.roomType.name}</TableCell>
                          <TableCell className="p-3 hidden md:table-cell">{formatCurrency(room.roomType.baseRate)}</TableCell>
                          <TableCell className="p-3">
                            <Badge className={`text-[10px] px-2 py-0.5 h-5 ${statusBadge[room.status] || ''}`}>
                              {room.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="p-3 capitalize hidden lg:table-cell text-muted-foreground">
                            {room.currentCondition?.replace('_', ' ') || 'Good'}
                          </TableCell>
                          <TableCell className="p-3">
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditRoom(room)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => confirmDeleteRoom(room)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredRooms.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="p-6 text-center text-muted-foreground">No rooms found</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Room Types Tab */}
        <TabsContent value="room-types" className="mt-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Room Types</CardTitle>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={openCreateRoomType}>
                <Plus className="h-4 w-4 mr-1" /> Add Room Type
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Description</TableHead>
                      <TableHead>Base Rate</TableHead>
                      <TableHead className="hidden md:table-cell">Max Guests</TableHead>
                      <TableHead className="hidden lg:table-cell">Rooms</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRoomTypes.map((rt) => {
                      const roomCount = rooms.filter((r) => r.roomTypeId === rt.id).length;
                      return (
                        <TableRow key={rt.id}>
                          <TableCell className="font-medium">{rt.name}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground text-sm max-w-48 truncate">
                            {rt.description || '—'}
                          </TableCell>
                          <TableCell className="font-medium">{formatCurrency(rt.baseRate)}<span className="text-xs text-muted-foreground">/night</span></TableCell>
                          <TableCell className="hidden md:table-cell">{rt.maxOccupancy}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge variant="outline" className="text-xs">{roomCount} room{roomCount !== 1 ? 's' : ''}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditRoomType(rt)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => confirmDeleteRoomType(rt)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {allRoomTypes.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No room types found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Room Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) { setEditingRoom(null); setForm(emptyRoomForm); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Room Number *</Label>
              <Input placeholder="e.g., 108" value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Floor *</Label>
                <Select value={form.floor} onValueChange={(v) => setForm({ ...form, floor: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {floors.length > 0 ? floors.map((f) => (
                      <SelectItem key={f} value={String(f)}>Floor {f}</SelectItem>
                    )) : [1, 2, 3, 4, 5].map((f) => (
                      <SelectItem key={f} value={String(f)}>Floor {f}</SelectItem>
                    ))}
                    {floors.length > 0 && (
                      <SelectItem value={String(Math.max(...floors) + 1)}>
                        Floor {Math.max(...floors) + 1} (New)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Room Type *</Label>
                <Select value={form.roomTypeId} onValueChange={(v) => setForm({ ...form, roomTypeId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {allRoomTypes.map((rt) => (
                      <SelectItem key={rt.id} value={rt.id}>
                        {rt.name} (₦{rt.baseRate.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editingRoom && (
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['available', 'occupied', 'housekeeping', 'maintenance', 'reserved', 'out_of_service'].map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
            </div>
            <Button onClick={handleRoomSubmit} className="bg-amber-500 hover:bg-amber-600 text-white">
              {editingRoom ? 'Update Room' : 'Create Room'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Room Type Dialog */}
      <Dialog open={rtDialogOpen} onOpenChange={(open) => {
        setRtDialogOpen(open);
        if (!open) { setEditingRoomType(null); setRtForm(emptyRoomTypeForm); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoomType ? 'Edit Room Type' : 'Add New Room Type'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input placeholder="e.g., Deluxe Suite" value={rtForm.name} onChange={(e) => setRtForm({ ...rtForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Base Rate (₦/night) *</Label>
                <Input type="number" placeholder="0" value={rtForm.baseRate} onChange={(e) => setRtForm({ ...rtForm, baseRate: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Max Occupancy *</Label>
                <Input type="number" placeholder="2" value={rtForm.maxOccupancy} onChange={(e) => setRtForm({ ...rtForm, maxOccupancy: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={rtForm.description} onChange={(e) => setRtForm({ ...rtForm, description: e.target.value })} placeholder="Room type description..." />
            </div>
            <Button onClick={handleRoomTypeSubmit} className="bg-amber-500 hover:bg-amber-600 text-white">
              {editingRoomType ? 'Update Room Type' : 'Create Room Type'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === 'room' ? 'Room' : 'Room Type'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.type === 'room' ? 'room' : 'room type'} &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
