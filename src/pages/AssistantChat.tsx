import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Assistant } from '@/lib/supabase'; // Importe a definição do tipo Assistant
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Send } from 'lucide-react';

// --- Mock Data ---
// Cole ou importe a mesma constante 'availableAssistants' do Dashboard.tsx aqui
// ou crie um arquivo separado (ex: src/lib/assistants.ts) e importe de lá.
// **IMPORTANTE**: Preencha os 'webhook_url' CORRETOS!
const availableAssistants: Assistant[] = [
  {
    id: "1",
    name: "Resultados Esportivos Oficiais",
    description: "Obtenha os resultados mais atualizados de partidas esportivas em tempo real.",
    icon: "🏆",
    type: "assistente_de_resultados_esportivos",
    webhook_url: "COLOQUE_A_URL_DO_WEBHOOK_N8N_AQUI_PARA_RESULTADOS" // <-- Preencha!
  },
  {
    id: "2",
    name: "DigiRioh",
    description: "Assistente digital para otimização de processos e tomada de decisão.",
    icon: "⚙️",
    type: "digirioh",
    webhook_url: "COLOQUE_A_URL_DO_WEBHOOK_N8N_AQUI_PARA_DIGIRIOH" // <-- Preencha!
  },
  {
    id: "3",
    name: "Agente do Booking",
    description: "Otimize suas reservas e maximize sua ocupação com nosso assistente especializado.",
    icon: "🏨",
    type: "agente_do_booking",
    webhook_url: "COLOQUE_A_URL_DO_WEBHOOK_N8N_AQUI_PARA_BOOKING" // <-- Preencha!
  },
  {
    id: "4",
    name: "Agente de Airbnb",
    description: "Maximize o potencial de seus imóveis no Airbnb com recomendações personalizadas.",
    icon: "🏠",
    type: "agente_de_airbnb",
    webhook_url: "COLOQUE_A_URL_DO_WEBHOOK_N8N_AQUI_PARA_AIRBNB" // <-- Preencha!
  }
];
// --- Fim do Mock Data ---


interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

export default function AssistantChat() {
  const { assistantType } = useParams<{ assistantType: string }>();
  const { user, userPlans } = useAuth(); // Pega o usuário logado e seus planos
  const navigate = useNavigate();
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const foundAssistant = availableAssistants.find(a => a.type === assistantType);
    if (foundAssistant) {
        // Verifica se o usuário tem acesso a este assistente
        const hasAccess = userPlans.some(plan => plan.plan_name === foundAssistant.type);
        if (!hasAccess) {
            // Redireciona se não tiver acesso (ou mostra mensagem)
            navigate('/dashboard'); // Ou para uma página de acesso negado
            return;
        }
        setCurrentAssistant(foundAssistant);
        // Adiciona mensagem inicial se desejar
        setMessages([{ sender: 'assistant', text: `Olá! Sou o ${foundAssistant.name}. Como posso ajudar?` }]);
    } else {
        // Assistente não encontrado, talvez redirecionar
         navigate('/dashboard'); // Ou para página de erro
    }
  }, [assistantType, userPlans, navigate]);

  // Efeito para rolar para o final quando novas mensagens chegam
  useEffect(() => {
    if (scrollAreaRef.current) {
        const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollElement) {
            scrollElement.scrollTop = scrollElement.scrollHeight;
        }
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading || !currentAssistant || !currentAssistant.webhook_url || !user) return;

    const userMessage: Message = { sender: 'user', text: inputValue.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(currentAssistant.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Adicione outros headers se o N8N precisar (ex: Authorization)
        },
        body: JSON.stringify({
          message: userMessage.text,
          userId: user.id, // Envia o ID do usuário do Supabase
          // Adicione outros dados se necessário (profile, etc.)
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.statusText}`);
      }

      // Assume que o N8N retorna um JSON com a chave 'reply'
      const data = await response.json();

      if (data.reply) {
        const assistantMessage: Message = { sender: 'assistant', text: data.reply };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
         throw new Error("Resposta da API não continha a chave 'reply'.");
      }

    } catch (err: any) {
      console.error("Erro ao chamar webhook N8N:", err);
      setError(`Erro ao conectar com o assistente: ${err.message}`);
      // Adiciona uma mensagem de erro ao chat (opcional)
      setMessages(prev => [...prev, {sender: 'assistant', text: `Desculpe, ocorreu um erro. (${err.message})`}]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentAssistant) {
    // Pode mostrar um spinner de carregamento mais robusto aqui
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Cabeçalho */}
      <header className="flex items-center p-4 border-b bg-card shadow-sm">
         <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="mr-2">
             <ArrowLeft className="h-5 w-5" />
         </Button>
         <div className="text-3xl mr-3">{currentAssistant.icon}</div>
         <h1 className="text-xl font-semibold">{currentAssistant.name}</h1>
         {/* Pode adicionar mais infos ou ações aqui */}
      </header>

      {/* Área do Chat */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card className={`max-w-[75%] p-3 ${
                  msg.sender === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-muted text-muted-foreground rounded-bl-none'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              </Card>
            </div>
          ))}
          {isLoading && (
             <div className="flex justify-start">
                <Card className="max-w-[75%] p-3 bg-muted text-muted-foreground rounded-bl-none">
                    <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm italic">Assistente digitando...</span>
                    </div>
                </Card>
             </div>
          )}
           {error && (
             <div className="flex justify-start">
                <Card className="max-w-[75%] p-3 bg-destructive text-destructive-foreground rounded-bl-none">
                    <p className="text-sm">{error}</p>
                </Card>
             </div>
          )}
        </div>
      </ScrollArea>

      {/* Área de Input */}
      <footer className="p-4 border-t bg-card">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Digite sua mensagem aqui..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !inputValue.trim()} size="icon">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4"/>}
            <span className="sr-only">Enviar</span>
          </Button>
        </form>
      </footer>
    </div>
  );
}
