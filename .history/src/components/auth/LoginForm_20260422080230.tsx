'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Hotel, Star, Shield, Zap, Clock, Eye, EyeOff } from 'lucide-react';

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { setUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      setError('Email and password are required');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        toast.success(`Welcome back, ${data.user.name}!`);
      } else {
        const err = await res.json();
        setError(err.error || 'Login failed');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-amber-600 via-amber-700 to-yellow-900">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] rounded-full bg-white/5" />
        <div className="absolute top-1/3 right-20 w-32 h-32 rounded-full bg-white/5" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Top Section */}
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-lg">
                <Hotel className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Royal Loft</h1>
                <p className="text-amber-200/80 text-xs tracking-[0.3em] uppercase">Hotel & Suites</p>
              </div>
            </div>
          </div>

          {/* Middle Section - Hero */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-300 text-yellow-300" />
                ))}
              </div>
              <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                Premium Hotel
                <br />
                <span className="text-amber-200/90">Management</span>
              </h2>
              <p className="text-amber-100/70 text-lg max-w-md leading-relaxed">
                A comprehensive management solution designed for luxury hospitality. Streamline operations, delight guests, and grow your business.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-2 gap-3 max-w-md">
              {[
                { icon: Zap, label: 'Smart Operations', desc: 'AI-powered automation' },
                { icon: Shield, label: 'Enterprise Security', desc: 'Role-based access' },
                { icon: Clock, label: 'Real-time Dashboard', desc: 'Live analytics' },
                { icon: Hotel, label: 'Guest Experience', desc: 'Personalized service' },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="group flex items-start gap-3 p-3 rounded-xl bg-white/8 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all duration-300 cursor-default"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
                    <feature.icon className="h-4 w-4 text-amber-200" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{feature.label}</p>
                    <p className="text-[11px] text-amber-200/60">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/15" />
            <p className="text-xs text-amber-200/50 tracking-wide">
              NDPR Compliant &bull; Osun, Nigeria
            </p>
            <div className="h-px flex-1 bg-white/15" />
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25">
              <Hotel className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Royal Loft</h1>
              <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase">Hotel Management System</p>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </div>

          {/* Header */}
          <div className="space-y-2 hidden lg:block">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground text-sm">
              Sign in to access your management dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-100 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="rounded-full bg-red-100 p-1 mt-0.5">
                  <svg className="h-3 w-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@royalloft.com"
                  required
                  className="h-11 bg-white border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 text-sm placeholder:text-slate-400 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    required
                    className="h-11 bg-white border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 text-sm placeholder:text-slate-400 pr-11 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-200 active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in to Dashboard'
              )}
            </Button>
          </form>

          {/* Footer Info */}
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-gradient-to-br from-slate-50 via-white to-amber-50/30 px-3 text-muted-foreground">
                  System Access
                </span>
              </div>
            </div>

            <p className="text-[11px] text-center text-muted-foreground/70">
              Secured with 256-bit encryption &bull; Royal Loft Hotel, Osun
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}