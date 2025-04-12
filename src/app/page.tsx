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
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

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
  const [language, setLanguage] = useState('en'); // Default language is English

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
 
   // Translations based on selected language
   const translations = {
     en: {
       welcome: "Welcome to ItinaryMe",
       catchPhrase: "Your personalized travel starts here.",
       description1: "ItinaryMe is a travel application designed to centralize your travel planning and booking experience. We aim to provide personalized travel recommendations and planning, giving you the flexibility to customize your flights, hotels, and activities, all while streamlining the payment process.",
       description2: "ItinaryMe est une application de voyage conçue pour centraliser la planification et la réservation de vos voyages. Notre objectif est de fournir des recommandations de voyage personnalisées et une planification sur mesure, vous offrant la possibilité de personnaliser vos vols, hôtels et activités, tout en simplifiant le processus de paiement.",
       newDocument: "New Document",
       newPlanning: "New Planning",
       planTrip: "Plan a Trip",
       loginMessage: "Please log in to view tasks.",
       account: "Account",
       createAccount: "Create account",
       signIn: "Sign In",
       signUp: "Sign Up",
       loginToAccount: "Login to your account",
       alreadyAccount: "Already have an account? Sign In",
       noAccount: "Don't have an account? Sign Up"
     },
     fr: {
       welcome: "Bienvenue sur ItinaryMe",
       catchPhrase: "Votre voyage personnalisé commence ici.",
       description1: "ItinaryMe est une application de voyage conçue pour centraliser la planification et la réservation de vos voyages. Notre objectif est de fournir des recommandations de voyage personnalisées et une planification sur mesure, vous offrant la possibilité de personnaliser vos vols, hôtels et activités, tout en simplifiant le processus de paiement.",
       description2: "ItinaryMe est une application de voyage conçue pour centraliser la planification et la réservation de vos voyages. Notre objectif est de fournir des recommandations de voyage personnalisées et une planification sur mesure, vous offrant la possibilité de personnaliser vos vols, hôtels et activités, tout en simplifiant le processus de paiement.",
       newDocument: "Nouveau Document",
       newPlanning: "Nouvelle Planification",
       planTrip: "Planifier un Voyage",
       loginMessage: "Veuillez vous connecter pour voir les tâches.",
       account: "Compte",
       createAccount: "Créer un compte",
       signIn: "Se Connecter",
       signUp: "S'inscrire",
       loginToAccount: "Connectez-vous à votre compte",
       alreadyAccount: "Vous avez déjà un compte? Se Connecter",
       noAccount: "Vous n'avez pas de compte? S'inscrire"
     }
   };
 
   const t = translations[language as keyof typeof translations];
 

   return (
     <div className="flex flex-col h-screen bg-background">
       <header className="bg-secondary p-4 flex justify-between items-center">
         <Select value={language} onValueChange={setLanguage}>
           <SelectTrigger className="w-[120px]">
             <SelectValue placeholder="Select a language" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="en">English</SelectItem>
             <SelectItem value="fr">Français</SelectItem>
           </SelectContent>
         </Select>
         {user ? (
           <div className="flex items-center space-x-4">
             <Button onClick={handleSignOut} variant="secondary">Sign Out</Button>
           </div>
         ) : (
           <Dialog open={open} onOpenChange={setOpen}>
             <DialogTrigger asChild>
               <Button variant="secondary">{t.account}</Button>
             </DialogTrigger>
             <DialogContent className="sm:max-w-[425px]">
               <DialogHeader>
                 <DialogTitle>{isSignUp ? t.createAccount : t.signIn}</DialogTitle>
                 <DialogDescription>
                   {isSignUp ? t.createAccount : t.loginToAccount}
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
                   <Button type="submit" variant="primary">{isSignUp ? t.signUp : t.signIn}</Button>
                 </form>
                 <Button variant="outline" onClick={handleGoogleSignIn}>
                   <Icons.google className="mr-2 h-4 w-4" />
                   Sign In with Google
                 </Button>
                 <Button variant="link" onClick={() => setIsSignUp(!isSignUp)}>
                   {isSignUp ? t.alreadyAccount : t.noAccount}
                 </Button>
               </CardContent>
             </DialogContent>
           </Dialog>
         )}
       </header>
 
       <div className="flex flex-col flex-1 p-6 items-center">
         <div className="w-full max-w-2xl">
           {!user ? (
             <div className="text-center">
               <h1 className="text-3xl font-bold mb-4">{t.welcome}</h1>
               <p className="text-xl italic text-muted-foreground mb-4">{t.catchPhrase}</p>
               <p className="text-lg mb-4">
                  {t.description1}
               </p>
             </div>
           ) : (
             <div className="w-full max-w-md">
               <div className="flex space-x-4 mb-4">
                 <Button onClick={() => setActiveTask('document')}>
                   {t.newDocument}
                 </Button>
                 <Button onClick={() => setActiveTask('planning')}>
                   {t.newPlanning}
                 </Button>
                 <Button onClick={() => setActiveTask('travel')}>{t.planTrip}</Button>
               </div>
               <div className="flex-1">{renderTaskContent()}</div>
             </div>
           )}
+        {/* Pricing Section */}
+        <div className="w-full max-w-2xl mt-8">
+          <h2 className="text-2xl font-semibold mb-4 text-center">
+            {t.welcome}
+          </h2>
+          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
+            {/* Custom Trip Planning */}
+            <Card>
+              <CardHeader>
+                <CardTitle>Personalized Trip</CardTitle>
+                <CardDescription>
+                  Crafted just for you by our AI
+                </CardDescription>
+              </CardHeader>
+              <CardContent>
+                <p className="text-lg font-semibold">One-time Fee</p>
+                <p className="text-3xl font-bold">$49</p>
+                <p className="text-sm mt-2">
+                  Get a fully customized itinerary with flights, hotels, and
+                  activities tailored to your preferences.
+                </p>
+              </CardContent>
+            </Card>
+
+            {/* Affordable Recommendations */}
+            <Card>
+              <CardHeader>
+                <CardTitle>Affordable Options</CardTitle>
+                <CardDescription>
+                  Hand-picked deals to fit your budget
+                </CardDescription>
+              </CardHeader>
+              <CardContent>
+                <p className="text-lg font-semibold">Always Fair Pricing</p>
+                <p className="text-3xl font-bold">Guaranteed</p>
+                <p className="text-sm mt-2">
+                  We ensure the best prices by comparing thousands of options,
+                  saving you time and money on your dream vacation.
+                </p>
+              </CardContent>
+            </Card>
+
+            {/* Centralized Payment */}
+            <Card>
+              <CardHeader>
+                <CardTitle>One-Click Payment</CardTitle>
+                <CardDescription>
+                  Secure and simple booking process
+                </CardDescription>
+              </CardHeader>
+              <CardContent>
+                <p className="text-lg font-semibold">All-Inclusive</p>
+                <p className="text-3xl font-bold">Easy Checkout</p>
+                <p className="text-sm mt-2">
+                  Enjoy a seamless booking experience with a single, secure
+                  payment for your entire trip itinerary.
+                </p>
+              </CardContent>
+            </Card>
+          </div>
+        </div>
         </div>
       </div>
     </div>
+  );
+}
+