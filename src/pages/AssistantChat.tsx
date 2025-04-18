import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom"; 
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Send, Loader2, ArrowLeft } from "lucide-react"; 

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
  const scrollAreaRef = useRef<HTMLDivElement>(null); 

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
        text: `Olá! Sou o ${displayInfo.name}. Como posso ajudar você hoje?`
      }]);
      setError(null); // Limpa erros ao trocar
      setIsLoading(false); // Reseta loading
    } else {
      navigate('/dashboard');
    }
  }, [assistantType, navigate]);

   useEffect(() => {
    if (scrollAreaRef.current) {
        const viewportElement = scrollAreaRef.current.querySelector<HTMLDivElement>('div[style*="overflow: scroll;"]');
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

    let responseText = '';

    try {
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
                 // Adicione Auth headers aqui se o N8N precisar
                // 'Authorization': 'Basic ...',
                // 'X-N8N-Api-Key': '...',
            },
            body: JSON.stringify(payload),
        });

        console.log(`[LOG] Resposta recebida. Status: ${response.status} ${response.statusText}`);
        console.log("[LOG] Content-Type Header recebido:", response.headers.get('Content-Type'));

        responseText = await response.text();
        console.log("[LOG] Raw response text recebido:", responseText);

        // Checa se a resposta foi OK (status 2xx)
        if (!response.ok) {
             // Erro pode ser CORS (se não configurado no N8N) ou erro do N8N (4xx, 5xx)
             // O fetch pode falhar totalmente (ex: rede, DNS) - isso cai no catch
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
        } else {
            console.warn("[LOG] Campo de resposta esperado não encontrado ou não é string no JSON:", data);
            setMessages(prev => [...prev, { sender: 'assistant', text: "Recebi sua mensagem, mas não consegui formatar a resposta." }]);
        }

    } catch (err: any) {
        // Erros de rede, CORS, ou os erros que jogamos no try caem aqui
        console.error("[LOG] Erro no bloco catch principal:", err);
        // Adiciona verificação específica para CORS
        let displayError = `Erro ao conectar com o assistente: ${err.message}`;
        if (err instanceof TypeError && err.message.toLowerCase().includes('failed to fetch')) {
             // Tenta detectar erro de CORS ou rede
             displayError += " (Possível problema de CORS ou rede. Verifique a configuração CORS no N8N e a acessibilidade da URL.)";
        }
        setError(displayError);
        setMessages(prev => [...prev, { sender: 'assistant', text: `Desculpe, ocorreu um erro. (${err.message})` }]);
    } finally {
        setIsLoading(false);
        console.log("[LOG] Finalizando handleSendMessage.");
    }
  };

  // Renderização JSX permanece a mesma da versão anterior (com proxy)
  // ... (Cole a seção return inteira aqui, igual à da resposta anterior) ...
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background"> {/* Ajuste a altura conforme navbar principal */}

      {/* Cabeçalho */}
      <header className="flex items-center p-4 border-b bg-card shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="mr-2">
             <ArrowLeft className="h-5 w-5" />
        </Button>
        {currentAssistant?.icon && <div className="text-3xl mr-3">{currentAssistant.icon}</div>}
        <h1 className="text-xl font-semibold">
          {currentAssistant ? currentAssistant.name : "Carregando Assistente..."}
        </h1>
      </header>

       {/* Área do Chat */}
       <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
         <div className="space-y-4 max-w-4xl mx-auto"> {/* Centraliza e limita largura */}
           {messages.map((msg, index) => (
             <div
               key={index}
               className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
             >
               <Card className={`max-w-[80%] p-3 shadow-sm ${
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
                 <Card className="max-w-[80%] p-3 bg-muted text-muted-foreground rounded-bl-none shadow-sm">
                     <div className="flex items-center space-x-2">
                         <Loader2 className="h-4 w-4 animate-spin" />
                         <span className="text-sm italic">Digitando...</span>
                     </div>
                 </Card>
              </div>
           )}
            {error && (
              <div className="flex justify-start">
                 <Card className="max-w-[80%] p-3 bg-destructive text-destructive-foreground rounded-bl-none shadow-sm">
                     <p className="text-sm">{error}</p>
                 </Card>
              </div>
           )}
         </div>
       </ScrollArea>

       {/* Área de Input */}
       <footer className="p-4 border-t bg-card sticky bottom-0">
         <div className="max-w-4xl mx-auto"> {/* Centraliza e limita largura */}
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
         </div>
       </footer>
     </div>
  );
};

export default AssistantChat;
