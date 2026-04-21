'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Database, RotateCcw, Trash2, AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface ModuleInfo {
  key: string;
  label: string;
  count: number;
  models: string[];
}

export function DeveloperToolModule() {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resettingKey, setResettingKey] = useState<string | null>(null);
  const [isFullResetting, setIsFullResetting] = useState(false);

  // Confirmation dialogs
  const [moduleResetOpen, setModuleResetOpen] = useState(false);
  const [moduleResetTarget, setModuleResetTarget] = useState<ModuleInfo | null>(null);
  const [fullResetOpen, setFullResetOpen] = useState(false);

  const fetchModules = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/developer-tools');
      if (res.ok) {
        const data = await res.json();
        setModules(data.modules);
      } else {
        toast.error('Failed to load module data');
      }
    } catch {
      toast.error('Failed to load module data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const totalRecords = modules.reduce((sum, m) => sum + m.count, 0);

  const confirmModuleReset = (mod: ModuleInfo) => {
    setModuleResetTarget(mod);
    setModuleResetOpen(true);
  };

  const handleModuleReset = async () => {
    if (!moduleResetTarget) return;
    setResettingKey(moduleResetTarget.key);
    setModuleResetOpen(false);
    try {
      const res = await fetch('/api/developer-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: moduleResetTarget.key }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        fetchModules();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to reset module');
      }
    } catch {
      toast.error('Failed to reset module');
    } finally {
      setResettingKey(null);
      setModuleResetTarget(null);
    }
  };

  const handleFullReset = async () => {
    setFullResetOpen(false);
    setIsFullResetting(true);
    try {
      const res = await fetch('/api/developer-tools', { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        fetchModules();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to reset database');
      }
    } catch {
      toast.error('Failed to reset database');
    } finally {
      setIsFullResetting(false);
    }
  };

  const getModuleIcon = (key: string) => {
    const iconMap: Record<string, string> = {
      rooms: '🛏️',
      guests: '👥',
      reservations: '📅',
      billing: '💰',
      staff: '👨‍💼',
      inventory: '📦',
      expenses: '💸',
      security: '🔒',
      cloud: '☁️',
      reports: '📊',
      rules: '📋',
      notifications: '🔔',
      audit: '📝',
    };
    return iconMap[key] || '🔧';
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">

      {/* ═══════════════ HEADER ═══════════════ */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-amber-50 to-orange-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-amber-500 p-3 shadow-lg shadow-amber-500/20">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-amber-900">Developer Tools</h1>
              <p className="text-sm text-amber-700 mt-1">
                This module is for developers only. Use it to inspect database state and reset module data for testing.
                <br />
                <span className="text-xs text-amber-600 font-medium">
                  ⚠️ Reset operations are irreversible and will permanently delete data.
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════ SYSTEM OVERVIEW ═══════════════ */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2">
                <Database className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">System Overview</CardTitle>
                <CardDescription>Database state across all modules</CardDescription>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={fetchModules} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">Database Type</p>
              <p className="text-sm font-semibold mt-0.5">SQLite</p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">Total Modules</p>
              <p className="text-sm font-semibold mt-0.5">{modules.length}</p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">Total Records</p>
              <p className="text-sm font-semibold mt-0.5">{isLoading ? '...' : totalRecords}</p>
            </div>
          </div>

          {/* ═══════════════ MODULE LIST ═══════════════ */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))
            ) : (
              modules.map((mod) => (
                <div
                  key={mod.key}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-lg shrink-0">{getModuleIcon(mod.key)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{mod.label}</p>
                        <Badge
                          variant={mod.count > 0 ? 'default' : 'secondary'}
                          className={`text-[10px] shrink-0 ${
                            mod.count > 0
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                              : 'bg-muted text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {mod.count} records
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {mod.models.join(' → ')}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 shrink-0 ml-3"
                    disabled={mod.count === 0 || resettingKey === mod.key}
                    onClick={() => confirmModuleReset(mod)}
                  >
                    {resettingKey === mod.key ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reset
                      </>
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* ═══════════════ FULL RESET ═══════════════ */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-100 p-2">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-700">Full Database Reset</p>
                  <p className="text-xs text-muted-foreground">
                    Delete all records from every module (settings & RBAC preserved)
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white h-8 text-xs"
                disabled={totalRecords === 0 || isFullResetting}
                onClick={() => setFullResetOpen(true)}
              >
                {isFullResetting ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Resetting All...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3 w-3 mr-1" />
                    Reset All
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════ MODULE RESET CONFIRMATION ═══════════════ */}
      <AlertDialog open={moduleResetOpen} onOpenChange={setModuleResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Reset {moduleResetTarget?.label}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{moduleResetTarget?.count || 0} records</strong> from{' '}
              <strong>{moduleResetTarget?.label}</strong>.
              <br />
              <span className="text-red-600 font-medium mt-1 block">
                This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleModuleReset}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset Module
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════ FULL RESET CONFIRMATION ═══════════════ */}
      <AlertDialog open={fullResetOpen} onOpenChange={setFullResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Full Database Reset
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>all {totalRecords} records</strong> from{' '}
              <strong>every module</strong> in the database.
              <br />
              <br />
              <span className="text-muted-foreground text-xs">
                Hotel settings and RBAC configurations will be preserved.
              </span>
              <br />
              <span className="text-red-600 font-medium mt-1 block">
                This action cannot be undone. All reservations, guests, billing data, and other records will be lost.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFullReset}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}