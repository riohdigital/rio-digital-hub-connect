
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send } from "lucide-react";
import { Assistant } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

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

interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

export default function AssistantChat() {
  const { assistantType } = useParams<{ assistantType: string }>();
  const { user, userPlans } = useAuth();
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Find the assistant based on the URL parameter
    const foundAssistant = availableAssistants.find(a => a.type === assistantType);
    if (!foundAssistant) {
      toast({
        title: "Assistente não encontrado",
        description: "O assistente solicitado não foi encontrado.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }
    
    setAssistant(foundAssistant);

    // Check if the user has access to this assistant
    const hasAccess = userPlans.some(plan => plan.plan_name === assistantType);
    if (!hasAccess) {
      toast({
        title: "Acesso Restrito",
        description: "Você não possui acesso a este assistente. Adquira um plano para continuar.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    // Add a welcome message from the assistant
    setMessages([
      {
        id: "welcome",
        content: `Olá! Eu sou o assistente de ${foundAssistant.name}. Como posso ajudar você hoje?`,
        sender: "assistant",
        timestamp: new Date(),
      },
    ]);
  }, [assistantType, navigate, toast, userPlans]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !assistant?.webhook_url) return;
    
    const newUserMessage: Message = {
      id: Date.now().toString(),
      content: messageInput,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    setMessageInput("");
    setIsLoading(true);

    try {
      // Send message to the N8N webhook
      const response = await fetch(assistant.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageInput,
          userId: user?.id,
          assistantType: assistant.type,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha na comunicação com o assistente.");
      }

      const responseData = await response.json();
      
      // Add the assistant's response
      const assistantMessage: Message = {
        id: Date.now().toString() + "-response",
        content: responseData.reply || "Desculpe, não consegui processar sua solicitação.",
        sender: "assistant",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message to webhook:", error);
      
      // Add an error message
      const errorMessage: Message = {
        id: Date.now().toString() + "-error",
        content: "Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde.",
        sender: "assistant",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Erro na comunicação",
        description: "Não foi possível se comunicar com o assistente. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!assistant) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="bg-secondary/60 p-4 border-b">
        <div className="container flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} aria-label="Back to Dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <span className="text-2xl mr-2">{assistant.icon}</span>
            <div>
              <h1 className="font-semibold text-lg">{assistant.name}</h1>
              <p className="text-sm text-muted-foreground">{assistant.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div 
        className="flex-1 overflow-y-auto p-4 pb-20 bg-secondary/20"
        ref={chatContainerRef}
        style={{ 
          backgroundImage: assistant.type === "assistente_de_resultados_esportivos" 
            ? "url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=2070&auto=format')"
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundBlendMode: "overlay",
        }}
      >
        <div className="container max-w-4xl">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.sender === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background shadow-sm"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <div
                  className={`text-xs mt-1 ${
                    message.sender === "user"
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-background rounded-lg p-4 max-w-[80%] shadow-sm flex items-center space-x-2">
                <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 bg-primary rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-background p-4 border-t sticky bottom-0 z-10">
        <div className="container max-w-4xl flex gap-2 items-end">
          <Textarea
            className="flex-1 resize-none"
            placeholder="Digite sua mensagem aqui..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyPress}
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !messageInput.trim()}
            className="flex-shrink-0"
          >
            <Send className="h-5 w-5" />
            <span className="sr-only">Enviar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
