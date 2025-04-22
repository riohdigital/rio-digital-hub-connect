import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { AlertTriangle, Paperclip } from "lucide-react";
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

// Tipos
interface Message {
  id?: string;
  sender: 'user' | 'assistant';
  text: string;
  created_at?: string;
  attachments?: Attachment[];
}

interface Attachment {
  id: string;
  type: 'image' | 'file' | 'audio';
  url: string;
  name: string;
  size?: number;
}

interface AssistantInfo {
  id: string;
  name: string;
  icon?: string;
  welcomeMessage?: string;
}

// Configurações
const MESSAGES_PER_PAGE = 20;
const MAX_RETRY_ATTEMPTS = 3;

// Informações dos assistentes
const assistantDisplayInfo = {
  "assistente_de_resultados_esportivos": {
    name: "Resultados Esportivos Oficiais",
    icon: "🏆",
    welcomeMessage: "Olá! 👋 Sou o Agente de Resultados Esportivos Oficiais. Para verificar sua aposta, por favor, informe:\n\n⚽ Jogo (Time A vs Time B)\n📅 Data (YYYY-MM-DD)\n📊 Mercado (ex: Placar Final)\n✅ Seleção (ex: Time A vence)"
  },
  "digirioh": {
    name: "DigiRioh",
    icon: "⚙️",
    welcomeMessage: "Olá! Sou o DigiRioh, seu assistente de tecnologia. Como posso ajudar hoje?"
  },
  "agente_do_booking": {
    name: "Agente do Booking",
    icon: "🏨",
    welcomeMessage: "Olá! Sou o Agente do Booking. Como posso ajudar com sua reserva de hotel hoje?"
  },
  "agente_de_airbnb": {
    name: "Agente de Airbnb",
    icon: "🏠",
    welcomeMessage: "Olá! Sou o Agente de Airbnb. Precisa de ajuda para encontrar uma acomodação ou gerenciar sua reserva?"
  },
};

