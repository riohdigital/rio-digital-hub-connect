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

// Mensagens de boas-vindas para cada assistente
const assistantDisplayInfo: { [key: string]: { name: string, icon: string, welcomeMessage: string } } = {
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

// Número de mensagens por página para paginação
const MESSAGES_PER_PAGE = 20;

const AssistantChat = () => {
  const { assistantType } = useParams<{ assistantType: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Estado principal
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAssistant, setCurrentAssistant] = useState<AssistantInfo | null>(null);
  
  // Estado para confirmações
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogAction, setConfirmDialogAction] = useState<() => Promise<void>>(() => async () => {});
  const [confirmDialogMessage, setConfirmDialogMessage] = useState("");
  const [confirmDialogTitle, setConfirmDialogTitle] = useState("");
  
  // Funcionalidade de histórico
  const [isHistoryPanelVisible, setIsHistoryPanelVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Persistência local
  const [cachedMessages, setCachedMessages] = useLocalStorage<{[key: string]: Message[]}>('cached_chat_messages', {});
  
  // Estado de retry para solicitações com falha
  const [failedRequest, setFailedRequest] = useState<{payload: any, retryCount: number} | null>(null);
  const MAX_RETRY_ATTEMPTS = 3;
  
  // Estado para anexos
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  
  // Estado para notificações
  const [unreadMessages, setUnreadMessages] = useState<{[key: string]: number}>({});
  const [isChatFocused, setIsChatFocused] = useState(true);
  
  // Filtrar mensagens para sidebar e área de chat principal
  const userMessages = useMemo(() => messages.filter(msg => msg.sender === 'user'), [messages]);
  const assistantMessages = useMemo(() => messages.filter(msg => msg.sender === 'assistant'), [messages]);
  
  // Funções de confirmação
  const showConfirmDialog = (title: string, message: string, action: () => Promise<void>) => {
    setConfirmDialogTitle(title);
    setConfirmDialogMessage(message);
    setConfirmDialogAction(() => action);
    setConfirmDialogOpen(true);
  };
  
  // Buscar histórico de chat do Supabase com paginação
  const fetchChatHistory = useCallback(async (page = 1) => {
    if (!user?.id || !currentAssistant) return;
    
    try {
      setIsLoading(true);
      
      // Primeiro, buscar o total para paginação
      const { count, error: countError } = await supabase
        .from('chat_resultados_esportivos_oficiais_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('assistant_type', currentAssistant.id);
      
      if (countError) {
        throw new Error(countError.message);
      }
      
      const totalItems = count || 0;
      const calculatedTotalPages = Math.ceil(totalItems / MESSAGES_PER_PAGE);
      setTotalPages(calculatedTotalPages || 1);
      
      // Depois buscar os itens para a página atual
      const { data, error } = await supabase
        .from('chat_resultados_esportivos_oficiais_history')
        .select('id, message_content, sender, created_at, attachments')
        .eq('user_id', user.id)
        .eq('assistant_type', currentAssistant.id)
        .order('created_at', { ascending: false })
        .range((page - 1) * MESSAGES_PER_PAGE, page * MESSAGES_PER_PAGE - 1);
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Transformar dados para corresponder à interface Message
      const formattedHistory: Message[] = data.map(item => ({
        id: item.id,
        sender: item.sender as 'user' | 'assistant',
        text: item.message_content,
        created_at: item.created_at,
        attachments: item.attachments
      }));
      
      setChatHistory(formattedHistory);
      setCurrentPage(page);
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
  
  // Alternar visibilidade do painel de histórico
  const handleToggleHistoryPanel = useCallback(() => {
    const newVisibility = !isHistoryPanelVisible;
    setIsHistoryPanelVisible(newVisibility);
    
    // Buscar histórico ao abrir o painel se estiver vazio
    if (newVisibility && chatHistory.length === 0) {
      fetchChatHistory(1);
    }
  }, [isHistoryPanelVisible, chatHistory.length, fetchChatHistory]);
  
  // Alternar seleção de item do histórico
  const handleToggleHistorySelection = useCallback((id: string, isChecked: boolean) => {
    setSelectedHistoryIds(prev => {
      // Se for string vazia, então é uma operação de "selecionar todos" ou "desmarcar todos"
      if (id === "") {
        if (isChecked) {
          // Selecionar todos os itens visíveis
          return chatHistory.filter(msg => msg.id).map(msg => msg.id as string);
        } else {
          // Desmarcar todos
          return [];
        }
      }
      
      // Operação normal para um único item
      if (isChecked) {
        return [...prev, id];
      } else {
        return prev.filter(item => item !== id);
      }
    });
  }, [chatHistory]);
  
  // Excluir itens de histórico selecionados
  const handleDeleteSelectedHistory = useCallback(async () => {
    if (!selectedHistoryIds.length || !user?.id) return;
    
    const deleteAction = async () => {
      try {
        setIsLoading(true);
        
        const { error } = await supabase
          .from('chat_resultados_esportivos_oficiais_history')
          .delete()
          .in('id', selectedHistoryIds);
        
        if (error) {
          throw new Error(error.message);
        }
        
        toast({
          title: "Histórico excluído",
          description: `${selectedHistoryIds.length} ${
            selectedHistoryIds.length === 1 ? "item" : "itens"
          } excluídos com sucesso.`
        });
        
        // Limpar seleção e atualizar histórico
        setSelectedHistoryIds([]);
        fetchChatHistory(currentPage);
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
    };
    
    showConfirmDialog(
      "Confirmar exclusão",
      `Você tem certeza que deseja excluir ${selectedHistoryIds.length} ${
        selectedHistoryIds.length === 1 ? "item" : "itens"
      } do histórico?`,
      deleteAction
    );
  }, [selectedHistoryIds, user, fetchChatHistory, currentPage, toast]);
  
  // Carregar dados do assistente e mensagens iniciais
  useEffect(() => {
    if (assistantType) {
      const displayInfo = assistantDisplayInfo[assistantType] || 
        { name: assistantType, icon: '🤖', welcomeMessage: "Olá! Como posso ajudar?" };
      
      setCurrentAssistant({
        id: assistantType,
        name: displayInfo.name,
        icon: displayInfo.icon,
        welcomeMessage: displayInfo.welcomeMessage
      });
      
      // Verificar se existem mensagens em cache para este assistente
      const cachedAssistantMessages = cachedMessages[assistantType];
      if (cachedAssistantMessages && cachedAssistantMessages.length > 0) {
        setMessages(cachedAssistantMessages);
      } else {
        // Se não houver cache, exibir mensagem de boas-vindas
        setMessages([{
          sender: 'assistant',
          text: displayInfo.welcomeMessage
        }]);
      }
      
      setError(null);
      setIsLoading(false);
    } else {
      navigate('/dashboard');
    }
  }, [assistantType, navigate, cachedMessages]);
  
  // Configuração de retry para solicitações com falha
  useEffect(() => {
    if (failedRequest && failedRequest.retryCount < MAX_RETRY_ATTEMPTS) {
      const timer = setTimeout(() => {
        console.log(`Tentativa ${failedRequest.retryCount + 1} de enviar mensagem...`);
        handleSendMessageWithPayload(failedRequest.payload, failedRequest.retryCount + 1);
      }, 2000 * (failedRequest.retryCount + 1));
      
      return () => clearTimeout(timer);
    } else if (failedRequest && failedRequest.retryCount >= MAX_RETRY_ATTEMPTS) {
      toast({
        title: "Falha na comunicação",
        description: "Não foi possível enviar sua mensagem após várias tentativas. Verifique sua conexão e tente novamente.",
        variant: "destructive"
      });
      setFailedRequest(null);
      setIsLoading(false);
    }
  }, [failedRequest, toast]);
  
  // Atualizar cache quando as mensagens mudarem
  useEffect(() => {
    if (currentAssistant && messages.length > 0) {
      setCachedMessages(prev => ({
        ...prev,
        [currentAssistant.id]: messages
      }));
    }
  }, [messages, currentAssistant, setCachedMessages]);
  
  // Monitorar foco da janela para notificações
  useEffect(() => {
    const handleFocus = () => {
      setIsChatFocused(true);
      // Limpar notificações não lidas para este assistente
      if (currentAssistant) {
        setUnreadMessages(prev => ({
          ...prev,
          [currentAssistant.id]: 0
        }));
      }
    };
    
    const handleBlur = () => {
      setIsChatFocused(false);
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [currentAssistant]);
  
  // Função para enviar mensagem com dados específicos e suporte a retry
  const handleSendMessageWithPayload = async (payload: any, retryCount = 0) => {
    if (!currentAssistant || !user?.id) return;
    
    try {
      setIsLoading(true);
      
      await supabase.from('chat_resultados_esportivos_oficiais_history').insert({
        user_id: user.id,
        assistant_type: currentAssistant.id,
        message_content: payload.message,
        sender: 'user',
        status: 'sent',
        attachments: payload.attachments || []
      });
      
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
      
      if (!response.ok) {
        throw new Error(`Erro na resposta: ${response.status}`);
      }
      
      const data = await response.json();
      // Primeiro verificar cleaned_text conforme solicitado
      const assistantReply = data.cleaned_text || data.output || data.reply || "Desculpe, não consegui processar sua solicitação.";
      
      // Persistir resposta no histórico
      await supabase.from('chat_resultados_esportivos_oficiais_history').insert({
        user_id: user.id,
        assistant_type: currentAssistant.id,
        message_content: assistantReply,
        sender: 'assistant',
        status: 'processed',
      });
      
      // Se o chat não estiver em foco, incrementar contador de mensagens não lidas
      if (!isChatFocused && currentAssistant) {
        setUnreadMessages(prev => ({
          ...prev,
          [currentAssistant.id]: (prev[currentAssistant.id] || 0) + 1
        }));
        
        // Mostrar notificação do navegador se permitido
        if (Notification.permission === "granted") {
          new Notification(`Nova mensagem de ${currentAssistant.name}`, {
            body: assistantReply.substring(0, 100) + (assistantReply.length > 100 ? "..." : ""),
            icon: "/favicon.ico"
          });
        }
      }
      
      setFailedRequest(null);
      setAttachments([]);
    } catch (err: any) {
      console.error("Error in handleSendMessageWithPayload:", err);
      
      // Configurar para retry
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
      }
    } finally {
      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        setIsLoading(false);
      }
    }
  };
  
  // Enviar mensagem com suporte a anexos
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() && attachments.length === 0 || isLoading || !currentAssistant || !user?.id) return;
    
    const messageText = inputValue.trim();
    const userMessage: Message = { 
      sender: 'user', 
      text: messageText,
      attachments: attachments.length > 0 ? [...attachments] : undefined
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    const payload = {
      message: messageText,
      attachments: attachments.length > 0 ? attachments : undefined
    };
    
    // Criar cópia local da mensagem assistente em estado de carregamento
    setMessages(prev => [
      ...prev, 
      { sender: 'assistant', text: "Processando sua mensagem..." }
    ]);
    
    // Enviar mensagem com suporte a retry
    await handleSendMessageWithPayload(payload);
    
    // Atualizar mensagens com a resposta real (substituindo a mensagem de "carregando")
    if (messages.length > 0) {
      const updatedMessages = [...messages];
      updatedMessages[updatedMessages.length - 1] = {
        sender: 'assistant',
        text: "Resposta do assistente aqui"  // Será substituída na próxima renderização
      };
      setMessages(updatedMessages);
    }
  };
  
  // Carregar anexo para mensagem
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
        
        // Fazer upload para o storage do Supabase
        const { data, error } = await supabase.storage
          .from('chat_attachments')
          .upload(`${user.id}/${Date.now()}_${file.name}`, file);
        
        if (error) {
          throw new Error(error.message);
        }
        
        // Obter URL pública
        const { data: urlData } = await supabase.storage
          .from('chat_attachments')
          .getPublicUrl(data.path);
        
        // Adicionar ao estado de anexos
        const newAttachment: Attachment = {
          id: crypto.randomUUID(),
          type: fileType as 'image' | 'file' | 'audio',
          url: urlData.publicUrl,
          name: file.name,
          size: file.size
        };
        
        setAttachments(prev => [...prev, newAttachment]);
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
      // Limpar o input file
      e.target.value = '';
    }
  };
  
  // Remover anexo
  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(attachment => attachment.id !== id));
  };
  
  // Limpar chat
  const handleClearChat = () => {
    const clearAction = async () => {
      if (currentAssistant) {
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
      }
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
  
  // Limpar histórico
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
        
        // Resetar estado do histórico
        setChatHistory([]);
        setSelectedHistoryIds([]);
        setTotalPages(1);
        setCurrentPage(1);
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
  
  // Navegar para outra página do histórico
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    fetchChatHistory(page);
  };
  
  // Carregar conversa do histórico
  const handleLoadFromHistory = (historyMessages: Message[]) => {
    if (!historyMessages.length) return;
    
    const loadAction = async () => {
      setMessages(historyMessages);
      
      // Atualizar cache
      if (currentAssistant) {
        setCachedMessages(prev => ({
          ...prev,
          [currentAssistant.id]: historyMessages
        }));
      }
      
      // Fechar painel de histórico
      setIsHistoryPanelVisible(false);
      
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
  
  // Solicitar permissão para notificações
  const requestNotificationPermission = useCallback(async () => {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        toast({
          title: "Notificações ativadas",
          description: "Você receberá notificações quando receber novas mensagens."
        });
      }
    }
  }, [toast]);
  
  // Solicitar permissão de notificação ao montar o componente
  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);
  
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
        />
        
        <main className="flex-1 bg-background overflow-hidden flex flex-col">
          <ChatMessages 
            messages={messages}
            isLoading={isLoading}
            error={error}
          />
          
          {/* Área de input com suporte a anexos */}
          <div className="border-t p-4 bg-white dark:bg-gray-900 flex flex-col">
            <div className="flex items-center space-x-2 mb-2">
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
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
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
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
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
                        confirmDialogAction().then(() => setConfirmDialogOpen(false));
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
          
