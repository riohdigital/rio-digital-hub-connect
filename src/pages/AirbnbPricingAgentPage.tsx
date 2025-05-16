
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { hasAssistantAccess } from "@/lib/supabase";
import { ASSISTANT_TYPES } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";

export default function AirbnbPricingAgentPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

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
            <button 
              onClick={() => navigate("/dashboard")} 
              className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Voltar para o Dashboard
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Agente de Precificação Airbnb</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Análise de Precificação</CardTitle>
          <CardDescription>
            Otimize seus preços baseado em dados de mercado e maximização de receita.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Funcionalidades do agente virão aqui. Esta página está em desenvolvimento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
