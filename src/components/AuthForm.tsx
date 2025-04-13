'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@/lib/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          {mode === 'login' ? 'Connexion' : 'Créer un compte'}
        </CardTitle>
        <CardDescription>
          {mode === 'login' 
            ? 'Connectez-vous pour accéder à votre compte' 
            : 'Inscrivez-vous pour créer un compte'}
        </CardDescription>
      </CardHeader>
      
      <Tabs value={mode} onValueChange={(value) => setMode(value as 'login' | 'register')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Connexion</TabsTrigger>
          <TabsTrigger value="register">Inscription</TabsTrigger>
        </TabsList>
      </Tabs>

      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              {...register('email')}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              className={errors.password ? 'border-red-500' : ''}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                className={errors.confirmPassword ? 'border-red-500' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button 
            type="submit" 
            className="w-full"
            disabled={loading}
          >
            {loading 
              ? 'Chargement...' 
              : mode === 'login' 
                ? 'Se connecter' 
                : "S'inscrire"
            }
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">ou</span>
          </div>
        </div>

        <Button 
          type="button" 
          variant="outline" 
          className="w-full flex items-center justify-center gap-2"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <svg viewBox="0 0 24 24" width="20" height="20">
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
          </div>
          {mode === 'login' ? 'Se connecter avec Google' : "S'inscrire avec Google"}
        </Button>
      </CardContent>

      <CardFooter className="flex justify-center">
        <Button 
          variant="link" 
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            reset();
            setError(null);
          }}
        >
          {mode === 'login'
            ? "Vous n'avez pas de compte ? Inscrivez-vous"
            : 'Déjà un compte ? Connectez-vous'}
        </Button>
      </CardFooter>
    </Card>
  );
} 