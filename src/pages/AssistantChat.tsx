
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { History, Send, Trash2, ArchiveX } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Define o tipo de mensagem para uso no chat
interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

// Define a interface para o assistente (mínimo necessário para o cabeçalho)
interface AssistantInfo {
  id: string;
  name: string;
  icon?: string;
}

// --- Mock Data (Apenas para o nome/ícone no cabeçalho) ---
const assistantDisplayInfo: { [key: string]: { name: string, icon: string } } = {
  "assistente_de_resultados_esportivos": { name: "Resultados Esportivos Oficiais", icon: "🏆" },
  "digirioh": { name: "DigiRioh", icon: "⚙️" },
  "agente_do_booking": { name: "Agente do Booking", icon: "🏨" },
  "agente_de_airbnb": { name: "Agente de Airbnb", icon: "🏠" },
};
// --- Fim do Mock Data ---

// *** VOLTAMOS A USAR A VARIÁVEL DE AMBIENTE PARA A URL BASE ***
// Certifique-se que VITE_N8N_WEBHOOK_URL está definida no seu .env na raiz do projeto
const N8N_WEBHOOK_BASE_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || "https://seu-servidor-n8n.com"; // Fallback seguro sem /webhook

const AssistantChat = () => {
  const { assistantType } = useParams<{ assistantType: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAssistant, setCurrentAssistant] = useState<AssistantInfo | null>(null);
  const leftScrollAreaRef = useRef<HTMLDivElement>(null);
  const rightScrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (assistantType) {
      const displayInfo = assistantDisplayInfo[assistantType] || { name: assistantType, icon: '🤖' };
      setCurrentAssistant({
        id: assistantType,
        name: displayInfo.name,
        icon: displayInfo.icon,
      });
      setMessages([{
        sender: 'assistant',
        text: `Olá! 👋 Sou o Agente de Resultados Esportivos Oficiais. Para verificar sua aposta, por favor, informe: ⚽ Jogo (Time A vs Time B), 📅 Data (YYYY-MM-DD), 📊 Mercado (ex: Placar Final) e ✅ Seleção (ex: Time A vence).`
      }]);
      setError(null); // Limpa erros ao trocar
      setIsLoading(false); // Reseta loading
    } else {
      navigate('/dashboard');
    }
  }, [assistantType, navigate]);

  useEffect(() => {
    // Scroll para baixo automaticamente quando novas mensagens são adicionadas
    if (leftScrollAreaRef.current) {
      const viewportElement = leftScrollAreaRef.current.querySelector<HTMLDivElement>('div[style*="overflow: scroll;"]');
      if (viewportElement) {
        viewportElement.scrollTop = viewportElement.scrollHeight;
      }
    }
    
    if (rightScrollAreaRef.current) {
      const viewportElement = rightScrollAreaRef.current.querySelector<HTMLDivElement>('div[style*="overflow: scroll;"]');
      if (viewportElement) {
        viewportElement.scrollTop = viewportElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    // Verifica se temos tudo necessário
    if (!inputValue.trim() || isLoading || !currentAssistant || !N8N_WEBHOOK_BASE_URL || N8N_WEBHOOK_BASE_URL === "https://seu-servidor-n8n.com" || !user || !user.id) {
      if (N8N_WEBHOOK_BASE_URL === "https://seu-servidor-n8n.com") {
        console.error("ERRO CRÍTICO: VITE_N8N_WEBHOOK_URL não está definida no ambiente (.env). Usando URL de fallback inválida.");
        setError("Erro de configuração: URL do N8N não definida.");
      } else {
        console.warn("Pré-requisitos para envio não atendidos:", { inputValue, currentAssistant, N8N_WEBHOOK_BASE_URL, user });
      }
      return;
    }

    // O ID específico do webhook N8N a ser chamado
    const webhookPath = "5c024eb2-5ab2-4be3-92f9-26250da4c65d"; // ID do seu nó Webhook
    if (!webhookPath) {
      setError("Configuração do webhook path ausente.");
      console.error("Erro: webhookPath está faltando.");
      return;
    }

    // *** VOLTAMOS A CONSTRUIR A URL ABSOLUTA COMPLETA ***
    const fullWebhookUrl = `${N8N_WEBHOOK_BASE_URL.replace(/\/$/, '')}/webhook/${webhookPath}`;

    const userMessage: Message = { sender: 'user', text: inputValue.trim() };
    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      // Salvar mensagem do usuário no Supabase
      if (user && user.id && currentAssistant) {
        await supabase.from('chat_history').insert({
          user_id: user.id,
          assistant_type: currentAssistant.id,
          message_content: userMessage.text,
          sender: userMessage.sender,
          session_id: user.id // Usando user.id como session_id por simplicidade
        });
      }
      
      console.log(`[LOG] Enviando para URL (Direto): ${fullWebhookUrl}`); 
      const payload = {
        message: messageToSend,
        userId: user.id,
        sessionId: user.id 
      };
      console.log("[LOG] Payload:", JSON.stringify(payload, null, 2));

      // O fetch agora usa a URL ABSOLUTA direta do N8N
      const response = await fetch(fullWebhookUrl, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log(`[LOG] Resposta recebida. Status: ${response.status} ${response.statusText}`);
      console.log("[LOG] Content-Type Header recebido:", response.headers.get('Content-Type'));

      let responseText = await response.text();
      console.log("[LOG] Raw response text recebido:", responseText);

      // Checa se a resposta foi OK (status 2xx)
      if (!response.ok) {
        throw new Error(`Erro na API: Status ${response.status}. Resposta não era OK. Início da resposta: ${responseText.substring(0, 200)}...`);
      }

      // Tenta analisar como JSON apenas se a resposta for OK
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("[LOG] Falha ao analisar a resposta como JSON:", parseError);
        throw new Error(`Resposta recebida do N8N não é JSON válido. Início da resposta: ${responseText.substring(0, 200)}...`);
      }

      console.log("[LOG] Dados JSON analisados:", data);

      const assistantReply = data.reply || data.output || data.result || data[0]?.json?.reply || null;

      if (assistantReply !== null && typeof assistantReply === 'string') {
        const assistantMessage: Message = { sender: 'assistant', text: assistantReply };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Salvar resposta do assistente no Supabase
        if (user && user.id && currentAssistant) {
          await supabase.from('chat_history').insert({
            user_id: user.id,
            assistant_type: currentAssistant.id,
            message_content: assistantMessage.text,
            sender: assistantMessage.sender,
            session_id: user.id // Usando user.id como session_id por simplicidade
          });
        }
      } else {
        console.warn("[LOG] Campo de resposta esperado não encontrado ou não é string no JSON:", data);
        setMessages(prev => [...prev, { sender: 'assistant', text: "Recebi sua mensagem, mas não consegui formatar a resposta." }]);
      }

    } catch (err: any) {
      console.error("[LOG] Erro no bloco catch principal:", err);
      let displayError = `Erro ao conectar com o assistente: ${err.message}`;
      if (err instanceof TypeError && err.message.toLowerCase().includes('failed to fetch')) {
        displayError += " (Possível problema de CORS ou rede. Verifique a configuração CORS no N8N e a acessibilidade da URL.)";
      }
      setError(displayError);
      setMessages(prev => [...prev, { sender: 'assistant', text: `Desculpe, ocorreu um erro. (${err.message})` }]);
    } finally {
      setIsLoading(false);
      console.log("[LOG] Finalizando handleSendMessage.");
    }
  };

  const handleClearChat = () => {
    if (currentAssistant) {
      setMessages([{
        sender: 'assistant',
        text: `Olá! 👋 Sou o Agente de Resultados Esportivos Oficiais. Para verificar sua aposta, por favor, informe: ⚽ Jogo (Time A vs Time B), 📅 Data (YYYY-MM-DD), 📊 Mercado (ex: Placar Final) e ✅ Seleção (ex: Time A vence).`
      }]);
    } else {
      setMessages([]);
    }
    setInputValue("");
    setError(null);
  };

  const handleClearHistory = async () => {
    if (!user || !currentAssistant) return;
    
    if (window.confirm("Tem certeza que deseja apagar todo o histórico de conversas salvo?")) {
      try {
        await supabase
          .from('chat_history')
          .delete()
          .eq('user_id', user.id)
          .eq('assistant_type', currentAssistant.id);
        
        console.log("Histórico apagado com sucesso");
      } catch (error) {
        console.error("Erro ao apagar histórico:", error);
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <ChatHeader 
        icon={currentAssistant?.icon} 
        name={currentAssistant?.name}
        gifUrl="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExODIxcDQ4azljM2lxMHlmdGQ5NHR0bWhrNXlycWwzcDF0MThudWRoNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/elatsjsGzdLtNov4Ky/giphy.gif"
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Painel Esquerdo - Controle e Input do Usuário */}
        <aside className="w-1/3 bg-muted/50 border-r flex flex-col p-4">
          {/* Botões de Controle */}
          <div className="flex gap-2 mb-4">
            <Button variant="ghost" className="flex-1">
              <History className="h-4 w-4 mr-2" />
              Expandir Histórico
            </Button>
            <Button variant="ghost" onClick={handleClearHistory} className="flex-1">
              <ArchiveX className="h-4 w-4 mr-2" />
              Limpar Histórico
            </Button>
          </div>
          
          {/* Área de Mensagens do Usuário */}
          <ScrollArea className="flex-grow mb-4" ref={leftScrollAreaRef}>
            <div className="space-y-4">
              {messages
                .filter(msg => msg.sender === 'user')
                .map((msg, index) => (
                  <div key={`user-${index}`} className="flex justify-end">
                    <Card className="max-w-[90%] p-3 bg-primary text-primary-foreground rounded-br-none shadow-sm">
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    </Card>
                  </div>
                ))}
            </div>
          </ScrollArea>
          
          {/* Área de Input do Usuário */}
          <form onSubmit={handleSendMessage} className="space-y-4">
            <Textarea
              placeholder="Digite sua mensagem aqui..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              className="min-h-[100px] resize-none bg-background"
            />
            
            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={isLoading || !inputValue.trim()}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleClearChat}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Chat
              </Button>
            </div>
          </form>
        </aside>
        
        {/* Painel Direito - Output do Assistente */}
        <main className="w-2/3 bg-background">
          <ScrollArea className="h-full p-4" ref={rightScrollAreaRef}>
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages
                .filter(msg => msg.sender === 'assistant')
                .map((msg, index) => (
                  <div key={`assistant-${index}`} className="flex justify-start">
                    <Card className="max-w-[90%] p-3 bg-muted text-muted-foreground rounded-bl-none shadow-sm">
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    </Card>
                  </div>
                ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <Card className="max-w-[90%] p-3 bg-muted text-muted-foreground rounded-bl-none shadow-sm">
                    <div className="flex flex-col items-center space-y-2">
                      <img 
                        src="https://media.giphy.com/channel_assets/sports/P658KMA9mwy4/200h.gif" 
                        alt="Loading" 
                        className="h-16 w-auto"
                      />
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-sm italic">Analisando...</span>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
              
              {error && (
                <div className="flex justify-start">
                  <Card className="max-w-[90%] p-3 bg-destructive text-destructive-foreground rounded-bl-none shadow-sm">
                    <p className="text-sm">{error}</p>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
};

export default AssistantChat;
