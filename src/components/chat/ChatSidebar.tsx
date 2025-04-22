// src/components/chat/ChatSidebar.tsx - Bug Fix

import React, { useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input"; // ou Textarea
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { History, Send, Trash2, ArchiveX, PanelLeftClose, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns"; // Para formatar datas

// Tipos
interface Message { id?: string; sender: 'user' | 'assistant'; text: string; created_at?: string; }

interface ChatSidebarProps {
  isHistoryVisible: boolean;
  userMessages: Message[];
  chatHistory: Message[];
  loadingHistory: boolean;
  selectedHistoryIds: string[];
  inputValue: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: (e?: React.FormEvent) => void;
  onClearChat: () => void;
  onToggleHistoryPanel: () => void;
  onClearHistory: () => void;
  onDeleteSelectedHistory: () => void;
  onToggleHistorySelection: (id: string, isChecked: boolean) => void;
}

// Otimização com React.memo
export const ChatSidebar = React.memo(({
  isHistoryVisible, userMessages, chatHistory, loadingHistory, selectedHistoryIds,
  inputValue, isLoading, 
  onInputChange, onSendMessage, onClearChat, onToggleHistoryPanel, onClearHistory, onDeleteSelectedHistory, onToggleHistorySelection
}: ChatSidebarProps) => {
  
  // Refs e useEffects de scroll
  const userMessagesScrollRef = useRef<HTMLDivElement>(null);
  const historyScrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isHistoryVisible && userMessagesScrollRef.current) {
      userMessagesScrollRef.current.scrollTop = userMessagesScrollRef.current.scrollHeight;
    }
  }, [userMessages, isHistoryVisible]);
  
  useEffect(() => {
    if (isHistoryVisible && historyScrollRef.current) {
      historyScrollRef.current.scrollTop = historyScrollRef.current.scrollHeight;
    }
  }, [chatHistory, isHistoryVisible]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSendMessage(e); };

  // Função segura para formatar data
  const formatHistoryDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Data inválida';
    try {
      return format(new Date(dateString), 'dd/MM HH:mm');
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return 'Data inválida';
    }
  };

  return (
    <aside className="w-2/5 flex flex-col border-r bg-muted/40 p-4 overflow-hidden shrink-0"> 
      {/* Cabeçalho do Sidebar */}
      <div className="flex justify-between items-center mb-2 pb-2 border-b shrink-0"> 
         <TooltipProvider> <Tooltip> <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={onToggleHistoryPanel}> 
              {isHistoryVisible ? <PanelLeftClose className="h-4 w-4 mr-2" /> : <History className="h-4 w-4 mr-2" />} 
              {isHistoryVisible ? "Fechar" : "Histórico"} 
            </Button>
         </TooltipTrigger> <TooltipContent>
            <p>{isHistoryVisible ? "Fechar histórico" : "Ver histórico"}</p>
         </TooltipContent> </Tooltip> </TooltipProvider>
         
         <div className={`flex items-center gap-1 ${!isHistoryVisible ? 'invisible' : ''}`}> 
             <Button 
               variant="destructive" 
               size="sm" 
               onClick={onDeleteSelectedHistory} 
               disabled={selectedHistoryIds.length === 0 || loadingHistory}
             > 
               <Trash2 className="h-4 w-4 mr-1 md:mr-2" /> 
               <span className="hidden md:inline">({selectedHistoryIds.length})</span> 
             </Button>
            <TooltipProvider> <Tooltip> <TooltipTrigger asChild>
               <Button 
                 variant="outline" 
                 size="icon" 
                 onClick={onClearHistory} 
                 disabled={loadingHistory} 
                 title="Apagar histórico salvo"
               > 
                 <ArchiveX className="h-4 w-4" /> 
               </Button>
            </TooltipTrigger> <TooltipContent><p>Apagar histórico salvo</p></TooltipContent> </Tooltip> </TooltipProvider>
        </div>
      </div>

      {/* Área de Conteúdo */}
      <div className="flex-1 overflow-hidden mb-4"> 
        {isHistoryVisible ? (
            // --- VISUALIZAÇÃO DO HISTÓRICO ---
            <ScrollArea className="h-full" ref={historyScrollRef}> 
                 {loadingHistory && <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
                 {!loadingHistory && chatHistory.length === 0 && <div className="text-center text-sm text-muted-foreground p-4">Nenhum histórico salvo.</div>}
                 {!loadingHistory && chatHistory.length > 0 && (
                    <div className="space-y-2 p-1">
                        {chatHistory.map((item) => (
                            <div key={item.id} className="flex items-start gap-2 p-1 rounded hover:bg-muted">
                                <Checkbox 
                                    id={`hist-${item.id}`} 
                                    checked={selectedHistoryIds.includes(item.id!)}
                                    onCheckedChange={(checked) => onToggleHistorySelection(item.id!, !!checked)} 
                                    className="mt-1"
                                    aria-label={`Selecionar mensagem ${item.sender}: ${item.text.substring(0, 30)}...`}
                                />
                                <label htmlFor={`hist-${item.id}`} className="flex-1 cursor-pointer">
                                     <div className={`p-2 rounded text-xs ${item.sender === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                        <p className="whitespace-pre-wrap break-words">{item.text}</p>
                                        <p className="text-muted-foreground text-right mt-1 text-[10px]">
                                           {formatHistoryDate(item.created_at)} 
                                        </p>
                                     </div>
                                </label>
                            </div>
                        ))}
                    </div>
                 )}
            </ScrollArea>
        ) : (
            // --- VISUALIZAÇÃO DAS MENSAGENS DO USUÁRIO ---
            <ScrollArea className="h-full" ref={userMessagesScrollRef}> 
              <div className="space-y-2">
                {userMessages.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground p-4">
                    Envie uma mensagem para começar a conversa.
                  </div>
                )}
                {userMessages.map((msg, index) => (
                  <div key={`user-${index}`} className="flex justify-end">
                    <Card className="max-w-[90%] p-3 shadow-sm bg-primary text-primary-foreground rounded-br-none">
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    </Card>
                  </div>
                ))}
              </div>
            </ScrollArea>
        )}
      </div>
      
      {/* Área de Input */}
      <div className="shrink-0"> 
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Digite sua pergunta..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={!inputValue.trim() || isLoading}>
            <Send className="h-4 w-4 mr-2" />
            Enviar
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClearChat} 
            disabled={userMessages.length === 0 || isLoading}
            title="Limpar conversa atual"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </aside>
  );
});
