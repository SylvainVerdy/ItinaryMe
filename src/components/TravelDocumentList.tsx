import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
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
  Tag
} from 'lucide-react';

interface TravelDocumentListProps {
  tripId?: string; // Optionnel, pour filtrer par voyage
}

export const TravelDocumentList: React.FC<TravelDocumentListProps> = ({ tripId }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<TravelDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        let docsQuery = query(
          collection(db, 'travelDocuments'),
          where('userId', '==', user.uid),
          orderBy('updatedAt', 'desc')
        );
        
        // Si un tripId est fourni, filtrer par voyage
        if (tripId) {
          docsQuery = query(
            collection(db, 'travelDocuments'),
            where('userId', '==', user.uid),
            where('tripId', '==', tripId),
            orderBy('updatedAt', 'desc')
          );
        }
        
        const querySnapshot = await getDocs(docsQuery);
        const documentsData: TravelDocument[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data() as TravelDocument;
          documentsData.push({
            ...data,
            id: doc.id
          });
        });
        
        setDocuments(documentsData);
      } catch (err) {
        console.error("Erreur lors de la récupération des documents:", err);
        setError("Impossible de charger les documents");
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocuments();
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        {error}
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-gray-800">
          {tripId ? 'Documents du voyage' : 'Tous mes documents'}
        </h2>
        
        <Link 
          href={tripId ? `/dashboard/document/new?tripId=${tripId}` : '/dashboard/document/new'} 
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm font-medium"
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
            className="w-full p-2 pl-10 rounded-lg border border-[#e6e0d4] focus:outline-none focus:border-blue-300 transition-colors"
          />
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
        </div>
        
        <button className="p-2 rounded-lg border border-[#e6e0d4] hover:bg-[#f8f5ec] transition-colors">
          <Filter size={16} className="text-gray-500" />
        </button>
      </div>
      
      {/* Liste des documents */}
      {filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="h-16 w-16 rounded-full bg-[#f0ece3] flex items-center justify-center mb-4">
            <FileText className="text-gray-500" size={28} />
          </div>
          <h4 className="text-lg font-medium text-gray-800 mb-2">Aucun document trouvé</h4>
          <p className="text-gray-500 mb-6 text-center max-w-md">
            {searchTerm 
              ? "Aucun document ne correspond à votre recherche." 
              : "Vous n'avez pas encore créé de document. Commencez dès maintenant !"}
          </p>
          <Link 
            href={tripId ? `/dashboard/document/new?tripId=${tripId}` : '/dashboard/document/new'} 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-colors text-sm font-medium"
          >
            <PlusCircle size={16} />
            <span>Créer mon premier document</span>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-[#e6e0d4]">
          {filteredDocuments.map((doc) => (
            <Link 
              key={doc.id} 
              href={`/dashboard/document/${doc.id}`}
              className="block py-4 px-3 -mx-3 hover:bg-[#f8f5ec] transition-colors rounded-lg group"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500 flex-shrink-0">
                  {doc.icon ? (
                    <span>{doc.icon}</span>
                  ) : (
                    <FileText size={20} />
                  )}
                </div>
                
                <div className="flex-grow">
                  <h3 className="font-medium text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">
                    {doc.title}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>Modifié {formatDate(doc.updatedAt)}</span>
                    </div>
                    
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Tag size={14} />
                        <span>{doc.tags.slice(0, 2).join(', ')}{doc.tags.length > 2 ? '...' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Voir →
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}; 