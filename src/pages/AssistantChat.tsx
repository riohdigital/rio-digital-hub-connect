import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom"; // Import useNavigate
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Send, Loader2, ArrowLeft } from "lucide-react"; // Import Loader2 e ArrowLeft

// Define o tipo de mensagem para uso no chat
interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

// Defina a interface para o assistente (mínimo necessário para o cabeçalho)
interface AssistantInfo {
  id: string;
  name: string;
  // Opcional: Adicione icon, description se for buscar/usar
  icon?: string; 
}

// --- Mock Data (Apenas para o nome/ícone no cabeçalho) ---
// Você pode buscar isso de forma mais robusta se necessário
const assistantDisplayInfo: { [key: string]: { name: string, icon: string } } = {
  "assistente_de_resultados_esportivos": { name: "Resultados Esportivos Oficiais", icon: "🏆" },
  "digirioh": { name: "DigiRioh", icon: "⚙️" },
  "agente_do_booking": { name: "Agente do Booking", icon: "🏨" },
  "agente_de_airbnb": { name: "Agente de Airbnb", icon: "🏠" },
};
// --- Fim do Mock Data ---


const AssistantChat = () => {
  const { assistantType } = useParams<{ assistantType: string }>(); // Garante que assistantType é string
  const { user } = useAuth();
  const navigate = useNavigate(); // Hook para navegação
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAssistant, setCurrentAssistant] = useState<AssistantInfo | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null); // Ref para a ScrollArea

  useEffect(() => {
    // Carrega informações básicas do assistente com base no tipo da URL
    if (assistantType) {
      const displayInfo = assistantDisplayInfo[assistantType] || { name: assistantType, icon: '🤖' };
      setCurrentAssistant({
        id: assistantType,
        name: displayInfo.name,
        icon: displayInfo.icon,
      });

      // Limpa as mensagens e erros ao trocar de assistente
      setMessages([]);
      setError(null);
      setIsLoading(false); // Garante que o loading reset

      // Adiciona uma mensagem de boas-vindas
      setMessages([{
        sender: 'assistant',
        text: `Olá! Sou o ${displayInfo.name}. Como posso ajudar você hoje?`
      }]);
    } else {
      // Se não houver tipo, talvez redirecionar ou mostrar erro
      navigate('/dashboard');
    }
  }, [assistantType, navigate]);

   // Efeito para rolar para o final quando novas mensagens chegam
   useEffect(() => {
    if (scrollAreaRef.current) {
        // Acessa o elemento viewport diretamente (ajustado para estrutura do Shadcn ScrollArea)
        const viewportElement = scrollAreaRef.current.querySelector<HTMLDivElement>('div[style*="overflow: scroll;"]');
        if (viewportElement) {
            viewportElement.scrollTop = viewportElement.scrollHeight;
        }
    }
  }, [messages]);


  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    // Simplifica a checagem - só precisa de input, assistente e usuário
    if (!inputValue.trim() || isLoading || !currentAssistant || !user || !user.id) {
        console.warn("Pré-requisitos para envio não atendidos:", { inputValue, currentAssistant, user });
        return;
    }

    // O ID específico do webhook N8N a ser chamado
    // Mantenha isso se for o mesmo endpoint para todos, senão busque dinamicamente
    const webhookPath = "5c024eb2-5ab2-4be3-92f9-26250da4c65d"; 
    if (!webhookPath) {
        setError("Configuração do webhook path ausente.");
        console.error("Erro: webhookPath está faltando.");
        return;
    }

    // *** MODIFICAÇÃO PRINCIPAL: Constrói a URL para o PROXY do Vite ***
    const proxyUrl = `/n8n-api/webhook/${webhookPath}`; 

    const userMessage: Message = { sender: 'user', text: inputValue.trim() };
    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    setError(null);

    let responseText = '';

    try {
        console.log(`[LOG] Enviando para URL (via Proxy Vite): ${proxyUrl}`); 
        const payload = {
            message: messageToSend,
            userId: user.id,
            sessionId: user.id // Usando userId como sessionId
        };
        console.log("[LOG] Payload:", JSON.stringify(payload, null, 2));

        // O fetch agora usa a URL LOCAL do proxy Vite
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Adicione Auth headers aqui se o N8N precisar (mesmo com proxy)
                // 'Authorization': 'Basic ...',
                // 'X-N8N-Api-Key': '...',
            },
            body: JSON.stringify(payload),
        });

        console.log(`[LOG] Resposta recebida do proxy. Status: ${response.status} ${response.statusText}`);
        console.log("[LOG] Content-Type Header recebido:", response.headers.get('Content-Type'));

        responseText = await response.text();
        console.log("[LOG] Raw response text recebido:", responseText);

        if (!response.ok) {
             // O erro pode vir do N8N agora (ex: 401, 404, 500) ou do proxy se houver erro nele
            throw new Error(`Erro na API via proxy: Status ${response.status}. Resposta não era OK. Início da resposta: ${responseText.substring(0, 200)}...`);
        }

        // Tenta analisar a resposta como JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error("[LOG] Falha ao analisar a resposta como JSON:", parseError);
            throw new Error(`Resposta recebida do N8N não é JSON válido. Início da resposta: ${responseText.substring(0, 200)}...`);
        }

        console.log("[LOG] Dados JSON analisados:", data);

        // Tenta encontrar a resposta do assistente
        const assistantReply = data.reply || data.output || data.result || data[0]?.json?.reply || null;

        if (assistantReply !== null && typeof assistantReply === 'string') { // Checa se é string
            const assistantMessage: Message = { sender: 'assistant', text: assistantReply };
            setMessages(prev => [...prev, assistantMessage]);
        } else {
            console.warn("[LOG] Campo de resposta esperado não encontrado ou não é string no JSON:", data);
            // Manda uma mensagem genérica se não achar a resposta
            setMessages(prev => [...prev, { sender: 'assistant', text: "Recebi sua mensagem, mas não consegui formatar a resposta." }]);
            // Considera não jogar erro aqui, apenas logar
            // throw new Error("Resposta da API não continha um campo de resposta string esperado."); 
        }

    } catch (err: any) {
        console.error("[LOG] Erro no bloco catch principal:", err);
        const errorMessageText = `Erro ao conectar com o assistente: ${err.message}`;
        setError(errorMessageText);
        // Exibe mensagem de erro detalhada no chat
        setMessages(prev => [...prev, { sender: 'assistant', text: `Desculpe, ocorreu um erro. (${err.message})` }]);
    } finally {
        setIsLoading(false);
        console.log("[LOG] Finalizando handleSendMessage.");
    }
  };

  // Renderização do cabeçalho e área de mensagens/input
  // Usando a estrutura similar à da sua versão anterior que funcionava visualmente
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
