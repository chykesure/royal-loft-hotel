'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { formatDateTime } from '@/lib/auth';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
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
import {
  Cloud, FolderOpen, Upload, Download, Eye, Trash2, Search, RefreshCw,
  FileText, FileImage, FileSpreadsheet, FileArchive, File,
  HardDrive, FolderPlus, X, AlertTriangle, Clock, Lock,
  FileCode, Video,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CloudFile {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  category: string | null;
  accessLevel: string;
  uploadedBy: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface CategorySummary {
  category: string;
  count: number;
  size: number;
}

interface StorageSummary {
  totalFiles: number;
  totalSize: number;
  categories: CategorySummary[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return { icon: FileImage, color: 'text-violet-500', bg: 'bg-violet-50' };
  if (mimeType === 'application/pdf') return { icon: FileText, color: 'text-red-500', bg: 'bg-red-50' };
  if (mimeType.includes('word') || mimeType.includes('document')) return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' };
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType === 'text/csv') return { icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-50' };
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return { icon: File, color: 'text-orange-500', bg: 'bg-orange-50' };
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('gzip') || mimeType.includes('archive')) return { icon: FileArchive, color: 'text-amber-600', bg: 'bg-amber-50' };
  if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('javascript') || mimeType.includes('css') || mimeType.includes('html')) return { icon: FileCode, color: 'text-slate-500', bg: 'bg-slate-50' };
  if (mimeType.startsWith('video/')) return { icon: Video, color: 'text-pink-500', bg: 'bg-pink-50' };
  return { icon: File, color: 'text-slate-400', bg: 'bg-slate-50' };
}

const CATEGORY_LABELS: Record<string, string> = {
  contracts: 'Contracts & Agreements',
  licenses: 'Licenses & Permits',
  guest_ids: 'Guest IDs',
  receipts: 'Receipts',
  invoices: 'Invoices',
  policies: 'Policies & SOPs',
  reports: 'Reports',
  other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  contracts: 'bg-amber-100 text-amber-700',
  licenses: 'bg-sky-100 text-sky-700',
  guest_ids: 'bg-violet-100 text-violet-700',
  receipts: 'bg-emerald-100 text-emerald-700',
  invoices: 'bg-rose-100 text-rose-700',
  policies: 'bg-orange-100 text-orange-700',
  reports: 'bg-teal-100 text-teal-700',
  other: 'bg-slate-100 text-slate-700',
};

const CATEGORY_FOLDER_COLORS: Record<string, string> = {
  contracts: 'text-amber-500',
  licenses: 'text-sky-500',
  guest_ids: 'text-violet-500',
  receipts: 'text-emerald-500',
  invoices: 'text-rose-500',
  policies: 'text-orange-500',
  reports: 'text-teal-500',
  other: 'text-slate-500',
};

const UPLOAD_CATEGORIES = [
  { value: 'contracts', label: 'Contracts & Agreements' },
  { value: 'licenses', label: 'Licenses & Permits' },
  { value: 'guest_ids', label: 'Guest IDs' },
  { value: 'receipts', label: 'Receipts' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'policies', label: 'Policies & SOPs' },
  { value: 'reports', label: 'Reports' },
  { value: 'other', label: 'Other' },
];

const ACCESS_LEVEL_OPTIONS = [
  { value: 'admin', label: 'Admin Only', desc: 'Super Admin & Developer' },
  { value: 'manager', label: 'Manager & Up', desc: 'Manager, Super Admin, Developer' },
  { value: 'accountant', label: 'Accountant & Up', desc: 'Accountant, Manager, Super Admin, Developer' },
  { value: 'all_staff', label: 'All Staff', desc: 'Anyone with access to Cloud Storage' },
];

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB

// ─── Component ────────────────────────────────────────────────────────────────

export function CloudStorageModule() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = ['manager', 'super_admin', 'developer'].includes(user?.role || '');

  const [files, setFiles] = useState<CloudFile[]>([]);
  const [summary, setSummary] = useState<StorageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('other');
  const [uploadAccessLevel, setUploadAccessLevel] = useState('admin');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<CloudFile | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CloudFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Fetch ───────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (activeCategory) params.set('category', activeCategory);
      if (searchQuery) params.set('search', searchQuery);
      const qs = params.toString();
      const res = await fetch(`/api/cloud-storage${qs ? `?${qs}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files);
        setSummary(data.summary);
      } else {
        toast.error('Failed to load cloud storage');
      }
    } catch {
      toast.error('Network error loading files');
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── File Selection ─────────────────────────────────────────────────────

  const addFiles = (fileList: FileList | File[]) => {
    const newFiles = Array.from(fileList);
    const oversized = newFiles.filter(f => f.size > MAX_UPLOAD_SIZE);
    if (oversized.length > 0) {
      toast.error(`${oversized.length} file(s) exceed the 10 MB limit and were skipped`);
    }
    const valid = newFiles.filter(f => f.size <= MAX_UPLOAD_SIZE);
    setUploadFiles(prev => [...prev, ...valid].slice(0, 10)); // max 10 files at once
  };

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Upload ──────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      toast.error('Please select at least one file');
      return;
    }
    try {
      setIsUploading(true);
      setUploadProgress(0);

      let success = 0;
      let failed = 0;

      for (let i = 0; i < uploadFiles.length; i++) {
        try {
          const formData = new FormData();
          formData.append('file', uploadFiles[i]);
          formData.append('category', uploadCategory);
          formData.append('accessLevel', uploadAccessLevel);

          const res = await fetch('/api/cloud-storage', { method: 'POST', body: formData });
          if (res.ok) {
            success++;
          } else {
            const err = await res.json().catch(() => ({}));
            failed++;
            toast.error(`"${uploadFiles[i].name}": ${err.error || 'Upload failed'}`);
          }
        } catch {
          failed++;
          toast.error(`"${uploadFiles[i].name}": Network error`);
        }
        setUploadProgress(Math.round(((i + 1) / uploadFiles.length) * 100));
      }

      if (success > 0) {
        toast.success(`${success} file${success > 1 ? 's' : ''} uploaded successfully`);
      }

      setUploadOpen(false);
      setUploadFiles([]);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData();
    } catch {
      toast.error('Upload process failed');
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────

  const confirmDelete = (file: CloudFile) => {
    if (!isAdmin) {
      toast.error('Only managers and admins can delete files');
      return;
    }
    setDeleteTarget(file);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/cloud-storage?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('File deleted');
        setDeleteOpen(false);
        setDeleteTarget(null);
        if (previewFile?.id === deleteTarget.id) setPreviewOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Delete failed');
      }
    } catch {
      toast.error('Network error during delete');
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Preview / Download ──────────────────────────────────────────────────

  const openPreview = (file: CloudFile) => {
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  const handleDownload = (file: CloudFile) => {
    const a = document.createElement('a');
    a.href = `/${file.path}`;
    a.download = file.originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Download started');
  };

  // ─── Filtered files ─────────────────────────────────────────────────────

  const displayFiles = activeCategory
    ? files.filter((f) => f.category === activeCategory)
    : files;

  // ─── Storage usage bar ──────────────────────────────────────────────────

  const storagePercent = Math.min((summary?.totalSize ?? 0) / (100 * 1024 * 1024) * 100, 100); // 100 MB reference

  // ─── Drag & Drop Handlers ───────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  // ─── Render helpers ──────────────────────────────────────────────────────

  const renderSummarySkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      {isLoading && !summary ? (
        renderSummarySkeleton()
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-2.5">
                  <HardDrive className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Storage Used</p>
                  <p className="text-xl font-bold">{formatFileSize(summary?.totalSize ?? 0)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 p-2.5">
                  <File className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Files</p>
                  <p className="text-xl font-bold">{summary?.totalFiles ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-sky-100 p-2.5">
                  <FolderOpen className="h-5 w-5 text-sky-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Categories</p>
                  <p className="text-xl font-bold">{summary?.categories.length ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-2">Storage Usage</p>
                <Progress value={storagePercent} className="h-2 mb-1" />
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(summary?.totalSize ?? 0)} / 100 MB
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ── Category Folders Panel ──────────────────────────────────────── */}
        <Card className="border-none shadow-sm lg:col-span-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Folders</CardTitle>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white h-8"
                onClick={() => setUploadOpen(true)}
              >
                <Upload className="h-3.5 w-3.5 mr-1" /> Upload
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {/* "All Files" option */}
              <div
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  activeCategory === null ? 'bg-amber-50 ring-1 ring-amber-200' : 'hover:bg-muted/60'
                }`}
                onClick={() => setActiveCategory(null)}
              >
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">All Files</p>
                    <p className="text-xs text-muted-foreground">
                      {summary?.totalFiles ?? 0} files
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] h-5 bg-muted">
                  {formatFileSize(summary?.totalSize ?? 0)}
                </Badge>
              </div>

              {/* Per-category folders */}
              {summary?.categories.map((cat) => (
                <div
                  key={cat.category}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    activeCategory === cat.category ? 'bg-amber-50 ring-1 ring-amber-200' : 'hover:bg-muted/60'
                  }`}
                  onClick={() => setActiveCategory(cat.category === activeCategory ? null : cat.category)}
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className={`h-5 w-5 ${CATEGORY_FOLDER_COLORS[cat.category] || 'text-slate-400'}`} />
                    <div>
                      <p className="text-sm font-medium">{CATEGORY_LABELS[cat.category] || cat.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {cat.count} file{cat.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-5 bg-muted">
                    {formatFileSize(cat.size)}
                  </Badge>
                </div>
              ))}

              {(!summary?.categories || summary.categories.length === 0) && !isLoading && (
                <div className="text-center py-8">
                  <FolderPlus className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No folders yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Upload files to create folders</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── File Browser ────────────────────────────────────── */}
        <Card className="border-none shadow-sm lg:col-span-8">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base">
                {activeCategory ? CATEGORY_LABELS[activeCategory] || activeCategory : 'All Files'}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({displayFiles.length} file{displayFiles.length !== 1 ? 's' : ''})
                </span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search files..."
                    className="pl-9 h-8 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={fetchData}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Empty state */}
            {displayFiles.length === 0 && !isLoading && (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging ? 'border-amber-400 bg-amber-50' : 'border-muted-foreground/20'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Cloud className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">
                  {searchQuery || activeCategory ? 'No files match your search' : 'No files uploaded yet'}
                </p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  {searchQuery || activeCategory
                    ? 'Try a different search term or clear filters'
                    : 'Drag & drop files here or click Upload to get started'}
                </p>
                {!searchQuery && !activeCategory && (
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => setUploadOpen(true)}
                  >
                    <Upload className="h-4 w-4 mr-1" /> Upload Files
                  </Button>
                )}
              </div>
            )}

            {/* File list */}
            {displayFiles.length > 0 && (
              <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                {displayFiles.map((file) => {
                  const fileIcon = getFileIcon(file.mimeType);
                  const IconComp = fileIcon.icon;
                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/60 transition-colors group"
                    >
                      <div
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        onClick={() => openPreview(file)}
                      >
                        <div className={`rounded-lg p-2 ${fileIcon.bg} shrink-0`}>
                          <IconComp className={`h-4 w-4 ${fileIcon.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{file.originalName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatFileSize(file.size)}</span>
                            <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/30" />
                            <span>{formatDateTime(file.createdAt)}</span>
                            {file.version > 1 && (
                              <>
                                <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/30" />
                                <span className="text-amber-600">v{file.version}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-2 py-0.5 h-5 hidden md:inline-flex ${CATEGORY_COLORS[file.category || 'other'] || ''}`}
                        >
                          {CATEGORY_LABELS[file.category || 'other'] || file.category}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 hidden lg:inline-flex gap-0.5">
                          <Lock className="h-2.5 w-2.5" />
                          {file.accessLevel}
                        </Badge>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openPreview(file)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDownload(file)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => confirmDelete(file)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Loading skeleton for file list */}
            {isLoading && (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Upload Dialog ───────────────────────────────────────────────── */}
      <Dialog open={uploadOpen} onOpenChange={(open) => {
        if (!open) { setUploadFiles([]); setUploadProgress(0); }
        setUploadOpen(open);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>Upload documents to cloud storage. Max 10 MB per file, up to 10 files at once.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Category *</Label>
                <Select value={uploadCategory} onValueChange={setUploadCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {UPLOAD_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Access Level</Label>
                <Select value={uploadAccessLevel} onValueChange={setUploadAccessLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Who can see this" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESS_LEVEL_OPTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        <span className="flex flex-col">
                          <span className="text-xs font-medium">{a.label}</span>
                          <span className="text-[10px] text-muted-foreground">{a.desc}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Drag & drop zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                isDragging ? 'border-amber-400 bg-amber-50' : 'border-muted-foreground/20 hover:border-muted-foreground/40'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {isDragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Images, PDFs, Office docs, text files, archives (max 10 MB each)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
              />
            </div>

            {/* Selected files list */}
            {uploadFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {uploadFiles.length} file{uploadFiles.length !== 1 ? 's' : ''} selected
                </p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {uploadFiles.map((f, idx) => {
                    const icon = getFileIcon(f.type);
                    const IconComp = icon.icon;
                    return (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                        <div className={`rounded p-1.5 ${icon.bg}`}>
                          <IconComp className={`h-3.5 w-3.5 ${icon.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{f.name}</p>
                          <p className="text-[10px] text-muted-foreground">{formatFileSize(f.size)}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload progress */}
            {isUploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1.5" />
              </div>
            )}

            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white w-full"
              disabled={uploadFiles.length === 0 || isUploading}
              onClick={handleUpload}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Uploading ({uploadProgress}%)...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" /> Upload {uploadFiles.length > 0 ? `${uploadFiles.length} File(s)` : ''}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── File Preview Dialog ─────────────────────────────────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>File Details</DialogTitle>
            <DialogDescription>View file metadata and manage this document.</DialogDescription>
          </DialogHeader>
          {previewFile && (() => {
            const fileIcon = getFileIcon(previewFile.mimeType);
            const IconComp = fileIcon.icon;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-3 ${fileIcon.bg}`}>
                    <IconComp className={`h-6 w-6 ${fileIcon.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{previewFile.originalName}</p>
                    <p className="text-xs text-muted-foreground">{previewFile.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Size</p>
                    <p className="font-medium">{formatFileSize(previewFile.size)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">{previewFile.mimeType.split('/').pop()}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Category</p>
                    <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 h-5 ${CATEGORY_COLORS[previewFile.category || 'other'] || ''}`}>
                      {CATEGORY_LABELS[previewFile.category || 'other'] || previewFile.category}
                    </Badge>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Access Level</p>
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 gap-0.5">
                      <Lock className="h-2.5 w-2.5" />
                      <span className="capitalize">{previewFile.accessLevel.replace('_', ' ')}</span>
                    </Badge>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Uploaded</p>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <p className="font-medium">{formatDateTime(previewFile.createdAt)}</p>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Version</p>
                    <p className="font-medium">v{previewFile.version}</p>
                  </div>
                </div>

                {/* Image preview */}
                {previewFile.mimeType.startsWith('image/') && (
                  <div className="rounded-lg overflow-hidden border bg-muted/30 p-2">
                    <img
                      src={`/${previewFile.path}`}
                      alt={previewFile.originalName}
                      className="max-h-60 w-auto mx-auto rounded object-contain"
                    />
                  </div>
                )}

                {/* PDF preview */}
                {previewFile.mimeType === 'application/pdf' && (
                  <div className="rounded-lg border bg-muted/30 p-6 text-center">
                    <FileText className="h-10 w-10 mx-auto mb-2 text-red-400" />
                    <p className="text-sm text-muted-foreground mb-2">PDF Document Preview</p>
                    <Button size="sm" variant="outline" onClick={() => handleDownload(previewFile)}>
                      <Download className="h-4 w-4 mr-1" /> Open / Download
                    </Button>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDownload(previewFile)}
                  >
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 flex-1"
                      onClick={() => { setPreviewOpen(false); confirmDelete(previewFile); }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ─────────────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete File
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.originalName}</strong>? This action cannot be undone and the file will be permanently removed from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Deleting...
                </>
              ) : (
                'Delete File'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}