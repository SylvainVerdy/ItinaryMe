import { DestinationCardProps } from '@/components/DestinationCard';

// Données de démo pour les destinations
const populatedDestinations: DestinationCardProps[] = [
  {
    id: 'paris',
    name: 'Paris, France',
    imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34',
    description: "La ville de l'amour, Paris regorge de monuments emblématiques comme la Tour Eiffel, le Louvre et Notre-Dame. Découvrez l'art, la gastronomie et l'architecture unique de cette capitale européenne.",
    highlights: [
      'Tour Eiffel et Champ de Mars',
      'Musée du Louvre',
      'Cathédrale Notre-Dame',
      'Montmartre et Sacré-Cœur',
      'Croisière sur la Seine'
    ],
    bestTimeToVisit: 'Avril à Juin, Septembre à Octobre'
  },
  {
    id: 'tokyo',
    name: 'Tokyo, Japon',
    imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26',
    description: "Mélange fascinant de traditions anciennes et de technologies futuristes, Tokyo est une métropole vibrante offrant une expérience culturelle unique, une cuisine raffinée et des quartiers aux atmosphères contrastées.",
    highlights: [
      'Quartier de Shibuya et son célèbre carrefour',
      'Temple Senso-ji à Asakusa',
      "Quartier électronique d'Akihabara",
      'Tour de Tokyo et Tokyo Skytree',
      'Parc de Yoyogi et sanctuaire Meiji'
    ],
    bestTimeToVisit: 'Mars à Mai, Septembre à Novembre'
  },
  {
    id: 'new-york',
    name: 'New York, États-Unis',
    imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9',
    description: 'La ville qui ne dort jamais offre une énergie incomparable, des gratte-ciels emblématiques, des musées de classe mondiale, une scène culturelle dynamique et des quartiers diversifiés à explorer.',
    highlights: [
      'Empire State Building et Top of the Rock',
      'Central Park',
      'Statue de la Liberté et Ellis Island',
      'Times Square et Broadway',
      "Musée d'Art Moderne (MoMA) et Metropolitan Museum"
    ],
    bestTimeToVisit: 'Avril à Juin, Septembre à Novembre'
  },
  {
    id: 'rome',
    name: 'Rome, Italie',
    imageUrl: 'https://images.unsplash.com/photo-1525874684015-58379d421a52',
    description: "La Ville Éternelle est un musée à ciel ouvert où l'histoire antique côtoie la vie moderne. Découvrez les vestiges de l'Empire romain, la cuisine italienne authentique et l'ambiance unique des places et fontaines.",
    highlights: [
      'Colisée et Forum Romain',
      'Vatican, basilique Saint-Pierre et musées',
      'Fontaine de Trevi',
      'Panthéon',
      "Place Navona et Campo de' Fiori"
    ],
    bestTimeToVisit: 'Avril à Mai, Septembre à Octobre'
  },
  {
    id: 'bali',
    name: 'Bali, Indonésie',
    imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4',
    description: "L'île des dieux offre des plages paradisiaques, des rizières en terrasses, des temples spirituels et une culture riche. Bali est idéale pour se détendre, pratiquer le yoga ou partir à l'aventure.",
    highlights: [
      'Temples de Tanah Lot et Uluwatu',
      'Rizières en terrasses de Tegallalang',
      'Plages de Kuta, Seminyak et Nusa Dua',
      'Ubud et sa forêt des singes',
      'Mont Batur et lac Bratan'
    ],
    bestTimeToVisit: 'Mai à Septembre'
  },
  {
    id: 'barcelona',
    name: 'Barcelone, Espagne',
    imageUrl: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4',
    description: 'Avec son architecture unique de Gaudí, ses plages urbaines, sa cuisine catalane et son ambiance festive, Barcelone est une destination méditerranéenne parfaite pour un city-break culturel.',
    highlights: [
      'Sagrada Familia et œuvres de Gaudí',
      'Las Ramblas et quartier gothique',
      'Parc Güell',
      'Plage de la Barceloneta',
      'Musée Picasso et MACBA'
    ],
    bestTimeToVisit: 'Mai à Juin, Septembre à Octobre'
  },
  {
    id: 'marrakech',
    name: 'Marrakech, Maroc',
    imageUrl: 'https://images.unsplash.com/photo-1548018560-4cb48a8837c1?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fG1hcnJha2VjaHxlbnwwfHwwfHx8MA%3D%3D',
    description: "La ville rouge vous plonge dans les couleurs et parfums de l'Afrique du Nord. Entre souks animés, palais majestueux et jardins luxuriants, Marrakech offre une immersion culturelle intense.",
    highlights: [
      'Place Jemaa el-Fna',
      'Médina et souks',
      'Palais Bahia et El Badi',
      'Jardin Majorelle',
      'Musée Yves Saint Laurent'
    ],
    bestTimeToVisit: 'Mars à Mai, Octobre à Novembre'
  },
  {
    id: 'kyoto',
    name: 'Kyoto, Japon',
    imageUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186',
    description: "Ancienne capitale impériale, Kyoto incarne l'âme traditionnelle du Japon avec ses temples zen, jardins japonais, sanctuaires shinto et maisons de geishas. Une plongée dans la sérénité et l'esthétique japonaise.",
    highlights: [
      "Temple Kinkaku-ji (Pavillon d'or)",
      "Forêt de bambous d'Arashiyama",
      "Sanctuaire Fushimi Inari et ses torii",
      "Quartier de Gion",
      "Château Nijo"
    ],
    bestTimeToVisit: 'Mars à Mai, Octobre à Novembre'
  },
  {
    id: 'santorini',
    name: 'Santorin, Grèce',
    imageUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077',
    description: 'Cette île cyclique offre un paysage à couper le souffle avec ses maisons blanches à dômes bleus surplombant la mer Égée. Profitez des couchers de soleil spectaculaires, des plages volcaniques et de la gastronomie grecque.',
    highlights: [
      "Village d'Oia et ses couchers de soleil",
      "Fira et sa vue sur la caldera",
      "Plage rouge et plage noire",
      "Site archéologique d'Akrotiri",
      "Dégustation de vins locaux"
    ],
    bestTimeToVisit: 'Mai à Juin, Septembre à Octobre'
  }
];

export const destinationService = {
  getAllDestinations: (): DestinationCardProps[] => {
    return populatedDestinations;
  },

  getDestinationById: (id: string): DestinationCardProps | undefined => {
    return populatedDestinations.find(destination => destination.id === id);
  },

  searchDestinations: (query: string): DestinationCardProps[] => {
    const lowercaseQuery = query.toLowerCase();
    return populatedDestinations.filter(
      destination => 
        destination.name.toLowerCase().includes(lowercaseQuery) || 
        destination.description.toLowerCase().includes(lowercaseQuery)
    );
  },

  getFilteredDestinations: (bestTimeToVisit?: string): DestinationCardProps[] => {
    if (!bestTimeToVisit) {
      return populatedDestinations;
    }

    return populatedDestinations.filter(destination => 
      destination.bestTimeToVisit.toLowerCase().includes(bestTimeToVisit.toLowerCase())
    );
  }
}; 