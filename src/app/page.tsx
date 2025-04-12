"use client";

import { ChatInterface } from "@/components/ChatInterface";
import {ItinaryMeLogo} from "@/components/icons"
import {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from "@/components/ui/textarea";
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
} from "firebase/auth";
import { auth } from "@/lib/firebase"; // Assuming you have a firebase.ts file
import { Label } from "@/components/ui/label";
import {
  CustomIcon,
  FrenchFlagIcon,
  ExpertIcon,
  SeamlessIcon,
  ArrowRightIcon,
  WorldIcon,
  EnglishFlagIcon,
  USFlagIcon,
  UKFlagIcon,
} from "@/components/icons";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker"
import Cookies from "js-cookie";

type TaskType = "document" | "planning" | "travel";

const formSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof formSchema>;

export default function Home() {
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
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
  });
  return () => unsubscribe();
}, []);

useEffect(() => {
  const detectLanguage = async () => {
    // Here you would typically use an IP-based geolocation service
    // For this example, we'll simulate it.
    const detectedCountry = "US"; // Replace with actual API call

    const languageMap: { [key: string]: string } = {
      US: "en",
      GB: "en",
      FR: "fr",
      // Add more mappings as needed
    };

    const detectedLanguage = languageMap[detectedCountry] || "en";
    console.log(`Detected language: ${detectedLanguage}`);

    // Use cookie to store language preference
    const savedLanguage = Cookies.get("language");

    if (savedLanguage) {
      setLanguage(savedLanguage);
    } else {
      setLanguage(detectedLanguage);
      Cookies.set("language", detectedLanguage, { expires: 365 });
    }
  };

  detectLanguage();
}, []);

