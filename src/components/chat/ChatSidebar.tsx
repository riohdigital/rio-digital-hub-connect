// src/components/chat/ChatSidebar.tsx - CÓDIGO COMPLETO E CORRIGIDO

import React, { useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input"; // ou Textarea
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { History, Send, Trash2, ArchiveX, ChevronDown, ChevronUp, PanelLeftClose, Loader2 } from 'lucide-react'; 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns"; 

// Tipos
interface Message { 
  id?: string; 
  sender: 'user' | 'assistant'; 
  text: string; 
  created_at?: string; 
}

interface ChatSidebarProps {
  // Props de estado/dados
  isHistoryVisible: boolean;          // Estado para controlar a visão do histórico
  userMessages: Message[];           // Mensagens do usuário da sessão atual
  chatHistory: Message[];            // Mensagens carregadas do histórico salvo
  loadingHistory: boolean;           // Indicador de loading para busca/exclusão do histórico
  selectedHistoryIds: string[];      // IDs das mensagens de histórico selecionadas
  inputValue: string;                // Valor atual do campo de input
  isLoading: boolean;                // Indicador de loading do envio de mensagem principal

  // Props de handlers de evento
  onInputChange: (value: string) => void;                   // Atualiza inputValue
  onSendMessage: (e?: React.FormEvent) => void;            // Envia a mensagem
  onClearChat: () => void;                                 // Limpa o chat atual
  onToggleHistoryPanel: () => void;                        // Alterna a visibilidade do histórico
  onClearHistory: () => void;                              // Limpa todo o histórico salvo
  onDeleteSelectedHistory: () => void;                     // Exclui itens selecionados do histórico
  onToggleHistorySelection: (id: string, isChecked: boolean) => void; // Seleciona/desseleciona item do histórico
}

// Otimização com React.memo
export const ChatSidebar = React.memo(({
  // Desestruturação de TODAS as props recebidas
  isHistoryVisible, 
  userMessages, 
  chatHistory, 
  loadingHistory, 
  selectedHistoryIds,
  inputValue, 
  isLoading, 
  onInputChange, 
  onSendMessage, 
  onClearChat, 
  onToggleHistoryPanel, 
  onClearHistory, 
  onDeleteSelectedHistory, 
  onToggleHistorySelection
}: ChatSidebarProps) => { 
  
  // Refs para scroll
  const userMessagesScrollRef = useRef<HTMLDivElement>(null);
  const historyScrollRef = useRef<HTMLDivElement>(null);

  // Efeito para scroll de mensagens do usuário
  useEffect(() => { 
      if (!isHistoryVisible && userMessagesScrollRef.current) {
          const viewport = userMessagesScrollRef.current.querySelector<HTMLDivElement>('div[style*="overflow: scroll;"]');
          const contentWrapper = viewport?.querySelector(':scope > div');
          if (viewport && contentWrapper) { setTimeout(() => { viewport.scrollTop = contentWrapper.scrollHeight; }, 50); } // Pequeno delay
      }
  }, [userMessages, isHistoryVisible]); // Roda quando mensagens do usuário mudam OU visibilidade muda

  // Efeito para scroll do histórico
   useEffect(() => { 
       if (isHistoryVisible && historyScrollRef.current) {
           const viewport = historyScrollRef.current.querySelector<HTMLDivElement>('div[style*="overflow: scroll;"]');
           if (viewport) { setTimeout(() => { viewport.scrollTop = viewport.scrollHeight; }, 50); } // Scroll para o fim ao carregar
       }
   }, [chatHistory, isHistoryVisible]); // Roda quando histórico muda OU visibilidade muda

  // Handler para o form de envio
  const handleSubmit = (e: React.FormEvent) => { 
    e.preventDefault(); 
    onSendMessage(e); 
  };

  // Função segura para formatar data
  const formatHistoryDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Data inválida';
    try {
      // Tenta criar a data e formatar
      return format(new Date(dateString), 'dd/MM HH:mm');
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return 'Data inválida'; // Retorna fallback em caso de erro
    }
  };

  return (
    // Container do Sidebar
    <aside className="w-full md:w-2/5 lg:w-1/3 flex flex-col border-r bg-muted/40 p-4 overflow-hidden shrink-0"> {/* Largura ajustável */}
      
      {/* Cabeçalho do Sidebar */}
      <div className="flex justify-between items-center mb-2 pb-2 border-b shrink-0"> 
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onToggleHistoryPanel}> 
                {isHistoryVisible ? <PanelLeftClose className="h-4 w-4 mr-2" /> : <History className="h-4 w-4 mr-2" />}
                {isHistoryVisible ? "Fechar" : "Histórico"} 
              </Button>
            </TooltipTrigger>
             <TooltipContent><p>{isHistoryVisible ? "Fechar histórico" : "Ver histórico salvo"}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Botões de ação do histórico */}
        <div className={`flex items-center gap-1 transition-opacity duration-200 ${isHistoryVisible ? 'opacity-100' : 'opacity-0 invisible'}`}> {/* Fade in/out */}
             <Button 
                variant="destructive" 
                size="sm" 
                onClick={onDeleteSelectedHistory}
                disabled={selectedHistoryIds.length === 0 || loadingHistory} 
             >
                <Trash2 className="h-4 w-4 mr-1 md:mr-2" /> 
                <span className="hidden md:inline">({selectedHistoryIds.length})</span> 
             </Button>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={onClearHistory}
                    disabled={loadingHistory} 
                  >
                    <ArchiveX className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Apagar todo histórico salvo</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
        </div>
      </div>

      {/* Área de Conteúdo (Histórico OU Mensagens Atuais) */}
      <div className="flex-1 overflow-hidden mb-4"> 
        {isHistoryVisible ? (
            // --- HISTÓRICO ---
            <ScrollArea className="h-full border rounded-md bg-background" ref={historyScrollRef}> 
                 {loadingHistory && <div className="flex justify-center items-center p-6"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
                 {!loadingHistory && chatHistory.length === 0 && <div className="text-center text-sm text-muted-foreground p-6">Nenhum histórico salvo encontrado.</div>}
                 {!loadingHistory && chatHistory.length > 0 && (
                    <div className="space-y-1 p-2">
                        {chatHistory.map((item) => (
                           // Garante que item.id exista antes de passar para o handler
                          item.id ? ( 
                            <div key={item.id} className="flex items-start gap-2 p-1.5 rounded hover:bg-muted transition-colors duration-150">
                                <Checkbox 
                                    id={`hist-${item.id}`} 
                                    checked={selectedHistoryIds.includes(item.id)}
                                    onCheckedChange={(checked) => onToggleHistorySelection(item.id!, !!checked)} 
                                    className="mt-1 shrink-0"
                                    aria-label={`Selecionar mensagem ${item.sender}: ${item.text.substring(0, 30)}...`} 
                                />
                                <label htmlFor={`hist-${item.id}`} className="flex-1 cursor-pointer min-w-0"> {/* min-w-0 evita overflow */}
                                     <div className={`p-2 rounded text-xs shadow-sm ${item.sender === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                        <p className="whitespace-pre-wrap break-words">{item.text}</p>
                                        <p className="text-muted-foreground/80 text-right mt-1 text-[10px]">
                                           {formatHistoryDate(item.created_at)} 
                                        </p>
                                     </div>
                                </label>
                            </div>
                          ) : null // Não renderiza se não tiver ID (segurança)
                        ))}
                    </div>
                 )}
            </ScrollArea>
        ) : (
            // --- MENSAGENS DO USUÁRIO (SESSÃO ATUAL) ---
            <ScrollArea className="h-full" ref={userMessagesScrollRef}> 
              <div className="space-y-3 p-1">
                {/* Renderiza apenas se houver mensagens do usuário */}
                {userMessages.length > 0 ? userMessages.map((msg, index) => (
                  <div key={`user-${index}`} className="flex justify-end animate-fadeIn"> {/* Adiciona animação */}
                    <Card className="max-w-[90%] p-3 shadow-sm bg-primary text-primary-foreground rounded-br-none">
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    </Card>
                  </div>
                )) : (
                    <div className="text-center text-sm text-muted-foreground p-6 italic">Suas mensagens aparecerão aqui.</div>
                )}
              </div>
            </ScrollArea>
        )}
      </div>
      
      {/* Área de Input e Limpar Chat Atual */}
      <div className="shrink-0 border-t pt-4"> 
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <Input // Ou Textarea se preferir multiline
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Digite sua mensagem..."
              disabled={isLoading || loadingHistory} // Desabilita se estiver carregando algo
              className="flex-1 bg-background" // Fundo branco
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { handleSubmit(e as any); } }} 
            />
            <Button type="submit" disabled={isLoading || loadingHistory || !inputValue.trim()} size="icon">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4"/>}
            </Button>
          </form>
          <Button variant="outline" size="sm" onClick={onClearChat} className="mt-2 w-full">
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Conversa Atual
          </Button>
      </div>
    </aside>
  );
});

// Necessário se não for default export no arquivo
// export default ChatSidebar; 
