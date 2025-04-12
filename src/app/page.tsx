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
     
       
         
           
             <SelectValue placeholder="Select a language" />
           
           
             <SelectContent>
               <SelectItem value="en">English</SelectItem>
               <SelectItem value="fr">Français</SelectItem>
             </SelectContent>
           
         
         {user ? (
           
             
           
         ) : (
           <Dialog open={open} onOpenChange={setOpen}>
             
               
                 {t.account}
               
             
             
               
                 
                   {isSignUp ? t.createAccount : t.loginToAccount}
                 
               
               
                 
                   <form onSubmit={handleSubmit(isSignUp ? handleSignUp : handleSignIn)} className="space-y-4">
                     
                       
                         Email
                         
                           
                             Email
                           
                           {errors.email && (
                             
                               {errors.email.message}
                             
                           )}
                         
                       
                       
                         Password
                         
                           
                             Password
                           
                           {errors.password && (
                             
                               {errors.password.message}
                             
                           )}
                         
                       
                       
                         {isSignUp ? t.signUp : t.signIn}
                       
                     
                   
                   
                     
                       
                         Sign In with Google
                       
                     
                   
                   
                     {isSignUp ? t.alreadyAccount : t.noAccount}
                   
                 
               
             
           
         )}
       
 
       
         
           {!user ? (
             
               
                 
                   {t.welcome}
                 
                 
                   {t.catchPhrase}
                 
                 
                    {t.description1}
                 
               
             
           ) : (
             
               
                 
                   {t.newDocument}
                 
                 
                   {t.newPlanning}
                 
                 {t.planTrip}
               
               
                 {renderTaskContent()}
               
             
           )}
+        {/* Pricing Section */}
+        
+          
+            {t.welcome}
+          
+          
+            {/* Custom Trip Planning */}
+            
+              
+                Personalized Trip
+                
+                  Crafted just for you by our AI
+                
+              
+              
+                
+                  One-time Fee
+                
+                
+                  $49
+                
+                
+                  Get a fully customized itinerary with flights, hotels, and
+                  activities tailored to your preferences.
+                
+              
+            
+
+            {/* Affordable Recommendations */}
+            
+              
+                Affordable Options
+                
+                  Hand-picked deals to fit your budget
+                
+              
+              
+                
+                  Always Fair Pricing
+                
+                
+                  Guaranteed
+                
+                
+                  We ensure the best prices by comparing thousands of options,
+                  saving you time and money on your dream vacation.
+                
+              
+            
+
+            {/* Centralized Payment */}
+            
+              
+                One-Click Payment
+                
+                  Secure and simple booking process
+                
+              
+              
+                
+                  All-Inclusive
+                
+                
+                  Easy Checkout
+                
+                
+                  Enjoy a seamless booking experience with a single, secure
+                  payment for your entire trip itinerary.
+                
+              
+            
+          
+        
         
       
     
   );
}
