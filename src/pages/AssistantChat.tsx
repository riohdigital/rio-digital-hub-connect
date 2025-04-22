// src/pages/AssistantChat.tsx - CORRIGIDO (Tag de fechamento adicionada)

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"; // Adiciona useRef
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast"; // Verifique o caminho
import { useLocalStorage } from "@/hooks/use-local-storage"; // Hook para cache
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
  // AlertDialogTrigger, // Não usado com controle de estado 'open'
} from "@/components/ui/alert-dialog"; // Componente de diálogo

// Interfaces (Mantenha como antes)
interface Message { id?: string; sender: 'user' | 'assistant'; text: string; created_at?: string; attachments?: Attachment[]; }
interface Attachment { id: string; type: 'image' | 'file' | 'audio'; url: string; name: string; size?: number; }
interface AssistantInfo { id: string; name: string; icon?: string; welcomeMessage?: string; }

// Mock Data e Constantes (Mantenha como antes)
const assistantDisplayInfo: { [key: string]: { name: string, icon: string, welcomeMessage: string } } = { /* ... */ };
const SOCCER_ANIMATION_URL = "/logo.png"; // Use seu GIF/Logo
const MESSAGES_PER_PAGE = 20;

const AssistantChat = () => {
  const { assistantType } = useParams<{ assistantType: string }>();
  const { user, userPlans } = useAuth(); // Inclui userPlans
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Estados (Todos mantidos como antes)
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
  const MAX_RETRY_ATTEMPTS = 3;
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<{[key: string]: number}>({});
  const [isChatFocused, setIsChatFocused] = useState(true);
  
  // Filtros Memoizados (Mantidos)
  const userMessages = useMemo(() => messages.filter(msg => msg.sender === 'user'), [messages]);
  const assistantMessages = useMemo(() => messages.filter(msg => msg.sender === 'assistant'), [messages]);

  // --- Funções (Mantidas como na sua versão) ---
  const showConfirmDialog = (title: string, message: string, action: () => Promise<void>) => { /* ... */ };
  const fetchChatHistory = useCallback(async (page = 1) => { /* ... */ }, [user, currentAssistant, toast]);
  const handleToggleHistoryPanel = useCallback(() => { /* ... */ }, [isHistoryPanelVisible, chatHistory.length, fetchChatHistory]);
  const handleToggleHistorySelection = useCallback((id: string, isChecked: boolean) => { /* ... */ }, [chatHistory]); // Dependência ajustada
  const handleDeleteSelectedHistory = useCallback(async () => { /* ... */ }, [selectedHistoryIds, user, fetchChatHistory, currentPage, toast, showConfirmDialog]); // Adicionado showConfirmDialog
  const handleClearHistory = useCallback(async () => { /* ... */ }, [user, currentAssistant, toast, showConfirmDialog]); // Adicionado showConfirmDialog
  const handleSendMessageWithPayload = useCallback(async (payload: any, retryCount = 0) => { /* ... */ }, [currentAssistant, user?.id, isChatFocused, setUnreadMessages, toast]); // Adicionado dependências
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { /* ... */ };
  const handleRemoveAttachment = (id: string) => { /* ... */ };
  const handleClearChat = () => { /* ... (chamando showConfirmDialog) ... */ 
      const clearAction = async () => {
          if (currentAssistant) {
              const welcomeMessage = { sender: 'assistant' as const, text: currentAssistant.welcomeMessage || "Olá!" };
              setMessages([welcomeMessage]);
              setCachedMessages(prev => ({...prev, [currentAssistant.id]: [welcomeMessage] }));
          }
          setInputValue(""); setError(null); setAttachments([]);
      };
      showConfirmDialog("Limpar conversa", "Limpar a conversa atual (não afeta o histórico salvo)?", clearAction);
  };
  const handlePageChange = (page: number) => { /* ... */ };
  const handleLoadFromHistory = (historyMessages: Message[]) => { /* ... (chamando showConfirmDialog) ... */ };
  const requestNotificationPermission = useCallback(async () => { /* ... */ }, [toast]);
  
   // --- Efeitos (Mantidos como na sua versão) ---
   useEffect(() => { /* ... inicialização do assistente e cache ... */ }, [assistantType, navigate, cachedMessages]);
   useEffect(() => { /* ... retry ... */ }, [failedRequest, toast, handleSendMessageWithPayload]); // Adicionado handleSendMessageWithPayload
   useEffect(() => { /* ... cache de mensagens ... */ }, [messages, currentAssistant, setCachedMessages]);
   useEffect(() => { /* ... foco da janela ... */ }, [currentAssistant, setUnreadMessages]);
   useEffect(() => { /* ... permissão de notificação ... */ }, [requestNotificationPermission]);

  // --- Função de Envio Principal (handleSendMessage) ---
  // (Deve chamar handleSendMessageWithPayload como na sua versão)
  const handleSendMessage = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if ((!inputValue.trim() && attachments.length === 0) || isLoading || !currentAssistant || !user?.id) return;
      
      const messageText = inputValue.trim();
      // Cria ID local para key (Supabase gerará o ID real ao salvar)
      const tempId = crypto.randomUUID(); 
      const userMessage: Message = { 
        id: tempId, // Adiciona ID temporário
        sender: 'user', 
        text: messageText,
        attachments: attachments.length > 0 ? [...attachments] : undefined,
        created_at: new Date().toISOString() // Adiciona timestamp local
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInputValue('');
      const currentAttachments = [...attachments]; // Copia anexos atuais
      setAttachments([]); // Limpa anexos da UI
      
      const payload = {
        message: messageText,
        attachments: currentAttachments.length > 0 ? currentAttachments : undefined
      };
      
      // Não adiciona mais a mensagem "Processando..." aqui, deixa ChatMessages cuidar do isLoading
      
      await handleSendMessageWithPayload(payload); 
  };


  return (
    // Container principal
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background"> 
      <ChatHeader 
        icon={currentAssistant?.icon} 
        name={currentAssistant?.name}
        gifUrl={SOCCER_ANIMATION_URL}
        unreadCount={currentAssistant ? unreadMessages[currentAssistant.id] || 0 : 0}
      />
      
      {/* Conteúdo principal (Sidebar + Main) */}
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          // Passando todas as props necessárias (verifique se estão todas aqui)
          inputValue={inputValue}
          isLoading={isLoading || isUploadingAttachment} // Combina loadings
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
          onLoadFromHistory={handleLoadFromHistory} // Passa a função
          attachments={attachments}
          onFileUpload={handleFileUpload}
          onRemoveAttachment={handleRemoveAttachment}
          isUploadingAttachment={isUploadingAttachment}
          loadingHistory={loadingHistory} // Passa loading do histórico
        />
        
        <main className="flex-1 bg-slate-50 overflow-hidden flex flex-col p-4"> {/* Ajustado: flex-1, bg */}
          <ChatMessages 
            messages={assistantMessages} // Passa só mensagens do assistente
            isLoading={isLoading} // Passa loading do envio
            error={error}
            // Passa o caminho do GIF local que você colocou em /public
            loadingGifPath="/loading-sports.gif" 
             // requestStartTime={requestStartTimeRef.current} // Removido se não usar tempo dinâmico
          />
          {/* Área de input foi movida para o ChatSidebar na sua versão, então não precisa aqui */}
        </main>
      </div>
      
      {/* Diálogo de confirmação (JSX correto) */}
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
    {/* *** TAG DE FECHAMENTO CORRIGIDA *** */}
    </div> 
  );
};
        
export default AssistantChat;
