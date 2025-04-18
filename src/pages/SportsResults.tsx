
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function SportsResults() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Placeholder function for future API integration
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Buscando resultados",
      description: `Pesquisando por "${searchQuery}"`,
    });
  };

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/dashboard')} 
          aria-label="Voltar para Dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Resultados Esportivos Oficiais</h1>
          <p className="text-muted-foreground">
            Acompanhe os resultados mais recentes das suas partidas favoritas
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle>Pesquisar Resultados</CardTitle>
            <CardDescription>
              Busque por time, campeonato ou esporte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Ex: Flamengo, Brasileirão, NBA..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit">Buscar</Button>
            </form>
          </CardContent>
        </Card>

        {/* Popular Leagues Section */}
        <Card>
          <CardHeader>
            <CardTitle>Campeonatos Populares</CardTitle>
            <CardDescription>
              Acesse rapidamente os principais campeonatos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {['Brasileirão', 'Copa do Brasil', 'Champions League', 'Premier League'].map((league) => (
                <Button 
                  key={league} 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSearchQuery(league);
                    toast({
                      title: "Carregando campeonato",
                      description: `Buscando resultados do ${league}`,
                    });
                  }}
                >
                  {league}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
