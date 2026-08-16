'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@/lib/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types et schéma pour la validation
type AuthFormData = {
  email: string;
  password: string;
  confirmPassword?: string;
};

const loginSchema = z.object({
  email: z.string().email('Format d\'email invalide'),
  password: z.string().min(6, 'Le mot de passe doit comporter au moins 6 caractères'),
});

const registerSchema = loginSchema.extend({
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

export default function AuthForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { signIn, signUp, signInWithGoogle } = useAuth();

  // Configuration du formulaire selon le mode
  const { register, handleSubmit, formState: { errors }, reset } = useForm<AuthFormData>({
    resolver: zodResolver(mode === 'login' ? loginSchema : registerSchema),
  });

  const onSubmit = async (data: AuthFormData) => {
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        // Connexion
        await signIn(data.email, data.password);
        router.push('/dashboard'); // Rediriger vers le tableau de bord après connexion
      } else {
        // Inscription
        await signUp(data.email, data.password);
        router.push('/dashboard'); // Rediriger vers le tableau de bord après inscription
      }
    } catch (err: any) {
      // Gestion des erreurs d'authentification
      setError(
        err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password'
          ? 'Email ou mot de passe incorrect'
          : err.code === 'auth/email-already-in-use'
          ? 'Cet email est déjà utilisé'
          : 'Une erreur est survenue. Veuillez réessayer.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
      router.push('/dashboard');
    } catch (err: any) {
      setError('Échec de la connexion avec Google. Veuillez réessayer.');
      console.error('Erreur de connexion Google:', err);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    reset();
    setError(null);
  };

  const inputClass = (hasError?: boolean) =>
    cn(
      'w-full rounded-2xl border bg-white py-3 pl-11 pr-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400',
      hasError
        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
        : 'border-slate-200 focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10',
    );

  return (
    <div className="w-full">
      {/* Bascule connexion / inscription */}
      <div className="mb-8 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
        {(['login', 'register'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => switchMode(value)}
            className={cn(
              'rounded-xl py-2.5 text-sm font-semibold transition',
              mode === value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {value === 'login' ? 'Connexion' : 'Inscription'}
          </button>
        ))}
      </div>

      <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900">
        {mode === 'login' ? 'Content de vous revoir' : 'Créez votre compte'}
      </h1>
      <p className="mt-2 text-slate-500">
        {mode === 'login'
          ? 'Connectez-vous pour retrouver vos itinéraires.'
          : 'Quelques secondes suffisent pour commencer à planifier.'}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-800">
            Email
          </label>
          <div className="relative">
            <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              type="email"
              placeholder="votre@email.com"
              autoComplete="email"
              {...register('email')}
              className={inputClass(!!errors.email)}
            />
          </div>
          {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-800">
            Mot de passe
          </label>
          <div className="relative">
            <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              {...register('password')}
              className={cn(inputClass(!!errors.password), 'pr-12')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {mode === 'register' && (
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                {...register('confirmPassword')}
                className={inputClass(!!errors.confirmPassword)}
              />
            </div>
            {errors.confirmPassword && (
              <p className="mt-1.5 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-coral to-brand-sun px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Chargement…' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
        </button>
      </form>

      <div className="my-7 flex items-center gap-4">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs uppercase tracking-wider text-slate-400">ou</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {mode === 'login' ? 'Continuer avec Google' : "S'inscrire avec Google"}
      </button>

      <p className="mt-7 text-center text-sm text-slate-500">
        {mode === 'login' ? "Vous n'avez pas de compte ? " : 'Déjà un compte ? '}
        <button
          type="button"
          onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
          className="font-semibold text-brand-teal transition-colors hover:text-brand-lagoon"
        >
          {mode === 'login' ? 'Inscrivez-vous' : 'Connectez-vous'}
        </button>
      </p>
    </div>
  );
}
