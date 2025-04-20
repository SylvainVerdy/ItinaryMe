import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export const authOptions: NextAuthOptions = {
  // Définir les fournisseurs d'authentification
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        try {
          // Utiliser Firebase pour authentifier l'utilisateur
          const userCredential = await signInWithEmailAndPassword(
            auth,
            credentials.email,
            credentials.password
          );
          
          const user = userCredential.user;
          
          if (!user) {
            return null;
          }
          
          return {
            id: user.uid,
            name: user.displayName,
            email: user.email,
            image: user.photoURL
          };
        } catch (error) {
          console.error('Erreur lors de l\'authentification:', error);
          return null;
        }
      }
    })
  ],
  
  // Configuration des pages personnalisées
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error'
  },
  
  // Callback de session
  callbacks: {
    async session({ session, token }) {
      if (session?.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    }
  },
  
  // Sécurité et configuration de session
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  secret: process.env.NEXTAUTH_SECRET || 'itinaryme-secret-key-change-this-in-production',
  
  // Ajustements pour développement
  debug: process.env.NODE_ENV === 'development',
}; 