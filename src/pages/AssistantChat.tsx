import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PaperPlaneIcon } from "lucide-react";

// Define o tipo de mensagem para uso no chat
interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

// Defina a interface para o assistente se necessário
interface Assistant {
  id: string;
  name: string;
  // Adicione outras propriedades conforme necessário
}

// URL base para o webhook do n8n (geralmente viria de variáveis de ambiente)
const N8N_WEBHOOK_BASE_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || "https://seu-servidor-n8n.com/webhook";

const AssistantChat = () => {
  const { assistantType } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);

  useEffect(() => {
    // Aqui você pode carregar informações sobre o assistante com base no assistantType
    // Este é apenas um exemplo, você precisaria implementar isso adequadamente
    if (assistantType) {
      setCurrentAssistant({
        id: assistantType,
        name: `Assistente ${assistantType.charAt(0).toUpperCase() + assistantType.slice(1)}`
      });
      
      // Limpa as mensagens quando muda de assistente
      setMessages([]);
      
      // Você pode adicionar uma mensagem de boas-vindas
      setMessages([{ 
        sender: 'assistant', 
        text: `Olá! Eu sou o assistente para ${assistantType}. Como posso ajudar você hoje?` 
      }]);
    }
  }, [assistantType]);

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading || !currentAssistant || !N8N_WEBHOOK_BASE_URL || !user || !user.id) {
        console.warn("Pré-requisitos para envio não atendidos:", { inputValue, currentAssistant, N8N_WEBHOOK_BASE_URL, user });
        return;
    }

    const webhookPath = "5c024eb2-5ab2-4be3-92f9-26250da4c65d"; // <-- Confirme se este é o path correto!
    if (!webhookPath) {
        setError("Configuração do webhook ausente para este assistente.");
        console.error("Erro: webhookPath está faltando.");
        return;
    }

    const fullWebhookUrl = `${N8N_WEBHOOK_BASE_URL.replace(/\/$/, '')}/${webhookPath}`;

    const userMessage: Message = { sender: 'user', text: inputValue.trim() };
    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    setError(null);

    let responseText = ''; // Variável para armazenar a resposta como texto

    try {
        console.log(`[LOG] Enviando para URL: ${fullWebhookUrl}`);
        const payload = {
            message: messageToSend,
            userId: user.id,
            sessionId: user.id
        };
        console.log("[LOG] Payload:", JSON.stringify(payload, null, 2)); // Log formatado

        const response = await fetch(fullWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': 'Basic SEU_USUARIO:SUA_SENHA_BASE64', // Descomente se usar Basic Auth
                // 'X-N8N-Api-Key': 'SUA_CHAVE_DE_API', // Descomente se usar API Key
            },
            body: JSON.stringify(payload),
        });

        console.log(`[LOG] Resposta recebida. Status: ${response.status} ${response.statusText}`);
        console.log("[LOG] Content-Type Header:", response.headers.get('Content-Type'));

        // Lê a resposta como TEXTO primeiro para depuração
        responseText = await response.text();
        console.log("[LOG] Raw response text:", responseText); // Log do HTML recebido!

        if (!response.ok) {
            // Joga um erro já incluindo o início do texto recebido
            throw new Error(`Erro na API: Status ${response.status}. Resposta não era OK. Início da resposta: ${responseText.substring(0, 200)}...`);
        }

        // AGORA tenta analisar como JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error("[LOG] Falha ao analisar a resposta como JSON:", parseError);
            // Joga um erro específico informando que não é JSON
            throw new Error(`Resposta recebida não é JSON válido. Início da resposta: ${responseText.substring(0, 200)}...`);
        }

        console.log("[LOG] Dados JSON analisados:", data);

        const assistantReply = data.reply || data.output || data.result || data[0]?.json?.reply || null; // Tenta vários campos comuns

        if (assistantReply !== null) {
            const assistantMessage: Message = { sender: 'assistant', text: assistantReply };
            setMessages(prev => [...prev, assistantMessage]);
        } else {
             console.warn("[LOG] Campo de resposta esperado ('reply', 'output', 'result', etc.) não encontrado no JSON:", data);
            throw new Error("Resposta da API não continha um campo de resposta esperado.");
        }

    } catch (err: any) {
        console.error("[LOG] Erro no bloco catch principal:", err);
        // Usa a mensagem de erro gerada, que pode incluir o início da resposta HTML
        const errorMessageText = `Erro ao conectar com o assistente: ${err.message}`;
        setError(errorMessageText);
        // Exibe a mensagem de erro detalhada também no chat
        setMessages(prev => [...prev, { sender: 'assistant', text: `Desculpe, ocorreu um erro. (${err.message})` }]);
    } finally {
        setIsLoading(false);
        console.log("[LOG] Finalizando handleSendMessage.");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="p-4">
        <h1 className="text-2xl font-bold mb-4">
          {currentAssistant ? currentAssistant.name : "Assistente"}
        </h1>
        
        {/* Área de mensagens */}
        <ScrollArea className="h-[500px] mb-4 p-4 border rounded-md">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`mb-4 p-3 rounded-lg ${
                message.sender === 'user' 
                  ? 'bg-primary text-primary-foreground ml-auto max-w-[80%] text-right' 
                  : 'bg-muted text-muted-foreground max-w-[80%]'
              }`}
            >
              {message.text}
            </div>
          ))}
          {isLoading && (
            <div className="bg-muted text-muted-foreground p-3 rounded-lg max-w-[80%] mb-4">
              Digitando...
            </div>
          )}
          {error && (
            <div className="bg-destructive text-destructive-foreground p-3 rounded-lg max-w-[80%] mb-4">
              {error}
            </div>
          )}
        </ScrollArea>
        
        {/* Formulário de envio de mensagem */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Digite sua mensagem..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !inputValue.trim()}>
            <PaperPlaneIcon className="h-4 w-4 mr-2" />
            Enviar
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AssistantChat;
