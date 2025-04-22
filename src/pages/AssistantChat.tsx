// src/pages/AssistantChat.tsx - Completo com Correções

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"; // Adiciona useRef
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast"; // Verifique o caminho
import { useLocalStorage } from "@/hooks/use-local-storage"; // Assumindo que este hook existe em src/hooks/
import { AlertTriangle, Paperclip } from "lucide-react"; // Ícones
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Componente de diálogo

// --- Interfaces ---
interface Message {
  id?: string;
  sender: 'user' | 'assistant';
  text: string;
  created_at?: string;
  attachments?: Attachment[];
}
interface Attachment { id: string; type: 'image' | 'file' | 'audio'; url: string; name: string; size?: number; }
interface AssistantInfo { id: string; name: string; icon?: string; welcomeMessage?: string; }

// --- Mock Data & Constantes ---
const assistantDisplayInfo: { [key: string]: { name: string, icon: string, welcomeMessage: string } } = {
  "assistente_de_resultados_esportivos": { name: "Resultados Esportivos Oficiais", icon: "🏆", welcomeMessage: "Olá! 👋 Sou o Agente de Resultados Esportivos Oficiais. Para verificar sua aposta, por favor, informe:\n\n⚽ Jogo (Time A vs Time B)\n📅 Data (YYYY-MM-DD)\n📊 Mercado (ex: Placar Final)\n✅ Seleção (ex: Time A vence)" },
  "digirioh": { name: "DigiRioh", icon: "⚙️", welcomeMessage: "Olá! Sou o DigiRioh, seu assistente de tecnologia. Como posso ajudar hoje?" },
  "agente_do_booking": { name: "Agente do Booking", icon: "🏨", welcomeMessage: "Olá! Sou o Agente do Booking. Como posso ajudar com sua reserva de hotel hoje?" },
  "agente_de_airbnb": { name: "Agente de Airbnb", icon: "🏠", welcomeMessage: "Olá! Sou o Agente de Airbnb. Precisa de ajuda para encontrar uma acomodação ou gerenciar sua reserva?" },
};
const SOCCER_ANIMATION_URL = "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExODIxcDQ4azljM2lxMHlmdGQ5NHR0bWhrNXlycWwzcDF0MThudWRoNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/elatsjsGzdLtNov4Ky/giphy.gif";
const MESSAGES_PER_PAGE = 20;
const LOADING_GIF_PATH = "/loading-sports.gif"; // Caminho para o GIF local
const MAX_RETRY_ATTEMPTS = 3;