const changeLanguage = (newLanguage: string) => {
  setLanguage(newLanguage);
  Cookies.set("language", newLanguage, { expires: 365 });
};

  const handleSignUp = async (data: FormData) => {
    try {
      await createUserWithEmailAndPassword(auth, data.email, data.password);
      alert("Signup successful!");
      setOpen(false); // Close the dialog after successful signup
    } catch (error: any) {
      alert(`Signup failed: ${error.message}`);
    }
  };

  const handleSignIn = async (data: FormData) => {
    try {
      await signInWithEmailAndPassword(auth,data.email, data.password);
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
       alreadyAccount: "Already have an account? Sign In",noAccount: "Don't have an account? Sign Up",
       destinations: "Destinations",
       howItWorks: "How It Works",
       about: "About",
       signIn:"Sign In",
       personalizedTrip: "Your personalized trip, designed for you",
      personalizedTripDescription: "Tailoired itineraries to match your unique interests, preferences, and travel style.",
      whereDoYouWantToGo: "Where do you want to go?",
      date: "When?",
      howLong: "How long?", 
       getStarted: "Get Started",
       customizedItineraries: "Customized Itineraries",
       customizedItinerariesDescription: "Receive a day-by-day itinerary crafted to your interests and preferences.",expertPlanning: "Expert Planning",
       expertPlanningDescription: "Our travel specialists use their knowledge to create your perfect trip.",seamlessExperience: "Seamless Experience",
       seamlessExperienceDescription: "Enjoy a hassle-free journey with bookings and details arranged for you.",
      howLongPlaceholder: "e.g., 7 days",
     },

     fr: {
       welcome: "Bienvenue sur ItinaryMe",
       catchPhrase: "Votre voyage personnalisé commence ici.",
       description1: "ItinaryMe est une application de voyage conçue pour centraliser la planification et la réservation de vos voyages. Notre objectif est de fournir des recommandations de voyage personnalisées et une planification sur mesure, vous offrant la possibilité de personnaliser vos vols, hôtels et activités, tout en simplifiant le processus de paiement.",
       description2: "ItinaryMe est une application de voyage conçue pour centraliser la planification et la réservation de vos voyages. Notre objectif est de fournir des recommandations de voyage personnalisées et une planification sur mesure, vous offrant la possibilité de personnaliser vos vols, hôtels et activités, tout en simplifiant le processus de paiement.",
       newDocument: "Nouveau Document",
       newPlanning: "Nouvelle Planification",destinations: "Destinations",
       howItWorks: "Fonctionnement",
       about: "A propos",
       signIn:"Se Connecter",
       personalizedTrip: "Votre voyage personnalisé, conçu pour vous",
       personalizedTripDescription: "Itinéraires personnalisés pour correspondre à vos intérêts, préférences et style de voyage uniques.",
      whereDoYouWantToGo: "Où voulez-vous aller ?",
      date: "Quand ?",
      howLong: "Combien de temps ?",
       getStarted: "Commencer",
       howLongPlaceholder: "e.g., 7 jours",
       customizedItineraries: "Itinéraires personnalisés",customizedItinerariesDescription: "Recevez un itinéraire au jour le jour adapté à vos intérêts et préférences.",expertPlanning: "Planification experte",
       expertPlanningDescription: "Nos spécialistes du voyage utilisent leurs connaissances pour créer votre voyage parfait.",seamlessExperience: "Expérience fluide",
       seamlessExperienceDescription: "Profitez d'un voyage sans tracas avec les réservations et les détails organisés pour vous.",
       planTrip: "Planifier un Voyage",

       loginMessage: "Veuillez vous connecter pour voir les tâches.",
       account: "Compte",
       createAccount: "Créer un compte",
       signIn: "Se Connecter",
       signUp: "S'inscrire",
       loginToAccount: "Connectez-vous à votre compte",
       alreadyAccount: "Vous avez déjà un compte? Se Connecter",noAccount: "Vous n'avez pas de compte? S'inscrire"
     }
   }
  const t = translations[language as keyof typeof translations];

    return (
      
        {/* Navigation bar */}
        <nav className="fixed top-0 left-0 w-full z-10 bg-transparent p-4">
          
            {/* Logo */}
            <a href="#" className="flex items-center text-3xl font-bold font-serif">
              ItinaryMe
            </a>

            {/* Navigation Links */}
            <ul className="flex space-x-6">
              <li><a href="#" className="text-white hover:text-gray-200">{t.destinations}</a></li>
              <li><a href="#" className="text-white hover:text-gray-200">{t.howItWorks}</a></li>
              <li><a href="#" className="text-white hover:text-gray-200">{t.about}</a></li>
            </ul>

           {/* Language Selector and Account */}
           
              
                
                  
                  
                  
                  
                  
                
              

            

              
                <button onClick={() => changeLanguage("en")}>
                  <USFlagIcon className="w-6 h-6" />
                </button>
                <button onClick={() => changeLanguage("fr")}>
                  <FrenchFlagIcon className="w-6 h-6" />
                </button>
                <button onClick={() => changeLanguage("uk")}>
                  <UKFlagIcon className="w-6 h-6" />
                </button>
              

              {/* Account */}
            {user ? (
              
                <span className="text-sm">Welcome, {user.email}</span>
                <Button variant="secondary" onClick={handleSignOut}>
                  Sign Out
                </Button>
              
            ) : (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">{t.account}</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {isSignUp ? t.createAccount : t.loginToAccount}
                    </DialogTitle>
                    <DialogDescription>
                      {isSignUp ? t.noAccount : t.alreadyAccount}
                      <Button
                        variant="link"
                        onClick={() => {setIsSignUp(!isSignUp)}}
                      >
                        {isSignUp ? t.signIn : t.signUp}
                      </Button>
                    </DialogDescription>
                  </DialogHeader>
                  <form 
                    onSubmit={handleSubmit(isSignUp ? handleSignUp : handleSignIn)}
                    className="space-y-4"
                  >
                    
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        placeholder="Email"
                        type="email"
                        {...register("email")}
                      />
                      {errors.email && (
                        
                          {errors.email.message}
                        
                      )}
                    
                    
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        placeholder="Password"
                        type="password"
                        {...register("password")}
                      />
                      {errors.password && (
                        
                          {errors.password.message}
                        
                      )}
                    
                    <Button type="submit">
                      {isSignUp ? t.signUp : t.signIn}
                    </Button>
                  </form>
                  
                    
                      
                    
                    
                      Or continue with
                    
                  
                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleGoogleSignIn}
                    >
                    Sign In with Google
                  </Button>
                </DialogContent>
              </Dialog>
            )}
            
          
        </nav>

        {/* Hero section */}
        
          
          
            
              {t.personalizedTrip}
            
            
              {t.personalizedTripDescription}
            
            
              
               <Input
                type="text"
                placeholder={t.whereDoYouWantToGo}
                className="w-64 rounded-none focus-visible:ring-0 text-black"
                />
               
                
                
                  
                

                  
                

                
                  
                

                <Button className="rounded-none bg-teal-500 text-white hover:bg-teal-600">
                  
                </Button>
              
            
          
        

        {/* Features section */}
        
          
            
              
                
                  {t.customizedItineraries}
                
                
                  {t.customizedItinerariesDescription}
                
              
              
                
                  {t.expertPlanning}
                
                
                  {t.expertPlanningDescription}
                
              
              
                
                  {t.seamlessExperience}
                
                
                  {t.seamlessExperienceDescription}
                
              
            
          
        
      
    );
  }
