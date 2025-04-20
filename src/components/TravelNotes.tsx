'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Note } from '@/lib/types';
import { integrationService } from '@/services/integrationService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Edit, Trash2, Star, Clock, Tag } from 'lucide-react';

interface TravelNotesProps {
  tripId: string;
  onAddNote?: (content: string) => void;
  onGenerateNote?: (prompt: string) => Promise<string>;
}

export default function TravelNotes({ tripId, onAddNote, onGenerateNote }: TravelNotesProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState('');

  // Charger les notes
  useEffect(() => {
    const fetchNotes = async () => {
      if (!user || !tripId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const q = query(
          collection(db, 'notes'),
          where('userId', '==', user.uid),
          where('tripId', '==', tripId),
          orderBy('updatedAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const notesData: Note[] = [];
        
        querySnapshot.forEach((doc) => {
          notesData.push({ id: doc.id, ...doc.data() } as Note);
        });
        
        setNotes(notesData);
      } catch (err) {
        console.error('Erreur lors du chargement des notes:', err);
        setError('Impossible de charger les notes. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotes();
  }, [user, tripId]);

  // Ajouter une note
  const handleAddNote = async () => {
    if (!user || !tripId) return;
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
    
    try {
      const newNote: Omit<Note, 'id'> = {
        userId: user.uid,
        tripId,
        title: newNoteTitle,
        content: newNoteContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        isImportant: false
      };
      
      const docRef = await addDoc(collection(db, 'notes'), newNote);
      
      const noteWithId = { id: docRef.id, ...newNote };
      setNotes([noteWithId, ...notes]);
      setNewNoteTitle('');
      setNewNoteContent('');
      
      if (onAddNote) {
        onAddNote(newNoteContent);
      }

      // Synchroniser la note avec le calendrier et la carte
      await integrationService.syncNotesWithCalendarAndMap(tripId, [noteWithId]);
    } catch (err) {
      console.error('Erreur lors de l\'ajout de la note:', err);
      setError('Impossible d\'ajouter la note. Veuillez réessayer.');
    }
  };

  // Modifier une note
  const handleSaveEdit = async () => {
    if (!editingNoteId) return;
    
    try {
      const noteToUpdate = notes.find(note => note.id === editingNoteId);
      if (!noteToUpdate) return;
      
      await updateDoc(doc(db, 'notes', editingNoteId), {
        title: editedTitle,
        content: editedContent,
        updatedAt: new Date().toISOString()
      });
      
      const updatedNote = { 
        ...noteToUpdate, 
        title: editedTitle, 
        content: editedContent, 
        updatedAt: new Date().toISOString() 
      };
      
      setNotes(notes.map(note => 
        note.id === editingNoteId 
          ? updatedNote
          : note
      ));
      
      setEditingNoteId(null);

      // Synchroniser la note modifiée avec le calendrier et la carte
      await integrationService.syncNotesWithCalendarAndMap(tripId, [updatedNote]);
    } catch (err) {
      console.error('Erreur lors de la modification de la note:', err);
      setError('Impossible de modifier la note. Veuillez réessayer.');
    }
  };

  // Supprimer une note
  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteDoc(doc(db, 'notes', noteId));
      setNotes(notes.filter(note => note.id !== noteId));
      
      // Supprimer les intégrations liées à cette note
      // Cette fonctionnalité serait à implémenter dans l'integrationService
    } catch (err) {
      console.error('Erreur lors de la suppression de la note:', err);
      setError('Impossible de supprimer la note. Veuillez réessayer.');
    }
  };

  // Marquer une note comme importante
  const handleToggleImportant = async (noteId: string) => {
    try {
      const noteToUpdate = notes.find(note => note.id === noteId);
      if (!noteToUpdate) return;
      
      const newImportantStatus = !noteToUpdate.isImportant;
      
      await updateDoc(doc(db, 'notes', noteId), {
        isImportant: newImportantStatus,
        updatedAt: new Date().toISOString()
      });
      
      setNotes(notes.map(note => 
        note.id === noteId 
          ? { ...note, isImportant: newImportantStatus, updatedAt: new Date().toISOString() }
          : note
      ));
    } catch (err) {
      console.error('Erreur lors de la modification de l\'importance de la note:', err);
      setError('Impossible de modifier l\'importance. Veuillez réessayer.');
    }
  };

  // Générer une note avec l'IA
  const handleGenerateNote = async () => {
    if (!generationPrompt.trim() || !onGenerateNote) return;
    
    try {
      setIsGenerating(true);
      const generatedContent = await onGenerateNote(generationPrompt);
      
      setNewNoteTitle(generationPrompt);
      setNewNoteContent(generatedContent);
      setGenerationPrompt('');
    } catch (err) {
      console.error('Erreur lors de la génération de la note:', err);
      setError('Impossible de générer la note. Veuillez réessayer.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Filtrer les notes selon la recherche
  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Commencer l'édition d'une note
  const startEditing = (note: Note) => {
    setEditingNoteId(note.id);
    setEditedTitle(note.title);
    setEditedContent(note.content);
  };

  // Annuler l'édition
  const cancelEditing = () => {
    setEditingNoteId(null);
  };

  // Formatage de la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Notes de voyage</h2>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher dans les notes..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-2 rounded-md mb-4">
          {error}
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-md mb-4">
        <h3 className="font-medium mb-2">Génération de note par IA</h3>
        <div className="space-y-2">
          <Input
            placeholder="Ex: Résume les attractions principales à visiter..."
            value={generationPrompt}
            onChange={(e) => setGenerationPrompt(e.target.value)}
          />
          <Button 
            onClick={handleGenerateNote} 
            disabled={!generationPrompt.trim() || isGenerating}
            className="w-full"
          >
            {isGenerating ? 'Génération en cours...' : 'Générer une note'}
          </Button>
        </div>
      </div>

      <div className="mb-4 p-4 border rounded-md">
        <h3 className="font-medium mb-2">Nouvelle note</h3>
        <div className="space-y-2">
          <Input
            placeholder="Titre de la note"
            value={newNoteTitle}
            onChange={(e) => setNewNoteTitle(e.target.value)}
          />
          <Textarea
            placeholder="Contenu de la note"
            rows={4}
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
          />
          <Button 
            onClick={handleAddNote}
            disabled={!newNoteTitle.trim() || !newNoteContent.trim()}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Ajouter une note
          </Button>
        </div>
      </div>

      <div className="flex-grow overflow-auto">
        {loading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center text-gray-500 p-4">
            Aucune note trouvée.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotes.map((note) => (
              <Card key={note.id} className={`${note.isImportant ? 'border-yellow-400' : ''}`}>
                {editingNoteId === note.id ? (
                  <CardContent className="p-4">
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="mb-2 font-medium"
                    />
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      rows={5}
                      className="mb-3"
                    />
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={cancelEditing}>
                        Annuler
                      </Button>
                      <Button onClick={handleSaveEdit}>
                        Enregistrer
                      </Button>
                    </div>
                  </CardContent>
                ) : (
                  <>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-md">{note.title}</CardTitle>
                          <CardDescription className="flex items-center text-xs mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(note.updatedAt)}
                          </CardDescription>
                        </div>
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleToggleImportant(note.id as string)}
                            className={`h-8 w-8 p-0 ${note.isImportant ? 'text-yellow-500' : 'text-gray-400'}`}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => startEditing(note)}
                            className="h-8 w-8 p-0 text-gray-400"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteNote(note.id as string)}
                            className="h-8 w-8 p-0 text-gray-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="whitespace-pre-line text-sm">
                        {note.content}
                      </div>
                    </CardContent>
                    {note.tags && note.tags.length > 0 && (
                      <CardFooter className="p-4 pt-0 flex flex-wrap gap-1">
                        {note.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />{tag}
                          </Badge>
                        ))}
                      </CardFooter>
                    )}
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 