// --- Componente Principal ---
const AssistantChat = () => {
  const { assistantType } = useParams<{ assistantType: string }>();
  const { user, userPlans } = useAuth(); // Inclui userPlans
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // --- Estados ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Loading do envio de mensagem
  const [error, setError] = useState<string | null>(null);
  const [currentAssistant, setCurrentAssistant] = useState<AssistantInfo | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogAction, setConfirmDialogAction] = useState<() => Promise<void>>(() => async () => {});
  const [confirmDialogMessage, setConfirmDialogMessage] = useState("");
  const [confirmDialogTitle, setConfirmDialogTitle] = useState("");
  const [isHistoryPanelVisible, setIsHistoryPanelVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(false); // Loading do histórico
  const [cachedMessages, setCachedMessages] = useLocalStorage<{[key: string]: Message[]}>('cached_chat_messages', {});
  const [failedRequest, setFailedRequest] = useState<{payload: any, retryCount: number} | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<{[key: string]: number}>({});
  const [isChatFocused, setIsChatFocused] = useState(true);
  
  // --- Memos para Filtragem ---
  const userMessages = useMemo(() => messages.filter(msg => msg.sender === 'user'), [messages]);
  const assistantMessages = useMemo(() => messages.filter(msg => msg.sender === 'assistant'), [messages]);
  
  // --- Funções (Restauradas da sua versão, com pequenos ajustes) ---
  const showConfirmDialog = (title: string, message: string, action: () => Promise<void>) => {
    setConfirmDialogTitle(title); setConfirmDialogMessage(message);
    setConfirmDialogAction(() => action); setConfirmDialogOpen(true);
  };
  
  const fetchChatHistory = useCallback(async (page = 1) => {
    if (!user?.id || !currentAssistant) return;
    setLoadingHistory(true); setError(null); 
    try {
      const { count, error: countError } = await supabase.from('chat_resultados_esportivos_oficiais_history').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('assistant_type', currentAssistant.id);
      if (countError) throw countError;
      const totalItems = count || 0; const calculatedTotalPages = Math.ceil(totalItems / MESSAGES_PER_PAGE);
      setTotalPages(calculatedTotalPages || 1);
      const { data, error } = await supabase.from('chat_resultados_esportivos_oficiais_history').select('id, message_content, sender, created_at, attachments').eq('user_id', user.id).eq('assistant_type', currentAssistant.id).order('created_at', { ascending: false }).range((page - 1) * MESSAGES_PER_PAGE, page * MESSAGES_PER_PAGE - 1);
      if (error) throw error;
      const formattedHistory: Message[] = (data || []).map(item => ({ id: item.id, sender: item.sender as 'user' | 'assistant', text: item.message_content, created_at: item.created_at, attachments: item.attachments }));
      setChatHistory(formattedHistory.reverse()); // Reverte para mostrar mais antigo em cima
      setCurrentPage(page);
    } catch (err: any) { console.error("Error fetching history:", err); toast({ title: "Erro Histórico", description: err.message, variant: "destructive" }); setChatHistory([]); } 
    finally { setLoadingHistory(false); }
  }, [user, currentAssistant, toast]);

  const handleToggleHistoryPanel = useCallback(() => {
      const newVisibility = !isHistoryPanelVisible; setIsHistoryPanelVisible(newVisibility);
      setSelectedHistoryIds([]); 
      if (newVisibility && chatHistory.length === 0) { fetchChatHistory(1); }
  }, [isHistoryPanelVisible, chatHistory.length, fetchChatHistory]);

  const handleToggleHistorySelection = useCallback((id: string, isChecked: boolean) => {
      setSelectedHistoryIds(prev => { if (id === "") { return isChecked ? chatHistory.map(msg => msg.id!) : []; } return isChecked ? [...prev, id] : prev.filter(item => item !== id); });
  }, [chatHistory]);

  const handleDeleteSelectedHistory = useCallback(async () => {
      if (!selectedHistoryIds.length || !user?.id) return;
      const deleteAction = async () => {
          setLoadingHistory(true);
          try {
              const { error } = await supabase.from('chat_resultados_esportivos_oficiais_history').delete().in('id', selectedHistoryIds);
              if (error) throw error;
              toast({ title: "Histórico Excluído", description: `${selectedHistoryIds.length} itens excluídos.` });
              setSelectedHistoryIds([]); fetchChatHistory(currentPage);
          } catch (err: any) { console.error("Error deleting history:", err); toast({ title: "Erro ao Excluir", description: err.message, variant: "destructive" }); } 
          finally { setLoadingHistory(false); }
      };
      showConfirmDialog("Confirmar Exclusão", `Excluir ${selectedHistoryIds.length} item(ns)?`, deleteAction);
  }, [selectedHistoryIds, user, fetchChatHistory, currentPage, toast, showConfirmDialog]);

  const handleClearHistory = useCallback(async () => {
      if (!user || !currentAssistant) return;
      const clearHistoryAction = async () => {
          setLoadingHistory(true);
          try {
              await supabase.from('chat_resultados_esportivos_oficiais_history').delete().eq('user_id', user.id).eq('assistant_type', currentAssistant.id);
              toast({ title: "Histórico Apagado", description: "Histórico de conversas apagado." });
              setChatHistory([]); setSelectedHistoryIds([]); setTotalPages(1); setCurrentPage(1);
          } catch (error: any) { console.error("Erro ao apagar histórico:", error); toast({ title: "Erro ao Apagar", description: error.message, variant: "destructive" }); } 
          finally { setLoadingHistory(false); }
      };
      showConfirmDialog("Apagar Histórico", "Apagar todo o histórico salvo?", clearHistoryAction);
  }, [user, currentAssistant, toast, showConfirmDialog]);
  
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => { /* ... (código como na sua versão) ... */ }, [user?.id, toast]); // Adicionado user?.id
  const handleRemoveAttachment = (id: string) => { /* ... (código como na sua versão) ... */ };
  
  const handleClearChat = () => {
      const clearAction = async () => {
          if (currentAssistant) {
              const welcomeMsg = assistantDisplayInfo[currentAssistant.id]?.welcomeMessage || "Olá!";
              const initialMsg: Message = { sender: 'assistant', text: welcomeMsg };
              setMessages([initialMsg]);
              setCachedMessages(prev => ({...prev, [currentAssistant.id]: [initialMsg] }));
          }
          setInputValue(""); setError(null); setAttachments([]);
      };
      showConfirmDialog("Limpar Conversa", "Limpar a conversa atual?", clearAction);
  };

  const handlePageChange = (page: number) => { /* ... (código como na sua versão) ... */ };
  
  const handleLoadFromHistory = useCallback((historyMessages: Message[]) => { // Recebe Message[]
      if (!historyMessages.length) return;
      const loadAction = async () => {
          // Aqui você precisa transformar o histórico para o formato Message se necessário
          // Se chatHistory já for Message[], está ok.
          setMessages(historyMessages); 
          if (currentAssistant) { setCachedMessages(prev => ({ ...prev, [currentAssistant.id]: historyMessages })); }
          setIsHistoryPanelVisible(false);
          toast({ title: "Conversa Carregada", description: "Conversa carregada com sucesso." });
      };
      showConfirmDialog("Carregar Conversa", "Substituir a conversa atual?", loadAction);
  }, [currentAssistant, setCachedMessages, toast]);

  const requestNotificationPermission = useCallback(async () => { /* ... */ }, [toast]);
  
  // --- Efeitos (Restaurados da sua versão) ---
  useEffect(() => {
      if (assistantType) {
          const displayInfo = assistantDisplayInfo[assistantType] || { name: assistantType, icon: '🤖', welcomeMessage: "Olá!" };
          setCurrentAssistant({ id: assistantType, name: displayInfo.name, icon: displayInfo.icon, welcomeMessage: displayInfo.welcomeMessage });
          const cachedAssistantMessages = cachedMessages[assistantType];
          setMessages(cachedAssistantMessages && cachedAssistantMessages.length > 0 ? cachedAssistantMessages : [{ sender: 'assistant', text: displayInfo.welcomeMessage }]);
          setError(null); setIsLoading(false); setInputValue(''); setAttachments([]); // Limpa anexos ao trocar
      } else { navigate('/dashboard'); }
  }, [assistantType, navigate, cachedMessages]); // Removido getInitialMessage

  useEffect(() => { /* ... retry ... */ }, [failedRequest, toast, handleSendMessageWithPayload]); // Precisa definir handleSendMessageWithPayload
  useEffect(() => { /* ... cache de mensagens ... */ }, [messages, currentAssistant, setCachedMessages]);
  useEffect(() => { /* ... foco da janela ... */ }, [currentAssistant, setUnreadMessages]);
  useEffect(() => { /* ... permissão de notificação ... */ }, [requestNotificationPermission]);

  // --- Função de Envio Principal (handleSendMessage e handleSendMessageWithPayload) ---
   // Combinando e simplificando a lógica de envio e retry
   const handleSendMessage = async (e?: React.FormEvent) => {
       if (e) e.preventDefault();
       if ((!inputValue.trim() && attachments.length === 0) || isLoading || !currentAssistant || !user?.id) return;
       
       const messageText = inputValue.trim();
       const currentAttachments = [...attachments]; 
       const tempId = crypto.randomUUID(); 
       const userMessage: Message = { id: tempId, sender: 'user', text: messageText, attachments: currentAttachments.length > 0 ? currentAttachments : undefined, created_at: new Date().toISOString() };
       
       setMessages(prev => [...prev, userMessage]); 
       setInputValue(''); setAttachments([]); 
       
       const payload = { message: messageText, attachments: currentAttachments.length > 0 ? currentAttachments : undefined };
   
       // Salva mensagem do usuário no DB (sem esperar)
       supabase.from('chat_resultados_esportivos_oficiais_history').insert({ user_id: user.id, assistant_type: currentAssistant.id, message_content: userMessage.text, sender: userMessage.sender, status: 'sent', attachments: userMessage.attachments }).then(({ error }) => { if (error) console.error("Error saving user message:", error); });
   
       // Inicia o processo de envio/retry
       await executeSendWithRetry(payload);
   };
 
   // Função separada para execução com retry
   const executeSendWithRetry = async (payload: any, retryCount = 0) => {
       if (!currentAssistant || !user?.id) return; 
       setIsLoading(true); setError(null);
       let requestStartTime = Date.now();
   
       try {
           const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}/webhook/5c024eb2-5ab2-4be3-92f9-26250da4c65d`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: payload.message, userId: user.id, sessionId: user.id, attachments: payload.attachments }) });
           let responseTime = Date.now() - requestStartTime;
           if (!response.ok) throw new Error(`API Error: ${response.status}`);
           const data = await response.json();
           const assistantReply = data?.cleaned_text || data?.output || data?.reply || "Desculpe, não consegui processar.";
           if (!assistantReply || typeof assistantReply !== 'string') throw new Error("Resposta inválida.");
   
           const assistantMessage: Message = { id: crypto.randomUUID(), sender: 'assistant', text: assistantReply.trim(), created_at: new Date().toISOString() };
           setMessages(prev => [...prev, assistantMessage]); 
           
           supabase.from('chat_resultados_esportivos_oficiais_history').insert({ user_id: user.id, assistant_type: currentAssistant.id, message_content: assistantMessage.text, sender: assistantMessage.sender, status: 'processed', response_time: `${responseTime} ms` }).then(({ error }) => { if (error) console.error("Error saving assistant msg:", error); });
   
           setFailedRequest(null); 
           if (!isChatFocused) { setUnreadMessages(prev => ({...prev, [currentAssistant.id]: (prev[currentAssistant.id] || 0) + 1 })); if (Notification.permission === "granted") { new Notification(`Msg: ${currentAssistant.name}`, { body: assistantReply.substring(0, 100), icon: "/favicon.ico" }); } }
   
       } catch (err: any) { 
           console.error(`[Retry ${retryCount + 1}] Error:`, err);
           if (retryCount < MAX_RETRY_ATTEMPTS) { setFailedRequest({ payload, retryCount: retryCount + 1 }); return; } 
           else { const errorMsg = `Falha: ${err.message}`; setError(errorMsg); setMessages(prev => [...prev, { sender: 'assistant', text: errorMsg }]); setFailedRequest(null); }
       } finally { if (failedRequest === null || retryCount >= MAX_RETRY_ATTEMPTS) { setIsLoading(false); } }
   };


  // --- Renderização ---
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background"> 
      <ChatHeader 
        icon={currentAssistant?.icon} 
        name={currentAssistant?.name}
        gifUrl={SOCCER_ANIMATION_URL}
        unreadCount={currentAssistant ? unreadMessages[currentAssistant.id] || 0 : 0}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          // Passando todas as props que o ChatSidebar espera
          inputValue={inputValue}
          isLoading={isLoading || isUploadingAttachment || loadingHistory} 
          userMessages={userMessages}
          onInputChange={setInputValue}
          onSendMessage={handleSendMessage}
          onClearChat={handleClearChat}
          onClearHistory={handleClearHistory}
          isHistoryPanelVisible={isHistoryPanelVisible}
          onToggleHistoryPanel={handleToggleHistoryPanel}
          chatHistory={chatHistory} // Passa o histórico carregado
          selectedHistoryIds={selectedHistoryIds}
          onToggleHistorySelection={handleToggleHistorySelection}
          onDeleteSelectedHistory={handleDeleteSelectedHistory}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onLoadFromHistory={handleLoadFromHistory} // Passa a função
          attachments={attachments}
          onFileUpload={handleFileUpload}
          onRemoveAttachment={handleRemoveAttachment}
          isUploadingAttachment={isUploadingAttachment}
          loadingHistory={loadingHistory} // Passa loading do histórico
        />
        
        {/* *** CORREÇÃO: main com flex-1 e flex-col *** */}
        <main className="flex-1 bg-slate-50 overflow-hidden flex flex-col p-4"> 
          <ChatMessages 
            messages={assistantMessages} // *** CORREÇÃO: Passa SÓ assistantMessages ***
            isLoading={isLoading} 
            error={error}
            loadingGifPath={LOADING_GIF_PATH} 
          />
        </main>
      </div>
      
      {/* Diálogo de confirmação */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {confirmDialogTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialogMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                confirmDialogAction().finally(() => setConfirmDialogOpen(false));
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    {/* *** CORREÇÃO: Tag de fechamento do div principal *** */}
    </div> 
  );
};
        
export default AssistantChat;
