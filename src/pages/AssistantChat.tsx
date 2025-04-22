// src/pages/AssistantChat.tsx - INCORPORANDO SUGESTÕES

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast"; // Ou seu hook de toast

// Tipos
interface Message { id?: string; sender: 'user' | 'assistant'; text: string; created_at?: string; }
interface AssistantInfo { id: string; name: string; icon?: string; }

// Mock Data e Constantes
const assistantDisplayInfo: { [key: string]: { name: string, icon: string } } = { /* ... como antes ... */ };
const SOCCER_ANIMATION_URL = "/logo.png"; // ou o GIF

const AssistantChat = () => {
  const { assistantType } = useParams<{ assistantType: string }>();
  const { user, userPlans } = useAuth(); 
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Estados
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAssistant, setCurrentAssistant] = useState<AssistantInfo | null>(null);
  const [isHistoryPanelVisible, setIsHistoryPanelVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const requestStartTimeRef = useRef<number | null>(null); // Para tempo de loading

  // Mensagem Inicial
  const getInitialMessage = useCallback((assistantName: string | undefined) => ({ /* ... como antes ... */ }), []);

  // Efeito de inicialização
  useEffect(() => { /* ... como antes ... */ }, [assistantType, navigate, getInitialMessage]);

  // --- Funções de Histórico (mantidas como antes, mas recebem setLoadingHistory) ---
  const fetchChatHistory = useCallback(async () => { /* ... como antes ... */ }, [user, currentAssistant, toast]);
  const handleToggleHistoryPanel = useCallback(() => { /* ... como antes ... */ }, [isHistoryPanelVisible, chatHistory.length, fetchChatHistory]);
  const handleToggleHistorySelection = useCallback((id: string, isChecked: boolean) => { /* ... como antes ... */ }, []);
  const handleDeleteSelectedHistory = useCallback(async () => { /* ... como antes ... */ }, [selectedHistoryIds, user, fetchChatHistory, toast]);
  const handleClearHistory = async () => { /* ... como antes ... */ };

  // --- Função de Envio de Mensagem (Com tratamento de erro melhorado) ---
  const handleSendMessage = async (e?: React.FormEvent) => { 
      if (e) e.preventDefault();
      if (!inputValue.trim() || isLoading || !currentAssistant || !user?.id) return;
  
      const userMessage: Message = { sender: 'user', text: inputValue.trim() };
      setMessages(prev => [...prev, userMessage]);
      const messageToSend = inputValue.trim();
      setInputValue('');
      setIsLoading(true);
      setError(null);
      requestStartTimeRef.current = Date.now(); // Marca tempo de início

      let responseTime = 0; // Inicializa tempo de resposta
  
      try {
          // Salva mensagem do usuário (sem await para não bloquear UI, mas pode causar inconsistência se falhar)
          supabase.from('chat_resultados_esportivos_oficiais_history').insert({ user_id: user.id, assistant_type: currentAssistant.id, message_content: userMessage.text, sender: userMessage.sender, status: 'sent', }).then(({ error }) => { if (error) console.error("Error saving user message:", error); });

          const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}/webhook/5c024eb2-5ab2-4be3-92f9-26250da4c65d`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: messageToSend, userId: user.id, sessionId: user.id }), });
  
          responseTime = Date.now() - requestStartTimeRef.current; // Calcula tempo de resposta
          requestStartTimeRef.current = null; // Reseta tempo

          if (!response.ok) throw new Error(`API Error: ${response.status}`);
          
          const responseText = await response.text(); // Lê como texto primeiro
          let data;
          try { data = JSON.parse(responseText); } 
          catch (parseError) { throw new Error(`Resposta N8N não é JSON: ${responseText.substring(0,100)}`); }

          // Validação mais rigorosa (exemplo)
          const assistantReply = data?.cleaned_text || data?.output || data?.reply || null; 
          if (!assistantReply || typeof assistantReply !== 'string' || assistantReply.trim() === '') {
               console.warn("Resposta inválida ou vazia recebida:", data);
               throw new Error("O assistente retornou uma resposta inválida."); // Erro mais específico
          }

          const assistantMessage: Message = { sender: 'assistant', text: assistantReply.trim() };
          setMessages(prev => [...prev, assistantMessage]);
          
          // Salva resposta do assistente
          supabase.from('chat_resultados_esportivos_oficiais_history').insert({ user_id: user.id, assistant_type: currentAssistant.id, message_content: assistantMessage.text, sender: assistantMessage.sender, status: 'processed', response_time: `${responseTime} ms`, }).then(({ error }) => { if (error) console.error("Error saving assistant message:", error); });
      
      } catch (err: any) { 
          requestStartTimeRef.current = null; // Reseta tempo em caso de erro
          console.error("[handleSendMessage] Error:", err);
          
          // *** CATEGORIZAÇÃO DE ERROS ***
          let errorMsg = "Ocorreu um erro inesperado ao processar sua mensagem."; // Default
          const errorString = String(err.message || err).toLowerCase();

          if (errorString.includes("failed to fetch") || errorString.includes("networkerror") || errorString.includes("timeout")) {
            errorMsg = "Erro de conexão. Verifique sua internet ou tente novamente mais tarde.";
          } else if (errorString.includes("api error: 5") || errorString.includes("internal server error")) { // Erros 5xx
             errorMsg = "Ocorreu um erro no nosso servidor. A equipe já foi notificada.";
          } else if (errorString.includes("api error: 4") || errorString.includes("not found") || errorString.includes("unauthorized")) { // Erros 4xx
             errorMsg = "Ocorreu um erro ao acessar o recurso necessário.";
          } else if (errorString.includes("resposta inválida") || errorString.includes("não é json válido")) {
             errorMsg = "O assistente retornou uma resposta inesperada. Tente reformular sua pergunta.";
          } else if (err.message) {
             errorMsg = `Erro: ${err.message}`; // Usa a mensagem de erro original se não categorizada
          }
          
          setError(errorMsg); // Define o estado de erro para exibição
          setMessages(prev => [...prev, { sender: 'assistant', text: errorMsg }]); // Mostra erro no chat
      } finally { 
          setIsLoading(false); 
      }
  };

  // --- Função Limpar Chat ---
  const handleClearChat = () => { /* ... como antes ... */ };

  // Filtros Memoizados
  const userMessages = useMemo(() => messages.filter(m => m.sender === 'user'), [messages]);
  const assistantMessages = useMemo(() => messages.filter(m => m.sender === 'assistant'), [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      <ChatHeader 
        icon={currentAssistant?.icon} 
        name={currentAssistant?.name}
        gifUrl={SOCCER_ANIMATION_URL} 
      />
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          isHistoryVisible={isHistoryPanelVisible}
          userMessages={userMessages} 
          chatHistory={chatHistory}
          loadingHistory={loadingHistory} 
          selectedHistoryIds={selectedHistoryIds}
          inputValue={inputValue}
          isLoading={isLoading} 
          onInputChange={setInputValue}
          onSendMessage={handleSendMessage}
          onClearChat={handleClearChat}
          onToggleHistoryPanel={handleToggleHistoryPanel} 
          onClearHistory={handleClearHistory}
          onDeleteSelectedHistory={handleDeleteSelectedHistory} 
          onToggleHistorySelection={handleToggleHistorySelection} 
        />
        <main className="w-3/5 flex flex-col p-4 overflow-hidden bg-slate-50"> 
          <ChatMessages 
            messages={assistantMessages} 
            isLoading={isLoading}
            loadingGifPath="/loading-sports.gif" 
            requestStartTime={requestStartTimeRef.current} // Passa o timestamp de início
            error={error}
          />
        </main>
      </div>
    </div>
  );
};

export default AssistantChat;
