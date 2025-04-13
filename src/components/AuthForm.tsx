'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@/lib/resolvers/zod';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

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
        await signInWithEmailAndPassword(auth, data.email, data.password);
        router.push('/dashboard'); // Rediriger vers le tableau de bord après connexion
      } else {
        // Inscription
        await createUserWithEmailAndPassword(auth, data.email, data.password);
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

      <CardContent>
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