
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { hasAssistantAccess } from "@/lib/supabase";
import { ASSISTANT_TYPES } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, Home, Settings, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Interface para propriedades do Airbnb
interface AirbnbPropriedade {
  id: string;
  nome_propriedade_interno: string;
  titulo_anuncio_airbnb: string;
  localizacao_cidade: string;
  localizacao_bairro_area: string;
  tipo_propriedade_airbnb: string;
  numero_quartos_airbnb: number;
  numero_banheiros_airbnb: number;
  capacidade_hospedes_airbnb: number;
  preco_noite_base_airbnb: number;
  avaliacao_geral_media_airbnb: number | null;
}

export default function AirbnbPricingAgentPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [propriedades, setPropriedades] = useState<AirbnbPropriedade[]>([]);
  const [loadingPropriedades, setLoadingPropriedades] = useState(false);

  // Verificar acesso do usuário ao assistente
  useEffect(() => {
    const checkAccess = async () => {
      try {
        if (!user) {
          navigate("/login");
          return;
        }

        // Verifica acesso direto no perfil (array allowed_assistants)
        if (profile?.allowed_assistants?.includes(ASSISTANT_TYPES.AIRBNB_PRICING_AGENT)) {
          setHasAccess(true);
          setLoading(false);
          return;
        }

        // Verificação secundária através da função de acesso
        const access = await hasAssistantAccess(user.id, ASSISTANT_TYPES.AIRBNB_PRICING_AGENT);
        setHasAccess(access);
        
        if (!access) {
          toast({
            title: "Acesso Negado",
            description: "Você não tem permissão para acessar este assistente. Entre em contato com um administrador.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Erro ao verificar acesso:", error);
        toast({
          title: "Erro de Verificação",
          description: "Não foi possível verificar suas permissões. Tente novamente mais tarde.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, profile, navigate, toast]);

  // Buscar propriedades do usuário
  useEffect(() => {
    const fetchPropriedades = async () => {
      if (!user || !hasAccess) return;
      
      setLoadingPropriedades(true);
      
      try {
        const { data, error } = await supabase
          .from('airbnb_propriedades')
          .select(`
            id,
            nome_propriedade_interno,
            titulo_anuncio_airbnb,
            localizacao_cidade,
            localizacao_bairro_area,
            tipo_propriedade_airbnb,
            numero_quartos_airbnb,
            numero_banheiros_airbnb,
            capacidade_hospedes_airbnb,
            preco_noite_base_airbnb,
            avaliacao_geral_media_airbnb
          `);
        
        if (error) throw error;
        
        setPropriedades(data || []);
      } catch (error) {
        console.error("Erro ao buscar propriedades:", error);
        toast({
          title: "Erro ao carregar propriedades",
          description: "Não foi possível carregar suas propriedades. Tente novamente mais tarde.",
          variant: "destructive",
        });
      } finally {
        setLoadingPropriedades(false);
      }
    };
    
    if (hasAccess) {
      fetchPropriedades();
    }
  }, [hasAccess, user, toast]);

  if (loading) {
    return (
      <div className="container py-8 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <span className="ml-2 text-muted-foreground">Verificando permissões...</span>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="container py-8">
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Acesso Negado</CardTitle>
            </div>
            <CardDescription>
              Você não tem permissão para acessar este assistente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Entre em contato com um administrador para solicitar acesso ao Agente de Precificação Airbnb.
            </p>
            <Button 
              onClick={() => navigate("/dashboard")} 
              variant="default"
              className="mt-4"
            >
              Voltar para o Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Agente de Precificação Airbnb</h1>
          <p className="text-muted-foreground mt-1">
            Otimize a precificação dos seus imóveis no Airbnb com análises de mercado em tempo real
          </p>
        </div>
        
        <Button className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          <span>Adicionar Propriedade</span>
        </Button>
      </div>
      
      <Tabs defaultValue="propriedades" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="propriedades" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <span>Minhas Propriedades</span>
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Configurações</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="propriedades" className="space-y-6">
          {loadingPropriedades ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <span className="ml-2">Carregando propriedades...</span>
            </div>
          ) : propriedades.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {propriedades.map(propriedade => (
                <Card key={propriedade.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{propriedade.nome_propriedade_interno}</CardTitle>
                    <CardDescription>{propriedade.localizacao_cidade}, {propriedade.localizacao_bairro_area}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Tipo</p>
                          <p className="font-medium">{propriedade.tipo_propriedade_airbnb}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Preço base</p>
                          <p className="font-medium">R$ {propriedade.preco_noite_base_airbnb.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Quartos</p>
                          <p className="font-medium">{propriedade.numero_quartos_airbnb}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Banheiros</p>
                          <p className="font-medium">{propriedade.numero_banheiros_airbnb}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Hóspedes</p>
                          <p className="font-medium">{propriedade.capacidade_hospedes_airbnb}</p>
                        </div>
                      </div>
                      <Separator />
                      <Button variant="outline" className="w-full">Ver Detalhes</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Nenhuma propriedade encontrada</CardTitle>
                <CardDescription>
                  Você ainda não cadastrou nenhuma propriedade do Airbnb. Comece adicionando sua primeira propriedade.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  <span>Adicionar Propriedade</span>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="configuracoes">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Agente</CardTitle>
              <CardDescription>
                Configure as preferências do seu Agente de Precificação Airbnb
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                As configurações do agente estarão disponíveis em breve.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