const AssistantChat = () => {
  const { assistantType } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Estado principal
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAssistant, setCurrentAssistant] = useState<AssistantInfo | null>(null);
  
  // Estado para anexos
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  
  // Estado para diálogo de confirmação
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    message: "",
    action: async () => {}
  });
  
  // Estado para histórico
  const [historyState, setHistoryState] = useState({
    isVisible: false,
    items: [] as Message[],
    selectedIds: [] as string[],
    currentPage: 1,
    totalPages: 1
  });
  
  // Estado para retry
  const [failedRequest, setFailedRequest] = useState<{payload: any, retryCount: number} | null>(null);
  
  // Estado para notificações
  const [unreadMessages, setUnreadMessages] = useState<{[key: string]: number}>({});
  const [isChatFocused, setIsChatFocused] = useState(true);
  
  // Cache local
  const [cachedMessages, setCachedMessages] = useLocalStorage<{[key: string]: Message[]}>('cached_chat_messages', {});
  
  // Memorização de mensagens filtradas
  const userMessages = useMemo(() => 
    messages.filter(msg => msg.sender === 'user'), [messages]
  );
  
  // Diálogo de confirmação
  const showConfirmDialog = (title: string, message: string, action: () => Promise<void>) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      action
    });
  };

  // Carregar assistente e mensagens iniciais
  useEffect(() => {
    if (!assistantType) {
      navigate('/dashboard');
      return;
    }
    
    const displayInfo = assistantDisplayInfo[assistantType] || 
      { name: assistantType, icon: '🤖', welcomeMessage: "Olá! Como posso ajudar?" };
    
    setCurrentAssistant({
      id: assistantType,
      name: displayInfo.name,
      icon: displayInfo.icon,
      welcomeMessage: displayInfo.welcomeMessage
    });
    
    // Verificar mensagens em cache
    const cached = cachedMessages[assistantType];
    setMessages(cached?.length > 0 
      ? cached 
      : [{ sender: 'assistant', text: displayInfo.welcomeMessage }]
    );
    
    setError(null);
    setIsLoading(false);
  }, [assistantType, navigate, cachedMessages]);
  
  // Monitorar foco da janela para notificações
  useEffect(() => {
    const handleFocus = () => {
      setIsChatFocused(true);
      if (currentAssistant) {
        setUnreadMessages(prev => ({ ...prev, [currentAssistant.id]: 0 }));
      }
    };
    
    const handleBlur = () => setIsChatFocused(false);
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [currentAssistant]);
  
  // Atualizar cache de mensagens
  useEffect(() => {
    if (currentAssistant && messages.length > 0) {
      setCachedMessages(prev => ({
        ...prev,
        [currentAssistant.id]: messages
      }));
    }
  }, [messages, currentAssistant, setCachedMessages]);
  
  // Configuração de retry para solicitações falhas
  useEffect(() => {
    if (!failedRequest || failedRequest.retryCount >= MAX_RETRY_ATTEMPTS) {
      if (failedRequest) {
        toast({
          title: "Falha na comunicação",
          description: "Não foi possível enviar sua mensagem após várias tentativas.",
          variant: "destructive"
        });
        setFailedRequest(null);
        setIsLoading(false);
      }
      return;
    }
    
    const timer = setTimeout(() => {
      console.log(`Tentativa ${failedRequest.retryCount + 1} de enviar mensagem...`);
      handleSendMessageWithPayload(failedRequest.payload, failedRequest.retryCount + 1);
    }, 2000 * (failedRequest.retryCount + 1));
    
    return () => clearTimeout(timer);
  }, [failedRequest, toast]);
  
  // Solicitar permissão para notificações
  useEffect(() => {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          toast({
            title: "Notificações ativadas",
            description: "Você receberá notificações quando receber novas mensagens."
          });
        }
      });
    }
  }, [toast]);
  
  // Carregar histórico de chat
  const fetchChatHistory = useCallback(async (page = 1) => {
    if (!user?.id || !currentAssistant) return;
    
    try {
      setIsLoading(true);
      
      // Buscar total para paginação
      const { count, error: countError } = await supabase
        .from('chat_resultados_esportivos_oficiais_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('assistant_type', currentAssistant.id);
      
      if (countError) throw new Error(countError.message);
      
      const totalItems = count || 0;
      const calculatedTotalPages = Math.ceil(totalItems / MESSAGES_PER_PAGE) || 1;
      
      // Buscar itens da página atual
      const { data, error } = await supabase
        .from('chat_resultados_esportivos_oficiais_history')
        .select('id, message_content, sender, created_at, attachments')
        .eq('user_id', user.id)
        .eq('assistant_type', currentAssistant.id)
        .order('created_at', { ascending: false })
        .range((page - 1) * MESSAGES_PER_PAGE, page * MESSAGES_PER_PAGE - 1);
      
      if (error) throw new Error(error.message);
      
      // Formatar histórico
      const formattedHistory: Message[] = data.map(item => ({
        id: item.id,
        sender: item.sender as 'user' | 'assistant',
        text: item.message_content,
        created_at: item.created_at,
        attachments: item.attachments
      }));
      
      setHistoryState(prev => ({
        ...prev,
        items: formattedHistory,
        currentPage: page,
        totalPages: calculatedTotalPages
      }));
    } catch (err: any) {
      console.error("Error fetching history:", err);
      toast({
        title: "Erro ao carregar histórico",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, currentAssistant, toast]);
  
  // Alternar visibilidade do painel de histórico
  const handleToggleHistoryPanel = useCallback(() => {
    const newVisibility = !historyState.isVisible;
    setHistoryState(prev => ({ ...prev, isVisible: newVisibility }));
    
    // Buscar histórico ao abrir o painel se estiver vazio
    if (newVisibility && historyState.items.length === 0) {
      fetchChatHistory(1);
    }
  }, [historyState.isVisible, historyState.items.length, fetchChatHistory]);
  
  // Enviar mensagem com retry
  const handleSendMessageWithPayload = async (payload: any, retryCount = 0) => {
    if (!currentAssistant || !user?.id) return;
    
    try {
      setIsLoading(true);
      
      // Salvar mensagem do usuário no histórico
      await supabase.from('chat_resultados_esportivos_oficiais_history').insert({
        user_id: user.id,
        assistant_type: currentAssistant.id,
        message_content: payload.message,
        sender: 'user',
        status: 'sent',
        attachments: payload.attachments || []
      });
      
      // Enviar para webhook
      const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}/webhook/5c024eb2-5ab2-4be3-92f9-26250da4c65d`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: payload.message,
          userId: user.id,
          sessionId: user.id,
          attachments: payload.attachments || []
        }),
      });
      
      if (!response.ok) throw new Error(`Erro na resposta: ${response.status}`);
      
      const data = await response.json();
      const assistantReply = data.cleaned_text || data.output || data.reply || 
        "Desculpe, não consegui processar sua solicitação.";
      
      // Salvar resposta no histórico
      await supabase.from('chat_resultados_esportivos_oficiais_history').insert({
        user_id: user.id,
        assistant_type: currentAssistant.id,
        message_content: assistantReply,
        sender: 'assistant',
        status: 'processed',
      });
      
      // Notificações
      if (!isChatFocused && currentAssistant) {
        // Incrementar contador
        setUnreadMessages(prev => ({
          ...prev,
          [currentAssistant.id]: (prev[currentAssistant.id] || 0) + 1
        }));
        
        // Notificação do navegador
        if (Notification.permission === "granted") {
          new Notification(`Nova mensagem de ${currentAssistant.name}`, {
            body: assistantReply.substring(0, 100) + (assistantReply.length > 100 ? "..." : ""),
            icon: "/favicon.ico"
          });
        }
      }
      
      // Atualizar mensagens com resposta real
      setMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          // Substituir a última mensagem (loading) pela resposta real
          updated[updated.length - 1] = {
            sender: 'assistant',
            text: assistantReply
          };
        }
        return updated;
      });
      
      setFailedRequest(null);
      setAttachments([]);
      setIsLoading(false);
    } catch (err: any) {
      console.error("Error sending message:", err);
      
      // Configurar retry
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        setFailedRequest({ payload, retryCount });
      } else {
        toast({
          title: "Erro ao enviar mensagem",
          description: err.message,
          variant: "destructive"
        });
        setError(err.message);
        setFailedRequest(null);
        setIsLoading(false);
      }
    }
  };
  
  // Enviar mensagem
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputValue.trim() && attachments.length === 0) || isLoading || !currentAssistant || !user?.id) return;
    
    const messageText = inputValue.trim();
    
    // Adicionar mensagem do usuário
    const userMessage: Message = { 
      sender: 'user', 
      text: messageText,
      attachments: attachments.length > 0 ? [...attachments] : undefined
    };
    
    // Adicionar mensagem de carregamento do assistente
    setMessages(prev => [
      ...prev, 
      userMessage,
      { sender: 'assistant', text: "Processando sua mensagem..." }
    ]);
    
    setInputValue('');
    
    // Preparar payload
    const payload = {
      message: messageText,
      attachments: attachments.length > 0 ? attachments : undefined
    };
    
    // Enviar com suporte a retry
    await handleSendMessageWithPayload(payload);
  };
  
  // Upload de arquivo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user?.id) return;
    
    try {
      setIsUploadingAttachment(true);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileType = file.type.startsWith('image/') 
          ? 'image' 
          : file.type.startsWith('audio/') 
            ? 'audio' 
            : 'file';
        
        // Upload para Supabase
        const { data, error } = await supabase.storage
          .from('chat_attachments')
          .upload(`${user.id}/${Date.now()}_${file.name}`, file);
        
        if (error) throw new Error(error.message);
        
        // URL pública
        const { data: urlData } = await supabase.storage
          .from('chat_attachments')
          .getPublicUrl(data.path);
        
        // Adicionar ao estado
        setAttachments(prev => [...prev, {
          id: crypto.randomUUID(),
          type: fileType as 'image' | 'file' | 'audio',
          url: urlData.publicUrl,
          name: file.name,
          size: file.size
        }]);
      }
      
      toast({
        title: "Anexo carregado",
        description: `${files.length} ${files.length === 1 ? "arquivo anexado" : "arquivos anexados"} com sucesso.`
      });
      
    } catch (err: any) {
      console.error("Error uploading file:", err);
      toast({
        title: "Erro ao carregar anexo",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = ''; // Limpar input
    }
  };
  
  // Remover anexo
  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(attachment => attachment.id !== id));
  };
  
  // Limpar chat
  const handleClearChat = () => {
    if (!currentAssistant) return;
    
    const clearAction = async () => {
      const welcomeMessage = {
        sender: 'assistant' as const,
        text: currentAssistant.welcomeMessage || "Olá! Como posso ajudar?"
      };
      
      setMessages([welcomeMessage]);
      
      // Atualizar cache
      setCachedMessages(prev => ({
        ...prev,
        [currentAssistant.id]: [welcomeMessage]
      }));
      
      setInputValue("");
      setError(null);
      setAttachments([]);
    };
    
    showConfirmDialog(
      "Limpar conversa",
      "Tem certeza que deseja limpar esta conversa? Esta ação não pode ser desfeita.",
      clearAction
    );
  };
  
  // Funções para gerenciamento de histórico
  
  // Alternar seleção de item histórico
  const handleToggleHistorySelection = (id: string, isChecked: boolean) => {
    setHistoryState(prev => {
      const { selectedIds, items } = prev;
      
      // Operação de selecionar/desmarcar todos
      if (id === "") {
        if (isChecked) {
          // Selecionar todos
          return {
            ...prev,
            selectedIds: items.filter(msg => msg.id).map(msg => msg.id as string)
          };
        } else {
          // Desmarcar todos
          return { ...prev, selectedIds: [] };
        }
      }
      
      // Operação normal para um item
      const newSelectedIds = isChecked
        ? [...selectedIds, id]
        : selectedIds.filter(item => item !== id);
        
      return { ...prev, selectedIds: newSelectedIds };
    });
  };
  
  // Excluir histórico selecionado
  const handleDeleteSelectedHistory = () => {
    const { selectedIds } = historyState;
    if (!selectedIds.length || !user?.id) return;
    
    const deleteAction = async () => {
      try {
        setIsLoading(true);
        
        const { error } = await supabase
          .from('chat_resultados_esportivos_oficiais_history')
          .delete()
          .in('id', selectedIds);
        
        if (error) throw new Error(error.message);
        
        toast({
          title: "Histórico excluído",
          description: `${selectedIds.length} ${
            selectedIds.length === 1 ? "item" : "itens"
          } excluídos com sucesso.`
        });
        
        // Limpar seleção e atualizar
        setHistoryState(prev => ({ ...prev, selectedIds: [] }));
        fetchChatHistory(historyState.currentPage);
      } catch (err: any) {
        console.error("Error deleting history:", err);
        toast({
          title: "Erro ao excluir histórico",
          description: err.message,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    showConfirmDialog(
      "Confirmar exclusão",
      `Você tem certeza que deseja excluir ${selectedIds.length} ${
        selectedIds.length === 1 ? "item" : "itens"
      } do histórico?`,
      deleteAction
    );
  };
  
  // Limpar todo o histórico
  const handleClearHistory = async () => {
    if (!user || !currentAssistant) return;
    
    const clearHistoryAction = async () => {
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
        
        // Resetar estado
        setHistoryState(prev => ({
          ...prev,
          items: [],
          selectedIds: [],
          totalPages: 1,
          currentPage: 1
        }));
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
    };
    
    showConfirmDialog(
      "Apagar histórico",
      "Tem certeza que deseja apagar todo o histórico de conversas salvo? Esta ação não pode ser desfeita.",
      clearHistoryAction
    );
  };
  
  // Carregar conversa do histórico
  const handleLoadFromHistory = (historyMessages: Message[]) => {
    if (!historyMessages.length) return;
    
    const loadAction = async () => {
      setMessages(historyMessages);
      
      if (currentAssistant) {
        setCachedMessages(prev => ({
          ...prev,
          [currentAssistant.id]: historyMessages
        }));
      }
      
      setHistoryState(prev => ({ ...prev, isVisible: false }));
      
      toast({
        title: "Conversa carregada",
        description: "A conversa selecionada foi carregada com sucesso."
      });
    };
    
    showConfirmDialog(
      "Carregar conversa",
      "Carregar esta conversa substituirá sua conversa atual. Deseja continuar?",
      loadAction
    );
  };
  
  // Paginação do histórico
  const handlePageChange = (page: number) => {
    if (page < 1 || page > historyState.totalPages) return;
    fetchChatHistory(page);
  };
  
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <ChatHeader
        icon={currentAssistant?.icon}
        name={currentAssistant?.name}
        gifUrl="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExODIxcDQ4azljM2lxMHlmdGQ5NHR0bWhrNXlycWwzcDF0MThudWRoNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/elatsjsGzdLtNov4Ky/giphy.gif"
        unreadCount={currentAssistant ? unreadMessages[currentAssistant.id] || 0 : 0}
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
          isHistoryPanelVisible={historyState.isVisible}
          onToggleHistoryPanel={handleToggleHistoryPanel}
          chatHistory={historyState.items}
          selectedHistoryIds={historyState.selectedIds}
          onToggleHistorySelection={handleToggleHistorySelection}
          onDeleteSelectedHistory={handleDeleteSelectedHistory}
          currentPage={historyState.currentPage}
          totalPages={historyState.totalPages}
          onPageChange={handlePageChange}
          onLoadFromHistory={handleLoadFromHistory}
          attachments={attachments}
          onFileUpload={handleFileUpload}
          onRemoveAttachment={handleRemoveAttachment}
          isUploadingAttachment={isUploadingAttachment}
        />
        
        <main className="flex-1 bg-background overflow-hidden flex flex-col">
          <ChatMessages 
            messages={messages}
            isLoading={isLoading}
            error={error}
          />
          
          {/* Input com suporte a anexos */}
          <div className="border-t p-4 bg-white dark:bg-gray-900 flex flex-col">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map(attachment => (
                  <div 
                    key={attachment.id}
                    className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-1"
                  >
                    <span className="text-sm truncate max-w-[100px]">{attachment.name}</span>
                    <button 
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      className="ml-2 text-gray-500 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <form onSubmit={handleSendMessage} className="flex items-center">
              <label className="cursor-pointer mr-2">
                <Paperclip className="h-5 w-5 text-gray-500" />
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                  disabled={isUploadingAttachment || isLoading}
                  multiple
                />
              </label>
              
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Digite sua mensagem..."
                disabled={isLoading}
                className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
              />
              
              <button 
                type="submit" 
                disabled={(!inputValue.trim() && attachments.length === 0) || isLoading}
                className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Enviar
              </button>
            </form>
          </div>
        </main>
      </div>
      
      {/* Diálogo de confirmação */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(isOpen) => setConfirmDialog(prev => ({...prev, open: isOpen}))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {confirmDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                confirmDialog.action().finally(() => 
                  setConfirmDialog(prev => ({...prev, open: false}))
                );
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AssistantChat;
