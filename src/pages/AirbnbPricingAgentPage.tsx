import { useEffect, useState, ChangeEvent } from "react"; // Adicionado ChangeEvent
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
// Removido hasAssistantAccess se não for usado diretamente aqui e sim no ProtectedRoute/AuthProvider
import { ASSISTANT_TYPES } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"; // Adicionado CardFooter
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, Home, Settings, AlertCircle, Loader2 } from "lucide-react"; // Adicionado Loader2
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter as DialogFooterComponent, // Renomeado para evitar conflito com CardFooter
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Interface para propriedades do Airbnb (simplificada para o que exibimos inicialmente)
interface AirbnbPropriedade {
  id: string; // Supabase ID
  id_airbnb: string | null; // ID do Airbnb fornecido pelo usuário
  nome_propriedade_interno: string;
  titulo_anuncio_airbnb: string | null;
  localizacao_cidade: string | null;
  localizacao_bairro_area: string | null;
  tipo_propriedade_airbnb: string | null;
  numero_quartos_airbnb: number | null;
  numero_banheiros_airbnb: number | null;
  capacidade_hospedes_airbnb: number | null;
  preco_noite_base_airbnb: number | null;
  avaliacao_geral_media_airbnb: number | null;
  data_ultima_extracao_airbnb?: string | null; // Para saber se já foi detalhado
  id_usuario_proprietario?: string; // Adicionado para clareza
}

// Estado inicial para o formulário de nova propriedade
const initialNewPropertyState = {
  id_airbnb_input: '', // ID do Airbnb que o usuário digita
  nome_propriedade_interno: '', // Apelido
};

