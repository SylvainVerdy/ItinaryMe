"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plane, Hotel, UtensilsCrossed } from "lucide-react";
import { format } from "date-fns";
import ClientOnly from './ClientOnly';

// Type pour les résultats de recherche
type SearchResult = {
  success: boolean;
  result: string;
  error?: string;
};

export default function TravelSearch() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("flights");
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  
  // États pour la recherche de vols
  const [flightOrigin, setFlightOrigin] = useState("");
  const [flightDestination, setFlightDestination] = useState("");
  const [flightDate, setFlightDate] = useState("");
  const [flightPassengers, setFlightPassengers] = useState("1");
  
  // États pour la recherche d'hôtels
  const [hotelLocation, setHotelLocation] = useState("");
  const [hotelCheckIn, setHotelCheckIn] = useState("");
  const [hotelCheckOut, setHotelCheckOut] = useState("");
  const [hotelPersons, setHotelPersons] = useState("2");
  const [hotelPriceRange, setHotelPriceRange] = useState("");
  
  // États pour la recherche de restaurants
  const [restaurantLocation, setRestaurantLocation] = useState("");
  const [restaurantCuisine, setRestaurantCuisine] = useState("");
  const [restaurantPriceRange, setRestaurantPriceRange] = useState("");
  const [restaurantRating, setRestaurantRating] = useState("");
  
  // Fonction pour effectuer la recherche
  const handleSearch = async () => {
    setIsLoading(true);
    setSearchResult(null);
    
    try {
      let searchType = activeTab;
      let params = {};
      
      // Préparation des paramètres selon le type de recherche
      switch (activeTab) {
        case "flights":
          if (!flightOrigin || !flightDestination) {
            toast({
              title: "Champs requis",
              description: "Veuillez renseigner l'origine et la destination",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
          params = {
            origin: flightOrigin,
            destination: flightDestination,
            date: flightDate || undefined,
            passengers: parseInt(flightPassengers) || 1
          };
          break;
          
        case "hotels":
          if (!hotelLocation) {
            toast({
              title: "Champ requis",
              description: "Veuillez renseigner la destination",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
          params = {
            location: hotelLocation,
            checkIn: hotelCheckIn || undefined,
            checkOut: hotelCheckOut || undefined,
            persons: parseInt(hotelPersons) || 2,
            priceRange: hotelPriceRange || undefined
          };
          break;
          
        case "restaurants":
          if (!restaurantLocation) {
            toast({
              title: "Champ requis",
              description: "Veuillez renseigner la localisation",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
          params = {
            location: restaurantLocation,
            cuisine: restaurantCuisine || undefined,
            priceRange: restaurantPriceRange || undefined,
            rating: restaurantRating ? parseFloat(restaurantRating) : undefined
          };
          break;
      }
      
      // Appel à l'API de recherche
      const response = await fetch('/api/travel-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchType,
          params
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue lors de la recherche');
      }
      
      setSearchResult(data);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Formater le texte du résultat pour l'affichage avec mise en forme
  const formatResultText = (text: string) => {
    // Divise le texte en paragraphes
    const paragraphs = text.split('\n\n');
    
    return (
      <>
        {paragraphs.map((paragraph, i) => {
          // Vérifie s'il s'agit d'un titre (commence par un chiffre suivi d'un point)
          if (/^\d+\./.test(paragraph.trim())) {
            return <h3 key={i} className="font-medium text-lg mt-4 mb-2">{paragraph}</h3>;
          }
          
          // Vérifie s'il s'agit d'une liste (lignes commençant par - ou *)
          if (paragraph.includes('\n') && (paragraph.includes('- ') || paragraph.includes('* '))) {
            const lines = paragraph.split('\n');
            return (
              <ul key={i} className="list-disc pl-5 my-2">
                {lines.map((line, j) => {
                  if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                    return <li key={j}>{line.replace(/^[- *]+\s/, '')}</li>;
                  }
                  return <p key={j} className="my-1">{line}</p>;
                })}
              </ul>
            );
          }
          
          // Paragraphe normal
          return <p key={i} className="my-2">{paragraph}</p>;
        })}
      </>
    );
  };
  
  return (
    <ClientOnly>
      <div className="w-full max-w-4xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="flights" className="flex items-center gap-2">
              <Plane size={16} /> Vols
            </TabsTrigger>
            <TabsTrigger value="hotels" className="flex items-center gap-2">
              <Hotel size={16} /> Hôtels
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="flex items-center gap-2">
              <UtensilsCrossed size={16} /> Restaurants
            </TabsTrigger>
          </TabsList>
          
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === "flights" && "Recherche de vols"}
                {activeTab === "hotels" && "Recherche d'hôtels"}
                {activeTab === "restaurants" && "Recherche de restaurants"}
              </CardTitle>
              <CardDescription>
                {activeTab === "flights" && "Trouvez les meilleurs prix pour vos billets d'avion"}
                {activeTab === "hotels" && "Découvrez les hébergements disponibles à votre destination"}
                {activeTab === "restaurants" && "Explorez les restaurants à votre destination"}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <TabsContent value="flights" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="origin">Ville de départ</Label>
                    <Input 
                      id="origin" 
                      placeholder="Paris" 
                      value={flightOrigin}
                      onChange={(e) => setFlightOrigin(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destination">Ville d'arrivée</Label>
                    <Input 
                      id="destination" 
                      placeholder="New York" 
                      value={flightDestination}
                      onChange={(e) => setFlightDestination(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date du vol</Label>
                    <Input 
                      id="date" 
                      type="date"
                      value={flightDate}
                      onChange={(e) => setFlightDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passengers">Nombre de passagers</Label>
                    <Select value={flightPassengers} onValueChange={setFlightPassengers}>
                      <SelectTrigger id="passengers">
                        <SelectValue placeholder="Nombre de passagers" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {num > 1 ? 'passagers' : 'passager'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="hotels" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hotel-location">Destination</Label>
                  <Input 
                    id="hotel-location" 
                    placeholder="Paris" 
                    value={hotelLocation}
                    onChange={(e) => setHotelLocation(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="check-in">Date d'arrivée</Label>
                    <Input 
                      id="check-in" 
                      type="date"
                      value={hotelCheckIn}
                      onChange={(e) => setHotelCheckIn(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="check-out">Date de départ</Label>
                    <Input 
                      id="check-out" 
                      type="date"
                      value={hotelCheckOut}
                      onChange={(e) => setHotelCheckOut(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hotel-persons">Nombre de personnes</Label>
                    <Select value={hotelPersons} onValueChange={setHotelPersons}>
                      <SelectTrigger id="hotel-persons">
                        <SelectValue placeholder="Nombre de personnes" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {num > 1 ? 'personnes' : 'personne'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price-range">Gamme de prix</Label>
                    <Select value={hotelPriceRange} onValueChange={setHotelPriceRange}>
                      <SelectTrigger id="price-range">
                        <SelectValue placeholder="Sélectionnez une gamme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="économique">Économique</SelectItem>
                        <SelectItem value="modéré">Modéré</SelectItem>
                        <SelectItem value="luxe">Luxe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="restaurants" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="restaurant-location">Ville ou quartier</Label>
                  <Input 
                    id="restaurant-location" 
                    placeholder="Paris" 
                    value={restaurantLocation}
                    onChange={(e) => setRestaurantLocation(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cuisine">Type de cuisine</Label>
                    <Input 
                      id="cuisine" 
                      placeholder="Italienne, Japonaise, etc." 
                      value={restaurantCuisine}
                      onChange={(e) => setRestaurantCuisine(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="restaurant-price">Gamme de prix</Label>
                    <Select value={restaurantPriceRange} onValueChange={setRestaurantPriceRange}>
                      <SelectTrigger id="restaurant-price">
                        <SelectValue placeholder="Sélectionnez une gamme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="économique">Économique</SelectItem>
                        <SelectItem value="modéré">Modéré</SelectItem>
                        <SelectItem value="luxe">Luxe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rating">Note minimale (sur 5)</Label>
                  <Select value={restaurantRating} onValueChange={setRestaurantRating}>
                    <SelectTrigger id="rating">
                      <SelectValue placeholder="Toutes les notes" />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 3.5, 4, 4.5].map((rating) => (
                        <SelectItem key={rating} value={rating.toString()}>
                          {rating} étoiles et plus
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </CardContent>
            
            <CardFooter className="flex justify-end">
              <Button 
                onClick={handleSearch} 
                disabled={isLoading}
                className="w-full md:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recherche en cours...
                  </>
                ) : (
                  "Rechercher"
                )}
              </Button>
            </CardFooter>
          </Card>
        </Tabs>
        
        {searchResult && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Résultats de recherche</CardTitle>
                <CardDescription>
                  {activeTab === "flights" && `Vol de ${flightOrigin} à ${flightDestination}`}
                  {activeTab === "hotels" && `Hébergements à ${hotelLocation}`}
                  {activeTab === "restaurants" && `Restaurants à ${restaurantLocation}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  {searchResult.result ? (
                    formatResultText(searchResult.result)
                  ) : (
                    <p className="text-gray-500">Aucun résultat trouvé</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ClientOnly>
  );
} 