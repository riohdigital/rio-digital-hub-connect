// src/pages/AssistantChat.tsx - CORRIGIDO E COMPLETADO

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage"; // Assumindo que este hook existe em src/hooks/
import { AlertTriangle, Paperclip } from "lucide-react"; // Paperclip não é mais usado aqui
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
const assistantDisplayInfo: { [key: string]: { name: string, icon: string, welcomeMessage: string } } = { /* ... como antes ... */ };
const SOCCER_ANIMATION_URL = "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExODIxcDQ4azljM2lxMHlmdGQ5NHR0bWhrNXlycWwzcDF0MThudWRoNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/elatsjsGzdLtNov4Ky/giphy.gif"; // Ou logo.png
const MESSAGES_PER_PAGE = 20;
const LOADING_GIF_PATH = "/loading-sports.gif"; // Caminho para o GIF local
const MAX_RETRY_ATTEMPTS = 3;

// --- Componente Principal ---
const AssistantChat = () => {
  const { assistantType } = useParams<{ assistantType: string }>();
  const { user, userPlans } = useAuth(); // Adiciona userPlans
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // --- Estados ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [cachedMessages, setCachedMessages] = useLocalStorage<{[key: string]: Message[]}>('cached_chat_messages', {});
  const [failedRequest, setFailedRequest] = useState<{payload: any, retryCount: number} | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<{[key: string]: number}>({});
  const [isChatFocused, setIsChatFocused] = useState(true);
  
  // --- Memos para Filtragem ---
  const userMessages = useMemo(() => messages.filter(msg => msg.sender === 'user'), [messages]);
  const assistantMessages = useMemo(() => messages.filter(msg => msg.sender === 'assistant'), [messages]);
  
  // --- Funções (Mantidas como na sua versão, mas com ajustes menores) ---
  const showConfirmDialog = (title: string, message: string, action: () => Promise<void>) => { /* ... */ };
  const fetchChatHistory = useCallback(async (page = 1) => { /* ... (usar setLoadingHistory) ... */ }, [user, currentAssistant, toast]);
  const handleToggleHistoryPanel = useCallback(() => { /* ... */ }, [isHistoryPanelVisible, chatHistory.length, fetchChatHistory]);
  const handleToggleHistorySelection = useCallback((id: string, isChecked: boolean) => { /* ... */ }, [chatHistory]); 
  const handleDeleteSelectedHistory = useCallback(async () => { /* ... (usar showConfirmDialog e setLoadingHistory) ... */ }, [selectedHistoryIds, user, fetchChatHistory, currentPage, toast, showConfirmDialog]);
  const handleClearHistory = useCallback(async () => { /* ... (usar showConfirmDialog e setLoadingHistory) ... */ }, [user, currentAssistant, toast, showConfirmDialog]);
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { /* ... */ };
  const handleRemoveAttachment = (id: string) => { /* ... */ };
  const handleClearChat = () => { /* ... (usar showConfirmDialog) ... */ };
  const handlePageChange = (page: number) => { /* ... */ };
  const handleLoadFromHistory = (historyMessages: Message[]) => { /* ... (usar showConfirmDialog) ... */ };
  const requestNotificationPermission = useCallback(async () => { /* ... */ }, [toast]);

  // --- Efeitos (Mantidos como na sua versão) ---
  useEffect(() => { /* ... inicialização do assistente e cache ... */ }, [assistantType, navigate, cachedMessages]);
  useEffect(() => { /* ... retry ... */ }, [failedRequest, toast, handleSendMessageWithPayload]); // Necessita definir handleSendMessageWithPayload
  useEffect(() => { /* ... cache de mensagens ... */ }, [messages, currentAssistant, setCachedMessages]);
  useEffect(() => { /* ... foco da janela ... */ }, [currentAssistant, setUnreadMessages]);
  useEffect(() => { /* ... permissão de notificação ... */ }, [requestNotificationPermission]);

  // --- Função de Envio Principal (handleSendMessage e handleSendMessageWithPayload) ---
  // Combinando e simplificando a lógica de envio e retry
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputValue.trim() && attachments.length === 0) || isLoading || !currentAssistant || !user?.id) return;

    const messageText = inputValue.trim();
    const currentAttachments = [...attachments]; // Copia os anexos atuais

    // Cria a mensagem do usuário com ID temporário e timestamp
    const tempId = crypto.randomUUID(); 
    const userMessage: Message = { 
      id: tempId,
      sender: 'user', 
      text: messageText,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
      created_at: new Date().toISOString() 
    };
    
    // Adiciona imediatamente à UI
    setMessages(prev => [...prev, userMessage]); 
    // Limpa input e anexos da UI
    setInputValue('');
    setAttachments([]); 
    
    // Prepara o payload para N8N e Supabase
    const payload = {
      message: messageText,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined
    };

    // Salva mensagem do usuário no DB (sem esperar)
    supabase.from('chat_resultados_esportivos_oficiais_history').insert({ 
        user_id: user.id, 
        assistant_type: currentAssistant.id, 
        message_content: userMessage.text, 
        sender: userMessage.sender, 
        status: 'sent', 
        attachments: userMessage.attachments // Salva anexos aqui
    }).then(({ error }) => { if (error) console.error("Error saving user message:", error); });

    // Inicia o processo de envio/retry
    await executeSendWithRetry(payload);
  };

  // Função separada para execução com retry
  const executeSendWithRetry = async (payload: any, retryCount = 0) => {
    if (!currentAssistant || !user?.id) return; // Checagem de segurança

    setIsLoading(true); // Define loading para esta tentativa
    setError(null);
    let requestStartTime = Date.now();

    try {
        const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}/webhook/5c024eb2-5ab2-4be3-92f9-26250da4c65d`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ // Envia o payload
                message: payload.message,
                userId: user.id,
                sessionId: user.id, // Mantém sessionId
                attachments: payload.attachments 
            }),
        });

        let responseTime = Date.now() - requestStartTime;

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const responseText = await response.text();
        let data;
        try { data = JSON.parse(responseText); } 
        catch (parseError) { throw new Error(`N8N response is not valid JSON: ${responseText.substring(0,100)}`); }

        const assistantReply = data?.cleaned_text || data?.output || data?.reply || null;
        if (!assistantReply || typeof assistantReply !== 'string' || assistantReply.trim() === '') {
             throw new Error("Assistant returned an invalid or empty response.");
        }

        const assistantMessage: Message = { 
            id: crypto.randomUUID(), // ID temporário para a UI
            sender: 'assistant', 
            text: assistantReply.trim(),
            created_at: new Date().toISOString() // Timestamp local
        };
        setMessages(prev => [...prev, assistantMessage]); // Adiciona resposta à UI

        // Salva resposta do assistente no DB (sem esperar)
        supabase.from('chat_resultados_esportivos_oficiais_history').insert({ 
            user_id: user.id, 
            assistant_type: currentAssistant.id, 
            message_content: assistantMessage.text, 
            sender: assistantMessage.sender, 
            status: 'processed', 
            response_time: `${responseTime} ms` // Salva tempo de resposta
        }).then(({ error }) => { if (error) console.error("Error saving assistant message:", error); });

        setFailedRequest(null); // Limpa estado de falha se sucesso

    } catch (err: any) {
        console.error(`[executeSendWithRetry attempt ${retryCount + 1}] Error:`, err);
        
        if (retryCount < MAX_RETRY_ATTEMPTS) {
            // Configura para próxima tentativa
            setFailedRequest({ payload, retryCount: retryCount + 1 }); 
            // Adiciona mensagem de tentativa ao chat (opcional)
            // setMessages(prev => [...prev, { sender: 'assistant', text: `Tentativa ${retryCount + 1} falhou. Tentando novamente...` }]);
             // Mantém isLoading = true até o fim das tentativas ou sucesso
             // O useEffect de failedRequest vai disparar a próxima tentativa
             return; // Sai da função para não setar isLoading=false ainda
        } else {
            // Máximo de tentativas atingido
            const errorMsg = `Falha ao enviar após ${MAX_RETRY_ATTEMPTS + 1} tentativas: ${err.message}`;
            setError(errorMsg);
            setMessages(prev => [...prev, { sender: 'assistant', text: errorMsg }]);
            setFailedRequest(null); // Limpa estado de falha
        }
    } finally {
        // Só desativa o loading geral se for a última tentativa (falha) ou sucesso
         if (failedRequest === null || retryCount >= MAX_RETRY_ATTEMPTS) {
           setIsLoading(false);
         }
    }
  };


  // --- Renderização ---
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background"> {/* Tag de fechamento CORRIGIDA */}
      <ChatHeader 
        icon={currentAssistant?.icon} 
        name={currentAssistant?.name}
        gifUrl={SOCCER_ANIMATION_URL}
        unreadCount={currentAssistant ? unreadMessages[currentAssistant.id] || 0 : 0}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          // Passando todas as props necessárias
          inputValue={inputValue}
          isLoading={isLoading || isUploadingAttachment || loadingHistory} // Combina todos os loadings relevantes para o sidebar
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
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onLoadFromHistory={handleLoadFromHistory}
          attachments={attachments}
          onFileUpload={handleFileUpload}
          onRemoveAttachment={handleRemoveAttachment}
          isUploadingAttachment={isUploadingAttachment}
          loadingHistory={loadingHistory}
        />
        
        {/* Painel Direito */}
        <main className="flex-1 bg-slate-50 overflow-hidden flex flex-col p-4"> {/* flex-1 para ocupar espaço */}
          <ChatMessages 
            messages={assistantMessages} // *** CORREÇÃO: Passa SÓ as mensagens do assistente ***
            isLoading={isLoading} // Passa loading do envio/retry
            error={error}
            loadingGifPath={LOADING_GIF_PATH} // Passa caminho do GIF local
            // requestStartTime={requestStartTimeRef.current} // Removido - Calculado em ChatMessages
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
    </div> // *** ESTA É A TAG DE FECHAMENTO PRINCIPAL ***
  );
};
        
export default AssistantChat;
