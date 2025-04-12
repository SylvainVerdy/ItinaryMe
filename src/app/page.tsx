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
import {onAuthStateChanged, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
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
     setOpen(false); // Close the dialog after successful signin
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
             <SelectValue placeholder={language === 'en' ? 'English' : 'Français'} />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="en">English</SelectItem>
             <SelectItem value="fr">Français</SelectItem>
           </SelectContent>
         </Select>
         {user ? (
           <div>
             <Button variant="secondary" onClick={handleSignOut}>Sign Out</Button>
           </div>
         ) : (
           <Dialog>
             <DialogTrigger asChild>
               <Button variant="outline">{t.account}</Button>
             </DialogTrigger>
             <DialogContent className="sm:max-w-[425px]">
               <DialogHeader>
                 <DialogTitle>{isSignUp ? t.createAccount : t.loginToAccount}</DialogTitle>
                 <DialogDescription>
                   {isSignUp ? t.noAccount : t.alreadyAccount}
                   <Button variant="link" onClick={() => setIsSignUp(!isSignUp)}>
                     {isSignUp ? t.signIn : t.signUp}
                   </Button>
                 </DialogDescription>
               </DialogHeader>
               <form onSubmit={handleSubmit(isSignUp ? handleSignUp : handleSignIn)} className="space-y-4">
                 <div className="grid gap-2">
                   <Label htmlFor="email">Email</Label>
                   <Input
                     id="email"
                     placeholder="Email"
                     type="email"
                     {...register('email')}
                   />
                   {errors.email && (
                     <p className="text-sm text-red-500">{errors.email.message}</p>
                   )}
                 </div>
                 <div className="grid gap-2">
                   <Label htmlFor="password">Password</Label>
                   <Input
                     id="password"
                     placeholder="Password"
                     type="password"
                     {...register('password')}
                   />
                   {errors.password && (
                     <p className="text-sm text-red-500">{errors.password.message}</p>
                   )}
                 </div>
                 <Button type="submit">{isSignUp ? t.signUp : t.signIn}</Button>
               </form>
               <div className="relative">
                 <div className="absolute inset-0 flex items-center">
                   <span className="w-full border-t" />
                 </div>
                 <div className="relative flex justify-center text-xs uppercase">
                   <span className="bg-background px-2 text-muted-foreground">
                     Or continue with
                   </span>
                 </div>
               </div>
               <Button variant="outline" type="button" onClick={handleGoogleSignIn}>
                 <Icons.google className="mr-2 h-4 w-4" />
                 Sign In with Google
               </Button>
             </DialogContent>
           </Dialog>
         )}
       </header>
 
       <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto lg:py-0">
         {!user ? (
           <div className="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
             <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
               <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
                 {t.welcome}
               </h1>
               <p className="text-lg text-gray-700 dark:text-gray-400">
                 {t.catchPhrase}
               </p>
               <p className="text-base text-gray-700 dark:text-gray-400">
                  {t.description1}
               </p>
             </div>
           </div>
         ) : (
           <div className="flex flex-col items-center justify-center">
             <Button onClick={() => setActiveTask('document')}>{t.newDocument}</Button>
             <Button onClick={() => setActiveTask('planning')}>{t.newPlanning}</Button>
             <Button onClick={() => setActiveTask('travel')}>{t.planTrip}</Button>
             {renderTaskContent()}
           </div>
         )}
 
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card className="bg-green-50 text-gray-800 shadow-md rounded-lg overflow-hidden flex flex-col">
            <CardHeader className="bg-green-100 p-4">
              <CardTitle className="text-lg font-semibold">{t.welcome === "Bienvenue sur ItinaryMe" ? 'Voyage personnalisé' : 'Personalized Trip'}</CardTitle>
              <CardDescription>
                {t.welcome === "Bienvenue sur ItinaryMe" ? 'Conçu juste pour vous par notre IA' : 'Crafted just for you by our AI'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-grow">
              <div className="flex items-center justify-between mb-2">
                <span>{t.welcome === "Bienvenue sur ItinaryMe" ? 'Frais unique' : 'One-time Fee'}</span>
                <span className="text-xl font-bold">{t.welcome === "Bienvenue sur ItinaryMe" ? '49€' : '$49'}</span>
              </div>
              <p className="text-sm text-gray-600">
                {t.welcome === "Bienvenue sur ItinaryMe"
                  ? 'Obtenez un itinéraire entièrement personnalisé avec les vols, hôtels et activités adaptés à vos préférences.'
                  : 'Get a fully customized itinerary with flights, hotels, and activities tailored to your preferences.'}
              </p>
            </CardContent>
          </Card>
 
          <Card className="bg-yellow-50 text-gray-800 shadow-md rounded-lg overflow-hidden flex flex-col">
            <CardHeader className="bg-yellow-100 p-4">
              <CardTitle className="text-lg font-semibold">
                {t.welcome === "Bienvenue sur ItinaryMe" ? 'Options abordables' : 'Affordable Options'}
              </CardTitle>
              <CardDescription>
                {t.welcome === "Bienvenue sur ItinaryMe" ? 'Offres triées sur le volet pour s\'adapter à votre budget' : 'Hand-picked deals to fit your budget'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-grow">
              <div className="flex items-center justify-between mb-2">
                <span>{t.welcome === "Bienvenue sur ItinaryMe" ? 'Toujours un prix juste' : 'Always Fair Pricing'}</span>
                <span className="text-green-500 font-bold">{t.welcome === "Bienvenue sur ItinaryMe" ? 'Garanti' : 'Guaranteed'}</span>
              </div>
              <p className="text-sm text-gray-600">
                {t.welcome === "Bienvenue sur ItinaryMe"
                  ? 'Nous vous assurons les meilleurs prix en comparant des milliers d\'options, vous faisant gagner du temps et de l\'argent sur le voyage de vos rêves.'
                  : 'We ensure the best prices by comparing thousands of options, saving you time and money on your dream vacation.'}
              </p>
            </CardContent>
          </Card>
 
          <Card className="bg-blue-50 text-gray-800 shadow-md rounded-lg overflow-hidden flex flex-col">
            <CardHeader className="bg-blue-100 p-4">
              <CardTitle className="text-lg font-semibold">
                {t.welcome === "Bienvenue sur ItinaryMe" ? 'Paiement en un clic' : 'One-Click Payment'}
              </CardTitle>
              <CardDescription>
                {t.welcome === "Bienvenue sur ItinaryMe" ? 'Processus de réservation sécurisé et simple' : 'Secure and simple booking process'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-grow">
              <div className="flex items-center justify-between mb-2">
                <span>{t.welcome === "Bienvenue sur ItinaryMe" ? 'Tout inclus' : 'All-Inclusive'}</span>
                <span className="text-purple-500 font-bold">{t.welcome === "Bienvenue sur ItinaryMe" ? 'Paiement facile' : 'Easy Checkout'}</span>
              </div>
              <p className="text-sm text-gray-600">
                {t.welcome === "Bienvenue sur ItinaryMe"
                  ? 'Profitez d\'une expérience de réservation fluide avec un paiement unique et sécurisé pour l\'ensemble de votre itinéraire de voyage.'
                  : 'Enjoy a seamless booking experience with a single, secure payment for your entire trip itinerary.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

