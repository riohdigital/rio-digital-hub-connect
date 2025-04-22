
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { supabase } from "@/lib/supabase";

interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

interface AssistantInfo {
  id: string;
  name: string;
  icon?: string;
}

const assistantDisplayInfo: { [key: string]: { name: string, icon: string } } = {
  "assistente_de_resultados_esportivos": { name: "Resultados Esportivos Oficiais", icon: "🏆" },
  "digirioh": { name: "DigiRioh", icon: "⚙️" },
  "agente_do_booking": { name: "Agente do Booking", icon: "🏨" },
  "agente_de_airbnb": { name: "Agente de Airbnb", icon: "🏠" },
};

const AssistantChat = () => {
  const { assistantType } = useParams<{ assistantType: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAssistant, setCurrentAssistant] = useState<AssistantInfo | null>(null);

  // Filter user messages for sidebar
  const userMessages = useMemo(() => messages.filter(msg => msg.sender === 'user'), [messages]);
  // Filter assistant messages for main chat area
  const assistantMessages = useMemo(() => messages.filter(msg => msg.sender === 'assistant'), [messages]);

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
      setError(null);
      setIsLoading(false);
    } else {
      navigate('/dashboard');
    }
  }, [assistantType, navigate]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading || !currentAssistant || !user?.id) return;

    const userMessage: Message = { sender: 'user', text: inputValue.trim() };
    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const startTime = new Date();
      
      await supabase.from('chat_resultados_esportivos_oficiais_history').insert({
        user_id: user.id,
        assistant_type: currentAssistant.id,
        message_content: userMessage.text,
        sender: userMessage.sender,
        status: 'sent',
      });

      const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}/webhook/5c024eb2-5ab2-4be3-92f9-26250da4c65d`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          userId: user.id,
          sessionId: user.id
        }),
      });

      const endTime = new Date();
      const responseTime = endTime.getTime() - startTime.getTime();

      if (response.ok) {
        const data = await response.json();
        const assistantReply = data.cleaned_text || data.output || data.reply || "Desculpe, não consegui processar sua solicitação.";
        const assistantMessage: Message = { sender: 'assistant', text: assistantReply };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        await supabase.from('chat_resultados_esportivos_oficiais_history').insert({
          user_id: user.id,
          assistant_type: currentAssistant.id,
          message_content: assistantMessage.text,
          sender: assistantMessage.sender,
          status: 'processed',
          response_time: `${responseTime} milliseconds`,
        });
      }
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (currentAssistant) {
      setMessages([{
        sender: 'assistant',
        text: `Olá! 👋 Sou o Agente de Resultados Esportivos Oficiais. Para verificar sua aposta, por favor, informe: ⚽ Jogo (Time A vs Time B), 📅 Data (YYYY-MM-DD), 📊 Mercado (ex: Placar Final) e ✅ Seleção (ex: Time A vence).`
      }]);
    }
    setInputValue("");
    setError(null);
  };

  const handleClearHistory = async () => {
    if (!user || !currentAssistant) return;
    
    if (window.confirm("Tem certeza que deseja apagar todo o histórico de conversas salvo?")) {
      try {
        await supabase
          .from('chat_resultados_esportivos_oficiais_history')
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
        <ChatSidebar
          inputValue={inputValue}
          isLoading={isLoading}
          onInputChange={setInputValue}
          onSendMessage={handleSendMessage}
          onClearChat={handleClearChat}
          onClearHistory={handleClearHistory}
          messages={userMessages}
        />
        
        <main className="flex-1 bg-background">
          <ChatMessages 
            messages={assistantMessages}
            isLoading={isLoading}
            error={error}
          />
        </main>
      </div>
    </div>
  );
};

export default AssistantChat;
