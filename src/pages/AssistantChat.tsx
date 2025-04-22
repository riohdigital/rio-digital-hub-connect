
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id?: string;
  sender: 'user' | 'assistant';
  text: string;
  created_at?: string;
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
  const { toast } = useToast();
  
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAssistant, setCurrentAssistant] = useState<AssistantInfo | null>(null);
  
  // History functionality
  const [isHistoryPanelVisible, setIsHistoryPanelVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  
  // Filter messages for sidebar and main chat area
  const userMessages = useMemo(() => messages.filter(msg => msg.sender === 'user'), [messages]);
  const assistantMessages = useMemo(() => messages.filter(msg => msg.sender === 'assistant'), [messages]);
  
  // Fetch chat history from Supabase
  const fetchChatHistory = useCallback(async () => {
    if (!user?.id || !currentAssistant) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('chat_resultados_esportivos_oficiais_history')
        .select('id, message_content, sender, created_at')
        .eq('user_id', user.id)
        .eq('assistant_type', currentAssistant.id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error("Error fetching chat history:", error);
        toast({
          title: "Erro ao carregar histórico",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      // Transform data to match Message interface
      const formattedHistory: Message[] = data.map(item => ({
        id: item.id,
        sender: item.sender as 'user' | 'assistant',
        text: item.message_content,
        created_at: item.created_at
      }));
      
      setChatHistory(formattedHistory);
    } catch (err: any) {
      console.error("Error in fetchChatHistory:", err);
      toast({
        title: "Erro ao carregar histórico",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, currentAssistant, toast]);
  
  // Toggle history panel visibility
  const handleToggleHistoryPanel = useCallback(() => {
    const newVisibility = !isHistoryPanelVisible;
    setIsHistoryPanelVisible(newVisibility);
    
    // Fetch history when opening the panel if it's empty
    if (newVisibility && chatHistory.length === 0) {
      fetchChatHistory();
    }
  }, [isHistoryPanelVisible, chatHistory.length, fetchChatHistory]);
  
  // Toggle history item selection
  const handleToggleHistorySelection = useCallback((id: string, isChecked: boolean) => {
    setSelectedHistoryIds(prev => {
      if (isChecked) {
        return [...prev, id];
      } else {
        return prev.filter(item => item !== id);
      }
    });
  }, []);
  
  // Delete selected history items
  const handleDeleteSelectedHistory = useCallback(async () => {
    if (!selectedHistoryIds.length || !user?.id) return;
    
    const confirmDelete = window.confirm(
      `Você tem certeza que deseja excluir ${selectedHistoryIds.length} ${
        selectedHistoryIds.length === 1 ? "item" : "itens"
      } do histórico?`
    );
    
    if (!confirmDelete) return;
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('chat_resultados_esportivos_oficiais_history')
        .delete()
        .in('id', selectedHistoryIds);
      
      if (error) {
        console.error("Error deleting history items:", error);
        toast({
          title: "Erro ao excluir histórico",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Histórico excluído",
        description: `${selectedHistoryIds.length} ${
          selectedHistoryIds.length === 1 ? "item" : "itens"
        } excluídos com sucesso.`
      });
      
      // Clear selection and refresh history
      setSelectedHistoryIds([]);
      fetchChatHistory();
    } catch (err: any) {
      console.error("Error in handleDeleteSelectedHistory:", err);
      toast({
        title: "Erro ao excluir histórico",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedHistoryIds, user, fetchChatHistory, toast]);
  
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
        // First check for cleaned_text as requested
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
        setIsLoading(true);
        
        await supabase
          .from('chat_resultados_esportivos_oficiais_history')
          .delete()
          .eq('user_id', user.id)
          .eq('assistant_type', currentAssistant.id);
        
        toast({
          title: "Histórico apagado",
          description: "Todo o histórico de conversas foi apagado com sucesso."
        });
        
        // Reset history state
        setChatHistory([]);
        setSelectedHistoryIds([]);
      } catch (error) {
        console.error("Erro ao apagar histórico:", error);
        toast({
          title: "Erro ao apagar histórico",
          description: "Não foi possível apagar o histórico. Tente novamente.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
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
          userMessages={userMessages}
          onInputChange={setInputValue}
          onSendMessage={handleSendMessage}
          onClearChat={handleClearChat}
          onClearHistory={handleClearHistory}
          isHistoryPanelVisible={isHistoryPanelVisible}
          onToggleHistoryPanel={handleToggleHistoryPanel}
          chatHistory={chatHistory}
          selectedHistoryIds={selectedHistoryIds}
          onToggleHistorySelection={handleToggleHistorySelection}
          onDeleteSelectedHistory={handleDeleteSelectedHistory}
        />
        
        <main className="flex-1 bg-background overflow-hidden flex flex-col">
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
