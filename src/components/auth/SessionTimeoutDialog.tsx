'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { ShieldAlert, Clock } from 'lucide-react';

interface SessionTimeoutDialogProps {
  open: boolean;
  countdownSeconds: number;
  onStayLoggedIn: () => void;
}

export function SessionTimeoutDialog({
  open,
  countdownSeconds,
  onStayLoggedIn,
}: SessionTimeoutDialogProps) {
  const minutes = Math.floor(countdownSeconds / 60);
  const seconds = countdownSeconds % 60;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle className="text-lg">
              Session Expiring Soon
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm leading-relaxed pt-1">
            You have been inactive for a while. For your security, your session
            will automatically end due to inactivity.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Countdown display */}
        <div className="flex items-center justify-center gap-2 py-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
          <span className="text-sm text-muted-foreground">remaining</span>
        </div>

        <AlertDialogFooter>
          <AlertDialogAction
            onClick={onStayLoggedIn}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Continue Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
