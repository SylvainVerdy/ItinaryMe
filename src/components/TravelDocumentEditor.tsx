import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { TravelDocument, DocumentBlock, DocumentBlockType } from '@/lib/types';
import { PlusCircle, Trash2, Image, Link, Table, FileText, AlignLeft, 
         List, ListOrdered, CheckSquare, Bookmark, Quote, Heading1, 
         Heading2, Heading3, File, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface TravelDocumentEditorProps {
  documentId?: string;
  tripId: string;
  onSave?: (document: TravelDocument) => void;
}

export const TravelDocumentEditor: React.FC<TravelDocumentEditorProps> = ({ 
  documentId, 
  tripId,
  onSave
}) => {
  const { user } = useAuth();
  const [document, setDocument] = useState<TravelDocument>({
    userId: user?.uid || '',
    tripId: tripId,
    title: 'Nouveau document',
    content: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Charger le document existant si documentId est fourni
  useEffect(() => {
    const fetchDocument = async () => {
      if (!documentId || !user) return;
      
      try {
        setLoading(true);
        const docRef = doc(db, 'travelDocuments', documentId);
        const docSnapshot = await getDoc(docRef);
        
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as TravelDocument;
          setDocument(data);
        } else {
          setError('Document non trouvé');
        }
      } catch (err) {
        console.error("Erreur lors du chargement du document:", err);
        setError("Impossible de charger le document");
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocument();
  }, [documentId, user]);
  
  // Sauvegarder le document
  const saveDocument = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      const updatedDocument = {
        ...document,
        updatedAt: new Date().toISOString()
      };
      
      if (documentId) {
        // Mettre à jour un document existant
        await updateDoc(doc(db, 'travelDocuments', documentId), updatedDocument);
      } else {
        // Créer un nouveau document
        const newDocRef = doc(collection(db, 'travelDocuments'));
        await setDoc(newDocRef, updatedDocument);
        
        // Mettre à jour l'ID du document dans l'état local
        setDocument(prev => ({ ...prev, id: newDocRef.id }));
        
        if (onSave) {
          onSave({ ...updatedDocument, id: newDocRef.id });
        }
      }
    } catch (err) {
      console.error("Erreur lors de la sauvegarde du document:", err);
      setError("Impossible de sauvegarder le document");
    } finally {
      setSaving(false);
    }
  };
  
  // Ajouter un nouveau bloc
  const addBlock = (type: DocumentBlockType, index: number) => {
    const newBlock: DocumentBlock = {
      id: uuidv4(),
      type,
      content: '',
    };
    
    const newContent = [...document.content];
    newContent.splice(index + 1, 0, newBlock);
    
    setDocument(prev => ({
      ...prev,
      content: newContent
    }));
  };
  
  // Mettre à jour un bloc
  const updateBlock = (id: string, updates: Partial<DocumentBlock>) => {
    setDocument(prev => ({
      ...prev,
      content: prev.content.map(block => 
        block.id === id ? { ...block, ...updates } : block
      )
    }));
  };
  
  // Supprimer un bloc
  const deleteBlock = (id: string) => {
    setDocument(prev => ({
      ...prev,
      content: prev.content.filter(block => block.id !== id)
    }));
  };
  
  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#e6e0d4] p-6 mb-6">
      <div className="mb-6">
        <input
          type="text"
          value={document.title}
          onChange={(e) => setDocument(prev => ({ ...prev, title: e.target.value }))}
          className="text-3xl font-bold w-full outline-none border-b border-transparent focus:border-gray-200 pb-2 transition-colors"
          placeholder="Titre du document"
        />
      </div>
      
      {/* Barre d'outils */}
      <div className="flex items-center flex-wrap gap-2 mb-6 p-2 border border-[#e6e0d4] rounded-lg bg-[#f8f5ec]">
        <button 
          onClick={() => addBlock('paragraph', document.content.length - 1)}
          className="p-2 rounded hover:bg-white transition-colors"
          title="Paragraphe"
        >
          <AlignLeft size={16} />
        </button>
        <button 
          onClick={() => addBlock('heading1', document.content.length - 1)}
          className="p-2 rounded hover:bg-white transition-colors"
          title="Titre 1"
        >
          <Heading1 size={16} />
        </button>
        <button 
          onClick={() => addBlock('heading2', document.content.length - 1)}
          className="p-2 rounded hover:bg-white transition-colors"
          title="Titre 2"
        >
          <Heading2 size={16} />
        </button>
        <button 
          onClick={() => addBlock('heading3', document.content.length - 1)}
          className="p-2 rounded hover:bg-white transition-colors"
          title="Titre 3"
        >
          <Heading3 size={16} />
        </button>
        <button 
          onClick={() => addBlock('bulletList', document.content.length - 1)}
          className="p-2 rounded hover:bg-white transition-colors"
          title="Liste à puces"
        >
          <List size={16} />
        </button>
        <button 
          onClick={() => addBlock('numberedList', document.content.length - 1)}
          className="p-2 rounded hover:bg-white transition-colors"
          title="Liste numérotée"
        >
          <ListOrdered size={16} />
        </button>
        <button 
          onClick={() => addBlock('todo', document.content.length - 1)}
          className="p-2 rounded hover:bg-white transition-colors"
          title="Todo"
        >
          <CheckSquare size={16} />
        </button>
        <button 
          onClick={() => addBlock('quote', document.content.length - 1)}
          className="p-2 rounded hover:bg-white transition-colors"
          title="Citation"
        >
          <Quote size={16} />
        </button>
        <button 
          onClick={() => addBlock('divider', document.content.length - 1)}
          className="p-2 rounded hover:bg-white transition-colors"
          title="Séparateur"
        >
          <div className="w-6 h-0.5 bg-gray-500"></div>
        </button>
        <button 
          onClick={() => addBlock('image', document.content.length - 1)}
          className="p-2 rounded hover:bg-white transition-colors"
          title="Image"
        >
          <Image size={16} />
        </button>
        <button 
          onClick={() => addBlock('table', document.content.length - 1)}
          className="p-2 rounded hover:bg-white transition-colors"
          title="Tableau"
        >
          <Table size={16} />
        </button>
      </div>
      
      {/* Contenu du document */}
      <div className="space-y-4">
        {document.content.length === 0 ? (
          <div 
            className="p-4 border border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:bg-gray-50"
            onClick={() => addBlock('paragraph', -1)}
          >
            <p className="text-gray-500">Cliquez pour ajouter du contenu</p>
          </div>
        ) : (
          document.content.map((block, index) => (
            <BlockRenderer
              key={block.id}
              block={block}
              onChange={(updates) => updateBlock(block.id, updates)}
              onDelete={() => deleteBlock(block.id)}
              onAddAfter={(type) => addBlock(type, index)}
            />
          ))
        )}
      </div>
      
      {/* Boutons d'action */}
      <div className="mt-8 flex justify-end gap-4">
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={saveDocument}
          disabled={saving}
          className={`px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2 ${
            saving ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {saving ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              <span>Sauvegarde...</span>
            </>
          ) : (
            <span>Enregistrer</span>
          )}
        </button>
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
};

// Composant pour rendre chaque type de bloc
interface BlockRendererProps {
  block: DocumentBlock;
  onChange: (updates: Partial<DocumentBlock>) => void;
  onDelete: () => void;
  onAddAfter: (type: DocumentBlockType) => void;
}

const BlockRenderer: React.FC<BlockRendererProps> = ({
  block,
  onChange,
  onDelete,
  onAddAfter
}) => {
  const renderBlockByType = () => {
    switch (block.type) {
      case 'paragraph':
        return (
          <textarea
            value={block.content}
            onChange={(e) => onChange({ content: e.target.value })}
            className="w-full p-2 min-h-[60px] outline-none border border-transparent focus:border-gray-200 rounded transition-colors resize-none"
            placeholder="Écrivez quelque chose..."
          />
        );
        
      case 'heading1':
        return (
          <input
            type="text"
            value={block.content}
            onChange={(e) => onChange({ content: e.target.value })}
            className="w-full text-2xl font-bold p-2 outline-none border border-transparent focus:border-gray-200 rounded transition-colors"
            placeholder="Titre 1"
          />
        );
        
      case 'heading2':
        return (
          <input
            type="text"
            value={block.content}
            onChange={(e) => onChange({ content: e.target.value })}
            className="w-full text-xl font-semibold p-2 outline-none border border-transparent focus:border-gray-200 rounded transition-colors"
            placeholder="Titre 2"
          />
        );
        
      case 'heading3':
        return (
          <input
            type="text"
            value={block.content}
            onChange={(e) => onChange({ content: e.target.value })}
            className="w-full text-lg font-medium p-2 outline-none border border-transparent focus:border-gray-200 rounded transition-colors"
            placeholder="Titre 3"
          />
        );
        
      case 'bulletList':
        return (
          <div className="flex items-start gap-2">
            <div className="mt-3 w-2 h-2 rounded-full bg-gray-500 flex-shrink-0"></div>
            <textarea
              value={block.content}
              onChange={(e) => onChange({ content: e.target.value })}
              className="w-full p-2 outline-none border border-transparent focus:border-gray-200 rounded transition-colors resize-none"
              placeholder="Élément de liste"
            />
          </div>
        );
        
      case 'numberedList':
        return (
          <div className="flex items-start gap-2">
            <div className="p-2 font-medium text-gray-500">1.</div>
            <textarea
              value={block.content}
              onChange={(e) => onChange({ content: e.target.value })}
              className="w-full p-2 outline-none border border-transparent focus:border-gray-200 rounded transition-colors resize-none"
              placeholder="Élément de liste numérotée"
            />
          </div>
        );
        
      case 'todo':
        return (
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={block.checked || false}
              onChange={(e) => onChange({ checked: e.target.checked })}
              className="mt-3"
            />
            <textarea
              value={block.content}
              onChange={(e) => onChange({ content: e.target.value })}
              className="w-full p-2 outline-none border border-transparent focus:border-gray-200 rounded transition-colors resize-none"
              placeholder="Tâche à faire"
            />
          </div>
        );
        
      case 'quote':
        return (
          <div className="border-l-4 border-gray-300 pl-4">
            <textarea
              value={block.content}
              onChange={(e) => onChange({ content: e.target.value })}
              className="w-full p-2 bg-gray-50 outline-none rounded transition-colors resize-none italic"
              placeholder="Citation"
            />
          </div>
        );
        
      case 'divider':
        return <hr className="my-4 border-gray-200" />;
        
      case 'image':
        return (
          <div className="border border-gray-200 rounded-lg p-4">
            {block.url ? (
              <div className="space-y-2">
                <img 
                  src={block.url} 
                  alt={block.content} 
                  className="max-w-full rounded"
                />
                <input
                  type="text"
                  value={block.content}
                  onChange={(e) => onChange({ content: e.target.value })}
                  className="w-full p-2 text-sm outline-none border border-transparent focus:border-gray-200 rounded transition-colors"
                  placeholder="Description de l'image"
                />
              </div>
            ) : (
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <input
                  type="text"
                  value={block.url || ''}
                  onChange={(e) => onChange({ url: e.target.value })}
                  className="w-full p-2 mb-2 outline-none border border-gray-200 rounded transition-colors"
                  placeholder="URL de l'image"
                />
                <p className="text-gray-500 text-sm">ou</p>
                <button className="mt-2 px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-2 mx-auto">
                  <Upload size={16} />
                  <span>Télécharger une image</span>
                </button>
              </div>
            )}
          </div>
        );
        
      case 'table':
        return (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-2 text-left border-b border-r border-gray-200">Colonne 1</th>
                  <th className="p-2 text-left border-b border-r border-gray-200">Colonne 2</th>
                  <th className="p-2 text-left border-b border-gray-200">Colonne 3</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border-b border-r border-gray-200">
                    <input 
                      type="text" 
                      className="w-full outline-none"
                      placeholder="Cellule"
                    />
                  </td>
                  <td className="p-2 border-b border-r border-gray-200">
                    <input 
                      type="text" 
                      className="w-full outline-none"
                      placeholder="Cellule"
                    />
                  </td>
                  <td className="p-2 border-b border-gray-200">
                    <input 
                      type="text" 
                      className="w-full outline-none"
                      placeholder="Cellule"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="p-2 border-r border-gray-200">
                    <input 
                      type="text" 
                      className="w-full outline-none"
                      placeholder="Cellule"
                    />
                  </td>
                  <td className="p-2 border-r border-gray-200">
                    <input 
                      type="text" 
                      className="w-full outline-none"
                      placeholder="Cellule"
                    />
                  </td>
                  <td className="p-2">
                    <input 
                      type="text" 
                      className="w-full outline-none"
                      placeholder="Cellule"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
        
      default:
        return (
          <div className="p-2 border border-dashed border-gray-300 rounded">
            <p className="text-gray-500">Type de bloc non pris en charge: {block.type}</p>
          </div>
        );
    }
  };
  
  return (
    <div className="group relative">
      <div className="hidden group-hover:flex absolute -left-10 top-2 gap-1">
        <button
          onClick={onDelete}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          title="Supprimer"
        >
          <Trash2 size={14} />
        </button>
        <button
          onClick={() => onAddAfter('paragraph')}
          className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
          title="Ajouter un bloc"
        >
          <PlusCircle size={14} />
        </button>
      </div>
      
      <div className="p-1">
        {renderBlockByType()}
      </div>
    </div>
  );
}; 