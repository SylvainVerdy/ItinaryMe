"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import ClientOnly from "./ClientOnly";
import { doc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FlightSearchResult, HotelSearchResult, RestaurantSearchResult, SearchResult } from "@/types/search";

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
    setIsLoading(true);
    setError(null);
    
    try {
      let params: any = {};
      let searchType = '';
      
      if (activeTab === "flights") {
        if (!flightOrigin || !flightDestination) {
          setError("Veuillez spécifier l'origine et la destination.");
          setIsLoading(false);
          return;
        }
        
        searchType = "flights";
        params = {
          origin: flightOrigin,
          destination: flightDestination,
          date: flightDate ? flightDate.toISOString().split('T')[0] : undefined,
          returnDate: flightReturnDate ? flightReturnDate.toISOString().split('T')[0] : undefined,
          passengers: flightPassengers
        };
      } else if (activeTab === "hotels") {
        if (!hotelLocation) {
          setError("Veuillez spécifier une destination.");
          setIsLoading(false);
          return;
        }
        
        searchType = "hotels";
        params = {
          location: hotelLocation,
          checkIn: hotelCheckIn ? hotelCheckIn.toISOString().split('T')[0] : undefined,
          checkOut: hotelCheckOut ? hotelCheckOut.toISOString().split('T')[0] : undefined,
          persons: hotelGuests,
          rooms: hotelRooms
        };
      } else if (activeTab === "restaurants") {
        if (!restaurantLocation) {
          setError("Veuillez spécifier une localisation.");
          setIsLoading(false);
          return;
        }
        
        searchType = "restaurants";
        params = {
          location: restaurantLocation,
          cuisine: restaurantCuisine || undefined,
          priceRange: restaurantPriceRange || undefined
        };
      }
      
      const requestData = { searchType, params };
      console.log("Envoi de la requête:", requestData);
      
      try {
        const response = await fetch('/api/travel-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        });
        
        console.log("Statut de la réponse:", response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Impossible de lire l'erreur" }));
          console.error("Erreur détaillée:", errorData);
          throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Données reçues:", data);
        
        setSearchResult(data.result);
        
        // Si un ID de voyage est fourni, sauvegardez les résultats comme liens
        if (travelId && data.result) {
          await saveSearchResultToTravel(travelId, searchType, data.result);
        }
      } catch (fetchError) {
        console.error("Erreur pendant le fetch:", fetchError);
        throw fetchError;
      }
    } catch (err) {
      console.error('Erreur lors de la recherche:', err);
      setError("Une erreur s'est produite lors de la recherche. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour sauvegarder les résultats de recherche comme liens pour le voyage
  const saveSearchResultToTravel = async (travelId: string, type: string, result: SearchResult) => {
    try {
      let linkTitle = '';
      let linkDescription = '';
      
      if (type === 'flights') {
        const flightResult = result as FlightSearchResult;
        linkTitle = `Vol: ${flightResult.origin} → ${flightResult.destination}`;
        linkDescription = `Options de vol pour ${flightResult.origin} vers ${flightResult.destination}${flightResult.date ? ` le ${flightResult.date}` : ''}`;
      } else if (type === 'hotels') {
        const hotelResult = result as HotelSearchResult;
        linkTitle = `Hôtels à ${hotelResult.location}`;
        linkDescription = `Options d'hébergement à ${hotelResult.location}${hotelResult.dates?.checkIn ? ` du ${hotelResult.dates.checkIn}` : ''}${hotelResult.dates?.checkOut ? ` au ${hotelResult.dates.checkOut}` : ''}`;
      } else if (type === 'restaurants') {
        const restaurantResult = result as RestaurantSearchResult;
        linkTitle = `Restaurants à ${restaurantResult.location}`;
        linkDescription = `Options de restauration à ${restaurantResult.location}${restaurantCuisine ? ` (${restaurantCuisine})` : ''}`;
      }
      
      // Créer un lien dans le document de voyage
      const travelRef = doc(db, 'travels', travelId);
      await updateDoc(travelRef, {
        links: arrayUnion({
          title: linkTitle,
          description: linkDescription,
          url: '#', // URL interne
          type: type,
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