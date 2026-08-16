"use client";

// PAGE TEMPORAIRE — prévisualisation du Dashboard sans session Firebase.
// À supprimer après vérification visuelle.

import { AuthContext } from '@/hooks/useAuth';
import { Dashboard } from '@/components/Dashboard';

const fakeUser = {
  uid: 'preview-uid',
  email: 'sylvain.verdy.pro@gmail.com',
} as never;

export default function PreviewPage() {
  return (
    <AuthContext.Provider
      value={{
        user: fakeUser,
        loading: false,
        signIn: async () => {},
        signUp: async () => {},
        signInWithGoogle: async () => {},
        signOut: async () => {},
      }}
    >
      <Dashboard />
    </AuthContext.Provider>
  );
}
