"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast, toast } from "@/hooks/use-toast";
import ClientOnly from "./ClientOnly";
import { doc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FlightSearchResult, HotelSearchResult, RestaurantSearchResult, SearchResult } from "@/types/search";
import { SerpApiService } from "@/services/serpApiService";
import { DatePicker } from "./ui/date-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

interface TravelSearchProps {
  travelId?: string;
  destination?: string;
}

// Composant DatePicker personnalisé pour éviter l'erreur de linter
interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  placeholder?: string;
}

function DatePickerComponent({ date, setDate, placeholder = "Sélectionner une date" }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export default function TravelSearch({ travelId, destination }: TravelSearchProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("flights");
  
  // États pour les formulaires de recherche
  const [flightOrigin, setFlightOrigin] = useState(destination ? "" : "Paris");
  const [flightDestination, setFlightDestination] = useState(destination || "");
  const [flightDate, setFlightDate] = useState<Date | undefined>(undefined);
  const [flightReturnDate, setFlightReturnDate] = useState<Date | undefined>(undefined);
  const [flightPassengers, setFlightPassengers] = useState(1);
  
  const [hotelLocation, setHotelLocation] = useState(destination || "");
  const [hotelCheckIn, setHotelCheckIn] = useState<Date | undefined>(undefined);
  const [hotelCheckOut, setHotelCheckOut] = useState<Date | undefined>(undefined);
  const [hotelGuests, setHotelGuests] = useState(2);
  const [hotelRooms, setHotelRooms] = useState(1);
  
  const [restaurantLocation, setRestaurantLocation] = useState(destination || "");
  const [restaurantCuisine, setRestaurantCuisine] = useState("");
  const [restaurantPriceRange, setRestaurantPriceRange] = useState("");
  
  // État pour les résultats de recherche
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fonction de recherche générique
  const handleSearch = async () => {
    if (!activeTab) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let result: SearchResult | null = null;
      
      if (activeTab === "flights") {
        if (!flightOrigin || !flightDestination || !flightDate) {
          throw new Error("Veuillez remplir tous les champs obligatoires");
        }
        
        // Formatage de la date pour l'API
        const dateStr = flightDate.toISOString().split('T')[0];
        const returnDateStr = flightReturnDate ? flightReturnDate.toISOString().split('T')[0] : undefined;
        
        result = await SerpApiService.searchFlights(
          flightOrigin,
          flightDestination,
          dateStr,
          returnDateStr,
          flightPassengers
        );
      } else if (activeTab === "hotels") {
        if (!hotelLocation || !hotelCheckIn || !hotelCheckOut) {
          throw new Error("Veuillez remplir tous les champs obligatoires");
        }
        
        // Formatage des dates pour l'API
        const checkInStr = hotelCheckIn.toISOString().split('T')[0];
        const checkOutStr = hotelCheckOut.toISOString().split('T')[0];
        
        result = await SerpApiService.searchHotels(
          hotelLocation,
          checkInStr,
          checkOutStr,
          hotelGuests
        );
      } else if (activeTab === "restaurants") {
        if (!restaurantLocation) {
          throw new Error("Veuillez spécifier une localisation");
        }
        
        result = await SerpApiService.searchRestaurants(
          restaurantLocation,
          restaurantCuisine,
          restaurantPriceRange
        );
      }
      
      if (result) {
        setSearchResult(result);
        
        // Sauvegarder la recherche dans le document de voyage si un ID est fourni
        if (travelId) {
          try {
            const travelRef = doc(db, "travels", travelId);
            await updateDoc(travelRef, {
              links: arrayUnion({
                title: activeTab === "flights" 
                  ? `Vol: ${flightOrigin} → ${flightDestination}`
                  : activeTab === "hotels"
                    ? `Hôtels à ${hotelLocation}`
                    : `Restaurants à ${restaurantLocation}`,
                description: activeTab === "flights"
                  ? `Options de vol pour ${flightOrigin} vers ${flightDestination}${flightDate ? ` le ${format(flightDate, 'PP')}` : ''}`
                  : activeTab === "hotels"
                    ? `Options d'hébergement à ${hotelLocation}${hotelCheckIn ? ` du ${format(hotelCheckIn, 'PP')}` : ''}${hotelCheckOut ? ` au ${format(hotelCheckOut, 'PP')}` : ''}`
                    : `Options de restauration à ${restaurantLocation}${restaurantCuisine ? ` (${restaurantCuisine})` : ''}`,
                url: '#', // URL interne
                type: activeTab,
                data: result,
                createdAt: Timestamp.now()
              })
            });
            
            toast({
              title: "Recherche sauvegardée",
              description: "Les résultats de recherche ont été ajoutés aux liens de votre voyage.",
              variant: "default",
            });
          } catch (error) {
            console.error("Erreur lors de la sauvegarde des résultats:", error);
            setError("Impossible de sauvegarder la recherche dans le document de voyage");
          }
        }
      } else {
        setError("Aucun résultat trouvé. Veuillez affiner votre recherche.");
      }
    } catch (error: any) {
      console.error("Erreur de recherche:", error);
      setError(error.message || "Une erreur s'est produite pendant la recherche");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Formatage des résultats de recherche
  const formatSearchResults = () => {
    if (!searchResult) return null;

    if (activeTab === "flights") {
      const flightResult = searchResult as FlightSearchResult;
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-700">
              Vols de {flightResult.origin} à {flightResult.destination}
              {flightResult.date && ` - ${flightResult.date}`}
            </h3>
          </div>
          
          {flightResult.options.length === 0 ? (
            <p className="text-gray-500 italic">Aucun vol trouvé pour cette recherche.</p>
          ) : (
            <div className="space-y-3">
              {flightResult.options.map((flight, index) => (
                <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{flight.airline}</span>
                    <span className="text-green-600 font-medium">{flight.price}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <div>
                      <div className="text-gray-600">Départ: {flight.departureTime || 'N/A'}</div>
                      <div className="text-gray-600">Arrivée: {flight.arrivalTime || 'N/A'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-600">Durée: {flight.duration || 'N/A'}</div>
                      {flight.stops !== undefined && (
                        <div className="text-gray-600">
                          {flight.stops === 0 ? "Direct" : `${flight.stops} escale${flight.stops > 1 ? 's' : ''}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex flex-col space-y-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          if (flight.id) {
                            // Importer SavedItemsService depuis '@/lib/savedItems'
                            const { SavedItemsService } = require('@/lib/savedItems');
                            SavedItemsService.saveFlight({
                              id: flight.id,
                              origin: flightResult.origin,
                              destination: flightResult.destination,
                              airline: flight.airline,
                              price: flight.price,
                              departureTime: flight.departureTime,
                              arrivalTime: flight.arrivalTime,
                              date: flightResult.date,
                              flightType: flight.flightType,
                              link: flight.link
                            });
                            toast({
                              title: "Vol sauvegardé",
                              description: "Ce vol a été ajouté à vos favoris.",
                              variant: "default",
                            });
                          }
                        }}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        Sauvegarder
                      </Button>
                      
                      <a 
                        href={flight.link || "#"}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Voir les détails du vol
                      </a>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 truncate">
                    {flight.link && flight.link !== "#" && (
                      <span title={flight.link}>URL: {flight.link.substring(0, 50)}{flight.link.length > 50 ? "..." : ""}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    if (activeTab === "hotels") {
      const hotelResult = searchResult as HotelSearchResult;
      return (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-700">
              Hôtels à {hotelResult.location}
              {hotelResult.dates?.checkIn && hotelResult.dates?.checkOut && 
                ` - Du ${hotelResult.dates.checkIn} au ${hotelResult.dates.checkOut}`}
            </h3>
          </div>
          
          {hotelResult.options.length === 0 ? (
            <p className="text-gray-500 italic">Aucun hôtel trouvé pour cette recherche.</p>
          ) : (
            <div className="space-y-3">
              {hotelResult.options.map((hotel, index) => (
                <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{hotel.name}</h4>
                      {hotel.address && <p className="text-sm text-gray-600">{hotel.address}</p>}
                    </div>
                    <div className="text-right">
                      <div className="text-green-600 font-medium">{hotel.price}</div>
                      {hotel.rating && <div className="text-yellow-500">{hotel.rating}</div>}
                    </div>
                  </div>
                  {hotel.amenities && hotel.amenities.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Équipements:</p>
                      <div className="flex flex-wrap gap-1">
                        {hotel.amenities.slice(0, 5).map((amenity, i) => (
                          <span key={i} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                            {amenity}
                          </span>
                        ))}
                        {hotel.amenities.length > 5 && (
                          <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                            +{hotel.amenities.length - 5} autres
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="mt-3 flex justify-between items-center">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        if (hotel.id) {
                          // Importer SavedItemsService depuis '@/lib/savedItems'
                          const { SavedItemsService } = require('@/lib/savedItems');
                          SavedItemsService.saveHotel({
                            id: hotel.id,
                            name: hotel.name,
                            location: hotelResult.location,
                            price: hotel.price,
                            rating: hotel.rating,
                            checkIn: hotelResult.dates?.checkIn,
                            checkOut: hotelResult.dates?.checkOut,
                            imageUrl: hotel.imageUrl,
                            link: hotel.link
                          });
                          toast({
                            title: "Hôtel sauvegardé",
                            description: "Cet hôtel a été ajouté à vos favoris.",
                            variant: "default",
                          });
                        }
                      }}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      Sauvegarder
                    </Button>
                    {hotel.link && hotel.link !== "#" && (
                      <a 
                        href={hotel.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        Voir l'hôtel
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    if (activeTab === "restaurants") {
      const restaurantResult = searchResult as RestaurantSearchResult;
      return (
        <div className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium text-purple-700">
              Restaurants à {restaurantResult.location}
              {restaurantResult.cuisine && ` - Cuisine ${restaurantResult.cuisine}`}
            </h3>
          </div>
          
          {restaurantResult.options.length === 0 ? (
            <p className="text-gray-500 italic">Aucun restaurant trouvé pour cette recherche.</p>
          ) : (
            <div className="space-y-3">
              {restaurantResult.options.map((restaurant, index) => (
                <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{restaurant.name}</h4>
                      {restaurant.cuisine && <p className="text-sm text-gray-600">Cuisine: {restaurant.cuisine}</p>}
                      {restaurant.address && <p className="text-sm text-gray-600">{restaurant.address}</p>}
                    </div>
                    <div className="text-right">
                      {restaurant.priceRange && <div className="text-gray-600">{restaurant.priceRange}</div>}
                      {restaurant.rating && <div className="text-yellow-500">{restaurant.rating}</div>}
                    </div>
                  </div>
                  {restaurant.openingHours && (
                    <div className="mt-2 text-sm text-gray-500">
                      Horaires: {restaurant.openingHours}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    // Si le type n'est pas reconnu, on affiche les données brutes
    return (
      <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
        {JSON.stringify(searchResult, null, 2)}
      </pre>
    );
  };
  
  return (
    <ClientOnly>
      <div className="w-full max-w-4xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="flights">Vols</TabsTrigger>
            <TabsTrigger value="hotels">Hôtels</TabsTrigger>
            <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
          </TabsList>
          
          <TabsContent value="flights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recherche de vols</CardTitle>
                <CardDescription>Trouvez les meilleurs vols pour votre voyage.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="flightOrigin">Départ de</Label>
                    <Input id="flightOrigin" value={flightOrigin} onChange={(e) => setFlightOrigin(e.target.value)} placeholder="Ville ou aéroport" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="flightDestination">Destination</Label>
                    <Input id="flightDestination" value={flightDestination} onChange={(e) => setFlightDestination(e.target.value)} placeholder="Ville ou aéroport" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date de départ</Label>
                    <DatePickerComponent date={flightDate} setDate={setFlightDate} placeholder="Sélectionner date de départ" />
                  </div>
                  <div className="space-y-2">
                    <Label>Date de retour (optionnel)</Label>
                    <DatePickerComponent date={flightReturnDate} setDate={setFlightReturnDate} placeholder="Sélectionner date de retour" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nombre de passagers: {flightPassengers}</Label>
                  <Slider
                    defaultValue={[flightPassengers]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={(value) => setFlightPassengers(value[0])}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSearch} disabled={isLoading}>
                  {isLoading ? 'Recherche en cours...' : 'Rechercher'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="hotels" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recherche d'hôtels</CardTitle>
                <CardDescription>Trouvez l'hébergement idéal pour votre séjour.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hotelLocation">Destination</Label>
                  <Input id="hotelLocation" value={hotelLocation} onChange={(e) => setHotelLocation(e.target.value)} placeholder="Ville ou région" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date d'arrivée</Label>
                    <DatePickerComponent date={hotelCheckIn} setDate={setHotelCheckIn} placeholder="Sélectionner date d'arrivée" />
                  </div>
                  <div className="space-y-2">
                    <Label>Date de départ</Label>
                    <DatePickerComponent date={hotelCheckOut} setDate={setHotelCheckOut} placeholder="Sélectionner date de départ" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre de voyageurs: {hotelGuests}</Label>
                    <Slider
                      defaultValue={[hotelGuests]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(value) => setHotelGuests(value[0])}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre de chambres: {hotelRooms}</Label>
                    <Slider
                      defaultValue={[hotelRooms]}
                      min={1}
                      max={5}
                      step={1}
                      onValueChange={(value) => setHotelRooms(value[0])}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSearch} disabled={isLoading}>
                  {isLoading ? 'Recherche en cours...' : 'Rechercher'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="restaurants" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recherche de restaurants</CardTitle>
                <CardDescription>Découvrez les meilleurs endroits où manger.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="restaurantLocation">Localisation</Label>
                  <Input id="restaurantLocation" value={restaurantLocation} onChange={(e) => setRestaurantLocation(e.target.value)} placeholder="Ville ou quartier" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restaurantCuisine">Type de cuisine (optionnel)</Label>
                  <Select value={restaurantCuisine} onValueChange={setRestaurantCuisine}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un type de cuisine" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Toutes les cuisines</SelectItem>
                      <SelectItem value="française">Française</SelectItem>
                      <SelectItem value="italienne">Italienne</SelectItem>
                      <SelectItem value="japonaise">Japonaise</SelectItem>
                      <SelectItem value="indienne">Indienne</SelectItem>
                      <SelectItem value="mexicaine">Mexicaine</SelectItem>
                      <SelectItem value="chinoise">Chinoise</SelectItem>
                      <SelectItem value="végétarienne">Végétarienne</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restaurantPriceRange">Gamme de prix (optionnel)</Label>
                  <Select value={restaurantPriceRange} onValueChange={setRestaurantPriceRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une gamme de prix" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les prix</SelectItem>
                      <SelectItem value="€">€ (Économique)</SelectItem>
                      <SelectItem value="€€">€€ (Modéré)</SelectItem>
                      <SelectItem value="€€€">€€€ (Cher)</SelectItem>
                      <SelectItem value="€€€€">€€€€ (Très cher)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSearch} disabled={isLoading}>
                  {isLoading ? 'Recherche en cours...' : 'Rechercher'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
            {error}
          </div>
        )}
        
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
                {formatSearchResults()}
              </CardContent>
              {travelId && (
                <CardFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => toast({
                      title: "Déjà sauvegardé",
                      description: "Ces résultats de recherche ont déjà été ajoutés aux liens de votre voyage.",
                      variant: "default",
                    })}
                  >
                    Sauvegardé dans les liens
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>
        )}
      </div>
    </ClientOnly>
  );
} 