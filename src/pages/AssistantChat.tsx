import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessages } from "@/components/chat/ChatMessages";

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

  const handleClearChat = () => {
    if (currentAssistant) {
      setMessages([{
        sender: 'assistant',
        text: `Olá! Sou o ${currentAssistant.name}. Como posso ajudar você hoje?`
      }]);
    } else {
      setMessages([]);
    }
    setInputValue("");
    setError(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <ChatHeader 
        icon={currentAssistant?.icon} 
        name={currentAssistant?.name}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          inputValue={inputValue}
          isLoading={isLoading}
          onInputChange={setInputValue}
          onSendMessage={handleSendMessage}
          onClearChat={handleClearChat}
        />
        
        <main className="flex-1 bg-background">
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            error={error}
          />
        </main>
      </div>
    </div>
  );
};

export default AssistantChat;
