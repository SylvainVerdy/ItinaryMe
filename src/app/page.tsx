'use client';

import {ChatInterface} from '@/components/ChatInterface';
import {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Textarea} from '@/components/ui/textarea';
import {Input} from '@/components/ui/input';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import {auth} from '@/lib/firebase'; // Assuming you have a firebase.ts file
import {Label} from '@/components/ui/label';
import {Icons} from '@/components/icons';
import {Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription} from "@/components/ui/dialog";

type TaskType = 'document' | 'planning' | 'travel';

const formSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof formSchema>;

export default function Home() {
  const [activeTask, setActiveTask] = useState<TaskType | null>(null);
  const [documentContent, setDocumentContent] = useState('');
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const {
    register,
    handleSubmit,
    formState: {errors},
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignUp = async (data: FormData) => {
    try {
      await createUserWithEmailAndPassword(auth, data.email, data.password);
      alert('Signup successful!');
      setOpen(false); // Close the dialog after successful signup
    } catch (error: any) {
      alert(`Signup failed: ${error.message}`);
    }
  };

  const handleSignIn = async (data: FormData) => {
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      alert('Login successful!');
      setOpen(false); // Close the dialog after successful signin
    } catch (error: any) {
      alert(`Login failed: ${error.message}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      alert('Logged out successfully.');
    } catch (error: any) {
      alert(`Logout failed: ${error.message}`);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      alert('Google Sign-in successful!');
    } catch (error: any) {
      alert(`Google Sign-in failed: ${error.message}`);
    }
  };

  const renderTaskContent = () => {
    if (!user) {
      return <p>Please log in to view tasks.</p>;
    }

    switch (activeTask) {
      case 'document':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Document Task</CardTitle>
              <CardDescription>Create and edit a document.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Start writing your document here..."
                value={documentContent}
                onChange={e => setDocumentContent(e.target.value)}
                className="min-h-[300px]"
              />
            </CardContent>
          </Card>
        );
      case 'planning':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Planning Task</CardTitle>
              <CardDescription>Plan your schedule.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Implement planning interface here */}
              <p>Planning interface coming soon...</p>
            </CardContent>
          </Card>
        );
      case 'travel':
        return <ChatInterface />;
      default:
        return <p>Select a task type to start.</p>;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="bg-secondary p-4 flex justify-end">
        {user ? (
          <div className="flex items-center space-x-4">
            <Button onClick={handleSignOut} variant="secondary">Sign Out</Button>
          </div>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">Account</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{isSignUp ? "Create account" : "Sign In"}</DialogTitle>
                <DialogDescription>
                  {isSignUp ? "Create a new account" : "Login to your account"}
                </DialogDescription>
              </DialogHeader>
              <CardContent>
                <form onSubmit={handleSubmit(isSignUp ? handleSignUp : handleSignIn)} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      type="email"
                      id="email"
                      placeholder="Email"
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-red-500">{errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      type="password"
                      id="password"
                      placeholder="Password"
                      {...register('password')}
                    />
                    {errors.password && (
                      <p className="text-red-500">{errors.password.message}</p>
                    )}
                  </div>
                  <Button type="submit" variant="primary">{isSignUp ? "Sign Up" : "Sign In"}</Button>
                </form>
                <Button variant="outline" onClick={handleGoogleSignIn}>
                  <Icons.google className="mr-2 h-4 w-4" />
                  Sign In with Google
                </Button>
                <Button variant="link" onClick={() => setIsSignUp(!isSignUp)}>
                  {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                </Button>
              </CardContent>
            </DialogContent>
          </Dialog>
        )}
      </header>

      <div className="flex flex-col flex-1 p-6 items-center">
        {user ? (
          <div className="w-full max-w-md">
            <div className="flex space-x-4 mb-4">
              <Button onClick={() => setActiveTask('document')}>
                New Document
              </Button>
              <Button onClick={() => setActiveTask('planning')}>
                New Planning
              </Button>
              <Button onClick={() => setActiveTask('travel')}>Plan a Trip</Button>
            </div>
            <div className="flex-1">{renderTaskContent()}</div>

          </div>
        ) : (
          <p>Please log in to view tasks.</p>
        )}
      </div>
    </div>
  );
}
