import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { TravelDocument } from '@/lib/types';
import Link from 'next/link';
import { 
  File, 
  FileText, 
  PlusCircle, 
  Loader, 
  Clock, 
  Search, 
  Filter,
  Tag,
  FileEdit,
  MapPin
} from 'lucide-react';

interface TravelDocumentListProps {
  tripId?: string; // Optionnel, pour filtrer par voyage
}

// Étendre le type TravelDocument pour inclure la source (documents ou notes de voyage)
interface ExtendedTravelDocument extends TravelDocument {
  source: 'document' | 'travel-note';
  destination?: string; // Pour les notes de voyage
}

export const TravelDocumentList: React.FC<TravelDocumentListProps> = ({ tripId }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<ExtendedTravelDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const fetchAllContent = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const allDocuments: ExtendedTravelDocument[] = [];
        
        // 1. Récupérer les documents de voyage (tri JS pour éviter l'index composite)
        let docsQuery = query(
          collection(db, 'travelDocuments'),
          where('userId', '==', user.uid)
        );

        if (tripId) {
          docsQuery = query(
            collection(db, 'travelDocuments'),
            where('userId', '==', user.uid),
            where('tripId', '==', tripId)
          );
        }
        
        const querySnapshot = await getDocs(docsQuery);
        
        querySnapshot.forEach((doc) => {
          const data = doc.data() as TravelDocument;
          allDocuments.push({
            ...data,
            id: doc.id,
            source: 'document'
          });
        });

        // 2. Récupérer les notes de voyage (travels)
        let travelsQuery = query(
          collection(db, 'travels'),
          where('userId', '==', user.uid)
        );
        
        const travelsSnapshot = await getDocs(travelsQuery);
        
        for (const travelDoc of travelsSnapshot.docs) {
          const travelData = travelDoc.data();
          
          // Ne prendre que les voyages qui ont des notes
          if (travelData.notes && travelData.notes.trim()) {
            const travelDate = travelData.updatedAt?.toDate() || new Date();
            
            // Créer un document à partir des notes
            allDocuments.push({
              id: travelDoc.id,
              userId: user.uid,
              tripId: travelDoc.id,
              title: `Notes: ${travelData.destination}`,
              destination: travelData.destination,
              content: [{ 
                id: `note-${travelDoc.id}`, 
                type: 'paragraph', 
                content: travelData.notes 
              }],
              createdAt: travelDate.toISOString(),
              updatedAt: travelDate.toISOString(),
              source: 'travel-note',
              tags: ['notes', 'voyage']
            });
          }
        }
        
        // Trier tous les documents par date
        allDocuments.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        
        setDocuments(allDocuments);
      } catch (err) {
        console.error("Erreur lors de la récupération des documents:", err);
        setError("Impossible de charger les documents");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllContent();
  }, [user, tripId]);
  
  // Filtrer les documents par terme de recherche
  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Formater la date de mise à jour
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-teal"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }
  
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-bold text-slate-900">
          {tripId ? 'Documents du voyage' : 'Tous mes documents'}
        </h2>
        
        <Link 
          href={tripId ? `/dashboard/document/new?tripId=${tripId}` : '/dashboard/document/new'} 
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-coral to-brand-sun px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
        >
          <PlusCircle size={14} />
          <span>Nouveau document</span>
        </Link>
      </div>
      
      {/* Barre de recherche et filtres */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-grow">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un document..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10"
          />
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
        
        <button aria-label="Filtrer" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900">
          <Filter size={16} />
        </button>
      </div>
      
      {/* Liste des documents */}
      {filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-teal to-brand-lagoon text-white">
            <FileText size={28} />
          </div>
          <h4 className="font-display text-lg font-bold text-slate-900">Aucun document trouvé</h4>
          <p className="mb-6 mt-2 max-w-md text-center text-sm text-slate-500">
            {searchTerm 
              ? "Aucun document ne correspond à votre recherche." 
              : "Vous n'avez pas encore créé de document. Commencez dès maintenant !"}
          </p>
          <Link 
            href={tripId ? `/dashboard/document/new?tripId=${tripId}` : '/dashboard/document/new'} 
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-coral to-brand-sun px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <PlusCircle size={16} />
            <span>Créer mon premier document</span>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filteredDocuments.map((doc) => (
            <Link 
              key={doc.id} 
              href={doc.source === 'document' 
                ? `/dashboard/document/${doc.id}` 
                : `/travel/${doc.id}?editNotes=true`
              }
              className="group -mx-3 block rounded-2xl px-3 py-4 transition-colors hover:bg-slate-50"
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                  doc.source === 'travel-note'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-teal-50 text-brand-teal'
                }`}>
                  {doc.source === 'travel-note' ? (
                    <FileEdit size={20} />
                  ) : doc.icon ? (
                    <span>{doc.icon}</span>
                  ) : (
                    <FileText size={20} />
                  )}
                </div>
                
                <div className="flex-grow">
                  <h3 className="mb-1 font-semibold text-slate-900 transition-colors group-hover:text-brand-teal">
                    {doc.title}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>Modifié {formatDate(doc.updatedAt)}</span>
                    </div>
                    
                    {doc.source === 'travel-note' && doc.destination && (
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        <span>{doc.destination}</span>
                      </div>
                    )}
                    
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Tag size={14} />
                        <span>{doc.tags.slice(0, 2).join(', ')}{doc.tags.length > 2 ? '...' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex-shrink-0 text-sm font-semibold text-brand-teal opacity-0 transition-opacity group-hover:opacity-100">
                  {doc.source === 'travel-note' ? 'Éditer →' : 'Voir →'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}; 