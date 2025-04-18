
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { Assistant } from "@/lib/supabase";

// Mock assistants data (In a real app, this would come from an API/Supabase)
const availableAssistants: Assistant[] = [
  {
    id: "1",
    name: "Resultados Esportivos Oficiais",
    description: "Obtenha os resultados mais atualizados de partidas esportivas em tempo real.",
    icon: "🏆",
    type: "assistente_de_resultados_esportivos",
    webhook_url: "https://your-n8n-webhook-url.com/webhook/sports-results"
  },
  {
    id: "2",
    name: "DigiRioh",
    description: "Assistente digital para otimização de processos e tomada de decisão.",
    icon: "⚙️",
    type: "digirioh"
  },
  {
    id: "3",
    name: "Agente do Booking",
    description: "Otimize suas reservas e maximize sua ocupação com nosso assistente especializado.",
    icon: "🏨",
    type: "agente_do_booking"
  },
  {
    id: "4",
    name: "Agente de Airbnb",
    description: "Maximize o potencial de seus imóveis no Airbnb com recomendações personalizadas.",
    icon: "🏠",
    type: "agente_de_airbnb"
  }
];

export default function Dashboard() {
  const { user, profile, userPlans } = useAuth();
  const [myAssistants, setMyAssistants] = useState<Assistant[]>([]);
  
  useEffect(() => {
    // Find the user's subscribed assistants based on userPlans
    const subscribedAssistants = availableAssistants.filter(assistant => 
      userPlans.some(plan => plan.plan_name === assistant.type)
    );
    setMyAssistants(subscribedAssistants);
  }, [userPlans]);

  const hasAccess = (assistantType: string) => {
    return userPlans.some(plan => plan.plan_name === assistantType);
  };

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Bem-vindo, {profile?.full_name || user?.email}</h1>
          <p className="text-muted-foreground">Acesse seus assistentes de IA RIOH DIGITAL</p>
        </div>
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Meus Assistentes</h2>
        
        {myAssistants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myAssistants.map(assistant => (
              <Card key={assistant.id} className="hover:shadow-md transition-shadow overflow-hidden border-2 border-primary/10">
                <CardHeader className="bg-secondary/50 pb-4">
                  <div className="flex justify-between items-center">
                    <div className="text-4xl">{assistant.icon}</div>
                    <Badge variant="outline" className="bg-accent text-accent-foreground font-medium">
                      Ativo
                    </Badge>
                  </div>
                  <CardTitle className="mt-2">{assistant.name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <CardDescription className="text-sm text-foreground/80 min-h-[60px]">
                    {assistant.description}
                  </CardDescription>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link 
                      to={assistant.type === 'assistente_de_resultados_esportivos' 
                        ? '/sports-results' 
                        : `/assistants/${assistant.type}`}
                    >
                      Acessar
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-muted/40">
            <CardHeader>
              <CardTitle className="text-xl">Nenhum assistente ativo</CardTitle>
              <CardDescription>
                Você não tem assinaturas ativas no momento. Adquira um plano abaixo para começar.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-6">Descubra Nossos Assistentes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableAssistants.map(assistant => {
            const subscribed = hasAccess(assistant.type);
            
            return (
              <Card key={assistant.id} className={`overflow-hidden ${subscribed ? 'border-2 border-accent' : ''}`}>
                <CardHeader className={subscribed ? 'bg-secondary/50' : ''}>
                  <div className="flex justify-between items-center">
                    <div className="text-4xl">{assistant.icon}</div>
                    {subscribed && (
                      <div className="flex items-center text-sm text-accent font-medium">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Adquirido
                      </div>
                    )}
                  </div>
                  <CardTitle className="mt-2">{assistant.name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <CardDescription className="text-sm text-foreground/80 min-h-[60px]">
                    {assistant.description}
                  </CardDescription>
                </CardContent>
                <CardFooter>
                  {subscribed ? (
                    <Button asChild className="w-full">
                      <Link to={`/assistants/${assistant.type}`}>
                        Acessar
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full">
                      Saiba Mais
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
