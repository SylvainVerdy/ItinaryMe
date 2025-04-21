"use client";

import React, { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PriceAnalysisReport, PriceAnalysisResult } from '@/ai/services/travelPriceService';
import { Loader2, ExternalLink, InfoIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TravelPriceAnalysisProps {
  travelId: string;
}

const TravelPriceAnalysis: React.FC<TravelPriceAnalysisProps> = ({ travelId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisReport, setAnalysisReport] = useState<PriceAnalysisReport | null>(null);
  
  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post('/api/travelPrice', { travelId });
      setAnalysisReport(response.data);
    } catch (err: any) {
      console.error('Erreur lors de l\'analyse des prix:', err);
      setError(err.response?.data?.message || 'Une erreur est survenue lors de l\'analyse des prix');
    } finally {
      setLoading(false);
    }
  };
  
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'transport': return 'Transport';
      case 'logement': return 'Hébergement';
      case 'nourriture': return 'Restauration';
      case 'activités': return 'Activités';
      default: return category;
    }
  };
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'transport': return 'bg-blue-100 text-blue-800';
      case 'logement': return 'bg-purple-100 text-purple-800';
      case 'nourriture': return 'bg-orange-100 text-orange-800';
      case 'activités': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const renderPriceCard = (result: PriceAnalysisResult) => {
    return (
      <Card key={result.category} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <Badge className={getCategoryColor(result.category)}>{getCategoryLabel(result.category)}</Badge>
            <div className="text-2xl font-bold">{result.estimation}</div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-3">{result.description}</p>
          {result.sources.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Sources:</p>
              <ul className="text-xs space-y-1">
                {result.sources.slice(0, 3).map((source, index) => (
                  <li key={index}>
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center"
                    >
                      {source.title.length > 50 ? source.title.substring(0, 50) + '...' : source.title}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Analyse des prix du voyage</h2>
        <Button 
          onClick={fetchAnalysis} 
          disabled={loading}
          variant={analysisReport ? "outline" : "default"}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyse en cours...
            </>
          ) : analysisReport ? 'Actualiser l\'analyse' : 'Analyser les prix'}
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {loading && (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-gray-600">Analyse des prix en cours...</p>
        </div>
      )}
      
      {analysisReport && !loading && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>Estimation budget total</span>
                <span className="text-2xl font-bold">{analysisReport.estimationTotale}</span>
              </CardTitle>
              <CardDescription>
                Voyage à {analysisReport.destination} • {analysisReport.duréeSéjour} jours • {analysisReport.nombreVoyageurs} {analysisReport.nombreVoyageurs > 1 ? 'personnes' : 'personne'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-md text-sm">
                {analysisReport.sommaire}
              </div>
            </CardContent>
          </Card>
          
          <Tabs defaultValue="cards">
            <TabsList className="mb-4">
              <TabsTrigger value="cards">Cartes</TabsTrigger>
              <TabsTrigger value="table">Tableau</TabsTrigger>
            </TabsList>
            
            <TabsContent value="cards" className="space-y-4">
              {analysisReport.résultats.map(result => renderPriceCard(result))}
            </TabsContent>
            
            <TabsContent value="table">
              <Card>
                <CardContent className="pt-4">
                  <Table>
                    <TableCaption>Analyse des prix par catégorie</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Estimation</TableHead>
                        <TableHead className="w-[50%]">Description</TableHead>
                        <TableHead>Sources</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysisReport.résultats.map((result) => (
                        <TableRow key={result.category}>
                          <TableCell>
                            <Badge className={getCategoryColor(result.category)}>
                              {getCategoryLabel(result.category)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{result.estimation}</TableCell>
                          <TableCell>{result.description}</TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <InfoIcon className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="w-60">
                                    <p className="font-semibold mb-1">Sources:</p>
                                    <ul className="text-xs space-y-1">
                                      {result.sources.map((source, index) => (
                                        <li key={index}>
                                          <a 
                                            href={source.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline"
                                          >
                                            {source.title.length > 40 ? source.title.substring(0, 40) + '...' : source.title}
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="text-xs text-gray-500 italic">
            Analyse générée le {new Date(analysisReport.créatedAt).toLocaleString('fr-FR')}. Les prix sont des estimations et peuvent varier.
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelPriceAnalysis; 