export default function AirbnbPricingAgentPage() {
  const { user, profile } = useAuth(); // Obtém o perfil completo do AuthContext
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pageLoading, setPageLoading] = useState(true); // Renomeado de loading para evitar conflito
  const [hasAccess, setHasAccess] = useState(false);
  const [propriedades, setPropriedades] = useState<AirbnbPropriedade[]>([]);
  const [loadingPropriedades, setLoadingPropriedades] = useState(false);

  const [isAddPropertyDialogOpen, setIsAddPropertyDialogOpen] = useState(false);
  const [newPropertyData, setNewPropertyData] = useState(initialNewPropertyState);
  const [isSavingProperty, setIsSavingProperty] = useState(false);

  // Verificar acesso do usuário ao assistente
  useEffect(() => {
    console.log("[AirbnbPage] Verificando acesso...");
    if (!user || !profile) { // Se o usuário ou perfil ainda não carregou no AuthContext
      if (!profile && user) console.log("[AirbnbPage] Perfil ainda não carregado, aguardando...");
      // O loading do AuthContext deve lidar com o estado inicial
      // Se o loading do AuthContext terminou e não há usuário, redireciona
      if (user === null && profile === null) { // Checa explicitamente por null após loading do AuthContext
         console.log("[AirbnbPage] Usuário não logado, redirecionando para login.");
         navigate("/login");
      }
      return; // Aguarda user e profile serem definidos pelo AuthProvider
    }

    console.log("[AirbnbPage] Perfil do usuário:", profile);
    const access = profile.allowed_assistants?.includes(ASSISTANT_TYPES.AIRBNB_PRICING_AGENT) || false;
    setHasAccess(access);

    if (!access) {
      console.log("[AirbnbPage] Acesso negado.");
      toast({
        title: "Acesso Negado",
        description: "Você não tem permissão para acessar este assistente.",
        variant: "destructive",
      });
      // navigate("/dashboard"); // Ou pode mostrar a mensagem de acesso negado na própria página
    }
    setPageLoading(false); // Termina o loading da página
  }, [user, profile, navigate, toast]);


  // Buscar propriedades do usuário
  useEffect(() => {
    const fetchPropriedades = async () => {
      if (!user || !hasAccess) return;
      console.log("[AirbnbPage] Buscando propriedades...");
      setLoadingPropriedades(true);
      try {
        const { data, error } = await supabase
          .from('airbnb_propriedades')
          .select(`
            id,
            id_airbnb,
            nome_propriedade_interno,
            titulo_anuncio_airbnb,
            localizacao_cidade,
            localizacao_bairro_area,
            tipo_propriedade_airbnb,
            numero_quartos_airbnb,
            numero_banheiros_airbnb,
            capacidade_hospedes_airbnb,
            preco_noite_base_airbnb,
            avaliacao_geral_media_airbnb,
            data_ultima_extracao_airbnb
          `)
          .eq('id_usuario_proprietario', user.id); // Filtra pelo usuário logado

        if (error) throw error;
        console.log("[AirbnbPage] Propriedades encontradas:", data);
        setPropriedades(data || []);
      } catch (error) {
        console.error("Erro ao buscar propriedades:", error);
        toast({
          title: "Erro ao carregar propriedades",
          description: "Não foi possível carregar suas propriedades.",
          variant: "destructive",
        });
      } finally {
        setLoadingPropriedades(false);
      }
    };

    if (hasAccess) {
      fetchPropriedades();
    }
  }, [hasAccess, user, toast]); // Adicionado user como dependência

  const handleNewPropertyChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewPropertyData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddPropertySubmit = async () => {
    if (!user) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      return;
    }
    if (!newPropertyData.id_airbnb_input.trim()) {
      toast({ title: "Campo obrigatório", description: "ID do Airbnb do seu anúncio é obrigatório.", variant: "destructive" });
      return;
    }

    setIsSavingProperty(true);
    let supabasePropertyId: string | null = null;

    try {
      const initialPropertyDataToInsert = {
        id_usuario_proprietario: user.id,
        id_airbnb: newPropertyData.id_airbnb_input.trim(),
        nome_propriedade_interno: newPropertyData.nome_propriedade_interno.trim() || `Propriedade ${newPropertyData.id_airbnb_input.trim()}`,
        // Placeholders para campos NOT NULL que serão preenchidos pelo N8N
        titulo_anuncio_airbnb: 'Aguardando dados do Airbnb...',
        descricao_completa_airbnb: 'Aguardando dados do Airbnb...',
        localizacao_cidade: 'Aguardando',
        localizacao_bairro_area: 'Aguardando',
        latitude: 0,
        longitude: 0,
        tipo_propriedade_airbnb: 'Aguardando',
        url_anuncio_airbnb: `https://www.airbnb.com/rooms/${newPropertyData.id_airbnb_input.trim()}`,
        numero_quartos_airbnb: 0,
        numero_banheiros_airbnb: 0,
        capacidade_hospedes_airbnb: 0,
        fotos_urls_airbnb: JSON.stringify([]),
        lista_comodidades_completa_airbnb: JSON.stringify([]),
        regras_casa_airbnb: 'Aguardando dados do Airbnb...',
        politica_cancelamento_airbnb: 'Aguardando dados do Airbnb...',
        nome_anfitriao_airbnb: 'Aguardando dados do Airbnb...',
        anfitriao_e_superhost_airbnb: false,
        preco_noite_base_airbnb: 0,
        moeda_preco_noite_airbnb: 'BRL', // Ou um default que faça sentido
        taxa_limpeza_airbnb: 0,
        taxa_servico_hospede_airbnb: 0,
        impostos_incluidos_preco_airbnb: false,
        estadia_minima_padrao_airbnb: 1,
        avaliacao_geral_media_airbnb: null,
        numero_total_avaliacoes_airbnb: 0,
        data_ultima_extracao_airbnb: '1970-01-01T00:00:00Z', // Indica que precisa ser extraído
      };
      console.log("[AirbnbPage] Inserindo propriedade inicial no Supabase:", initialPropertyDataToInsert);

      const { data, error } = await supabase
        .from('airbnb_propriedades')
        .insert([initialPropertyDataToInsert])
        .select('id, nome_propriedade_interno, id_airbnb') // Seleciona o necessário
        .single();

      if (error) throw error;

      if (data) {
        supabasePropertyId = data.id;
        console.log("[AirbnbPage] Propriedade inserida no Supabase, ID:", supabasePropertyId);
        // Atualiza a UI localmente para feedback imediato
        setPropriedades(prev => [...prev, data as AirbnbPropriedade]);
        toast({
          title: "Propriedade Adicionada!",
          description: `"${data.nome_propriedade_interno}" salva. Buscando detalhes completos do Airbnb...`,
        });

        // Chamar Webhook do n8n para buscar detalhes
        if (supabasePropertyId && newPropertyData.id_airbnb_input.trim()) {
          console.log("[AirbnbPage] Chamando webhook N8N para detalhamento...");
          try {
            // Adicione um timeout para a chamada do webhook para não prender a UI
            const webhookPromise = fetch('https://agentes-rioh-digital-n8n.sobntt.easypanel.host/webhook/71b48c1f-a614-437f-9286-0a94aea917ab', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id_airbnb_propriedade_supabase: supabasePropertyId,
                id_airbnb: newPropertyData.id_airbnb_input.trim(),
              }),
            });
            // Não esperamos (await) o webhook aqui para não bloquear a UI.
            // O N8N pode demorar, o importante é que a chamada foi feita.
             webhookPromise.then(response => {
                 if (!response.ok) {
                     console.error("Resposta não OK do webhook N8N:", response.status, response.statusText);
                     // Não lançar erro aqui para não quebrar o fluxo do usuário, apenas logar
                 } else {
                     console.log("Webhook N8N chamado com sucesso (resposta inicial OK).");
                 }
             }).catch(webhookError => {
                console.error("Erro ao chamar webhook N8N (fetch):", webhookError);
             });

          } catch (webhookError) { // Este catch pode não ser atingido se o fetch em si não lançar
            console.error("Erro SÍNCRONO ao tentar chamar webhook n8n:", webhookError);
            toast({
              title: "Aviso",
              description: "Propriedade salva, mas houve um erro ao iniciar a busca de detalhes. A busca pode tentar novamente em breve.",
              variant: "default",
            });
          }
        }
        setIsAddPropertyDialogOpen(false);
        setNewPropertyData(initialNewPropertyState); // Reseta o formulário
      }
    } catch (error: any) {
      console.error("Erro ao adicionar propriedade no Supabase:", error);
      toast({
        title: "Erro ao adicionar propriedade",
        description: error.message || "Não foi possível salvar. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProperty(false);
    }
  };


  if (pageLoading) {
    return (
      <div className="container py-8 flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Verificando permissões...</span>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="container py-8">
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2"> <AlertCircle className="h-5 w-5 text-destructive" /> <CardTitle>Acesso Negado</CardTitle> </div>
            <CardDescription> Você não tem permissão para acessar este assistente. </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground"> Entre em contato com um administrador para solicitar acesso. </p>
            <Button onClick={() => navigate("/dashboard")} variant="default" className="mt-4"> Voltar para o Dashboard </Button>
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
            Otimize a precificação dos seus imóveis com análises de mercado.
          </p>
        </div>
        <Dialog open={isAddPropertyDialogOpen} onOpenChange={setIsAddPropertyDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>Adicionar Propriedade</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Propriedade Airbnb</DialogTitle>
              <DialogDescription>
                Forneça o ID do seu anúncio no Airbnb e um apelido. Buscaremos os detalhes.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="id_airbnb_input" className="text-right">ID do Anúncio*</Label>
                <Input
                  id="id_airbnb_input"
                  name="id_airbnb_input"
                  value={newPropertyData.id_airbnb_input}
                  onChange={handleNewPropertyChange}
                  className="col-span-3"
                  placeholder="Ex: 12345678 (somente números)"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nome_propriedade_interno" className="text-right">Apelido</Label>
                <Input
                  id="nome_propriedade_interno"
                  name="nome_propriedade_interno"
                  value={newPropertyData.nome_propriedade_interno}
                  onChange={handleNewPropertyChange}
                  className="col-span-3"
                  placeholder="Ex: Casa de Praia da Família (Opcional)"
                />
              </div>
            </div>
            <DialogFooterComponent>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="button" onClick={handleAddPropertySubmit} disabled={isSavingProperty}>
                {isSavingProperty && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar e Buscar Detalhes
              </Button>
            </DialogFooterComponent>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="propriedades" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="propriedades" className="flex items-center gap-2"> <Home className="h-4 w-4" /> <span>Minhas Propriedades</span> </TabsTrigger>
          <TabsTrigger value="configuracoes" className="flex items-center gap-2"> <Settings className="h-4 w-4" /> <span>Configurações</span> </TabsTrigger>
        </TabsList>

        <TabsContent value="propriedades" className="space-y-6">
          {loadingPropriedades ? (
            <div className="flex items-center justify-center py-12"> <Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Carregando propriedades...</span> </div>
          ) : propriedades.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {propriedades.map(prop => (
                <Card key={prop.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{prop.nome_propriedade_interno || `Propriedade ID: ${prop.id_airbnb}`}</CardTitle>
                    <CardDescription>{prop.localizacao_cidade || 'Cidade não informada'}, {prop.localizacao_bairro_area || 'Bairro não informado'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                       {prop.titulo_anuncio_airbnb !== 'Aguardando dados do Airbnb...' && prop.titulo_anuncio_airbnb && (
                           <p className="text-sm text-muted-foreground italic">"{prop.titulo_anuncio_airbnb}"</p>
                       )}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-muted-foreground">Tipo</p><p className="font-medium">{prop.tipo_propriedade_airbnb || 'N/D'}</p></div>
                        <div><p className="text-muted-foreground">Preço base</p><p className="font-medium">R$ {(prop.preco_noite_base_airbnb ?? 0).toFixed(2)}</p></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div><p className="text-muted-foreground">Quartos</p><p className="font-medium">{prop.numero_quartos_airbnb ?? 'N/D'}</p></div>
                        <div><p className="text-muted-foreground">Banheiros</p><p className="font-medium">{prop.numero_banheiros_airbnb ?? 'N/D'}</p></div>
                        <div><p className="text-muted-foreground">Hóspedes</p><p className="font-medium">{prop.capacidade_hospedes_airbnb ?? 'N/D'}</p></div>
                      </div>
                      {prop.data_ultima_extracao_airbnb === '1970-01-01T00:00:00Z' && (
                        <p className="text-xs text-amber-600">Aguardando busca de detalhes do Airbnb...</p>
                      )}
                      <Separator />
                      <Button variant="outline" className="w-full" onClick={() => alert(`Detalhes da propriedade: ${prop.id}`)}>Ver Detalhes</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Nenhuma propriedade encontrada</CardTitle>
                <CardDescription> Você ainda não cadastrou nenhuma propriedade. </CardDescription>
              </CardHeader>
              <CardContent>
                 <Dialog open={isAddPropertyDialogOpen} onOpenChange={setIsAddPropertyDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="flex items-center gap-2"> <PlusCircle className="h-4 w-4" /> <span>Adicionar Sua Primeira Propriedade</span> </Button>
                    </DialogTrigger>
                    {/* O DialogContent é o mesmo definido acima */}
                 </Dialog>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="configuracoes">
          <Card> <CardHeader> <CardTitle>Configurações do Agente</CardTitle> <CardDescription> Configure as preferências do seu Agente. </CardDescription> </CardHeader> <CardContent> <p className="text-muted-foreground"> Em breve. </p> </CardContent> </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
