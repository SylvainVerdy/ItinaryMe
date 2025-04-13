'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface TaskResult {
  timestamp: Date;
  task: string;
  result: string;
}

const MOCK_ANALYSIS = `
Analyse de la page "Booking.com":
- Site de réservation d'hôtels et de voyages
- Propose des hôtels, vols, locations de voiture et activités
- Options de filtrage par prix, étoiles, commodités
- Recommandations personnalisées basées sur l'historique
- Offres spéciales et réductions pour membres
`;

export const WebAutomationInterface: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [task, setTask] = useState<string>('');
  const [isAutomating, setIsAutomating] = useState<boolean>(false);
  const [capturedData, setCapturedData] = useState<string>('');
  const [taskHistory, setTaskHistory] = useState<TaskResult[]>([]);
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [modelName, setModelName] = useState<string>('deepseek-coder');
  const [headlessMode, setHeadlessMode] = useState<boolean>(false);

  // Simulation de l'état de connexion à Ollama
  useEffect(() => {
    // Simuler une vérification de connexion à Ollama
    const checkConnection = async () => {
      // Dans une implémentation réelle, appelez votre API ou service
      setTimeout(() => {
        setIsConnected(true);
      }, 1500);
    };
    
    checkConnection();
  }, []);

  // Fonction pour simuler l'extraction et l'analyse
  const handleExtractData = async () => {
    if (!url) return;
    
    setIsAutomating(true);
    setCapturedData('Extraction en cours...');
    
    // Simuler un délai de traitement
    setTimeout(() => {
      setCapturedData(MOCK_ANALYSIS);
      setScreenshotUrl('/mockScreenshot.png'); // Dans une implémentation réelle, ce serait une vraie capture
      setIsAutomating(false);
    }, 2000);
  };

  // Fonction pour simuler l'exécution d'une tâche
  const handleRunTask = async () => {
    if (!task) return;
    
    setIsAutomating(true);
    
    // Simuler un délai pour l'exécution de la tâche
    setTimeout(() => {
      const result = `Tâche exécutée: ${task}\n\nRésultat: J'ai analysé la page et trouvé 5 options d'hôtels correspondant à vos critères. Le meilleur rapport qualité-prix semble être "Grand Hôtel" à 120€ par nuit avec petit-déjeuner inclus.`;
      
      setTaskHistory(prev => [
        { timestamp: new Date(), task, result },
        ...prev
      ]);
      
      setIsAutomating(false);
    }, 3000);
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Agent d'Automatisation Web avec Ollama</CardTitle>
          <CardDescription>
            Utilisez l'IA locale via Ollama pour automatiser des tâches web et analyser du contenu
          </CardDescription>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm">
              {isConnected ? `Connecté à Ollama (${modelName})` : 'Déconnecté'}
            </span>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="browse" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="browse">Navigation</TabsTrigger>
              <TabsTrigger value="tasks">Tâches</TabsTrigger>
              <TabsTrigger value="settings">Paramètres</TabsTrigger>
            </TabsList>
            
            <TabsContent value="browse" className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input 
                  type="url" 
                  placeholder="Entrez une URL" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <Button 
                  onClick={handleExtractData} 
                  disabled={!url || isAutomating}
                  className="whitespace-nowrap"
                >
                  {isAutomating ? 'En cours...' : 'Analyser'}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Analyse du contenu</Label>
                  <Textarea 
                    readOnly 
                    className="min-h-[200px] font-mono text-sm"
                    value={capturedData || 'Aucune donnée extraite'}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Aperçu</Label>
                  <div className="border rounded-md p-2 min-h-[200px] flex items-center justify-center bg-gray-50">
                    {screenshotUrl ? (
                      <img 
                        src={screenshotUrl} 
                        alt="Capture d'écran" 
                        className="max-w-full max-h-[200px] object-contain"
                      />
                    ) : (
                      <span className="text-gray-400">Aucun aperçu disponible</span>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="tasks" className="space-y-4">
              <div className="space-y-2">
                <Label>Décrire la tâche à automatiser</Label>
                <Textarea 
                  placeholder="Ex: Trouve les 3 hôtels les moins chers à Paris pour la semaine prochaine..." 
                  className="min-h-[100px]"
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                />
                <Button 
                  className="w-full" 
                  onClick={handleRunTask}
                  disabled={!task || isAutomating}
                >
                  {isAutomating ? 'Exécution en cours...' : 'Exécuter la tâche'}
                </Button>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label>Historique des tâches</Label>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {taskHistory.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucune tâche exécutée</p>
                  ) : (
                    taskHistory.map((item, index) => (
                      <Card key={index} className="text-sm">
                        <CardHeader className="py-2 px-4">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{item.task}</span>
                            <span className="text-xs text-gray-500">
                              {item.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="py-2 px-4">
                          <p className="whitespace-pre-line">{item.result}</p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Modèle Ollama</Label>
                  <Input 
                    id="model"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="Nom du modèle (ex: deepseek-coder)"
                  />
                  <p className="text-xs text-gray-500">
                    Modèle Ollama à utiliser. Assurez-vous qu'il est installé.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="headless">Mode sans interface</Label>
                    <Switch 
                      id="headless"
                      checked={headlessMode}
                      onCheckedChange={setHeadlessMode}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Exécuter le navigateur en mode invisible (plus rapide, mais sans affichage visuel)
                  </p>
                </div>
              </div>
              
              <div className="pt-4">
                <Button variant="outline" className="w-full">
                  Tester la connexion à Ollama
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <p className="text-xs text-gray-500">
            Utilise DeepSeek via Ollama pour l'analyse et l'automatisation
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}; 