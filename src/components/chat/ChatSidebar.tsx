
import { History, Send, Trash2, ArchiveX, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  id?: string;
  created_at?: string;
}

interface ChatSidebarProps {
  inputValue: string;
  isLoading: boolean;
  userMessages: Message[];
  onInputChange: (value: string) => void;
  onSendMessage: (e?: React.FormEvent) => void;
  onClearChat: () => void;
  onClearHistory: () => void;
  isHistoryPanelVisible: boolean;
  onToggleHistoryPanel: () => void;
  chatHistory: Message[];
  selectedHistoryIds: string[];
  onToggleHistorySelection: (id: string, isChecked: boolean) => void;
  onDeleteSelectedHistory: () => void;
}

export const ChatSidebar = ({
  inputValue,
  isLoading,
  userMessages,
  onInputChange,
  onSendMessage,
  onClearChat,
  onClearHistory,
  isHistoryPanelVisible,
  onToggleHistoryPanel,
  chatHistory,
  selectedHistoryIds,
  onToggleHistorySelection,
  onDeleteSelectedHistory,
}: ChatSidebarProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendMessage(e);
  };

  return (
    <aside className="w-full md:w-96 h-full bg-muted/50 border-r flex flex-col p-4">
      <div className="flex gap-2 mb-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex-1"
                onClick={onToggleHistoryPanel}
              >
                <History className="h-4 w-4 mr-2" />
                {isHistoryPanelVisible ? (
                  <>Fechar Histórico {<ChevronUp className="h-4 w-4 ml-1" />}</>
                ) : (
                  <>Expandir Histórico {<ChevronDown className="h-4 w-4 ml-1" />}</>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isHistoryPanelVisible ? "Fechar histórico de conversas" : "Ver histórico de conversas"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" onClick={onClearHistory} className="flex-1">
                <ArchiveX className="h-4 w-4 mr-2" />
                Limpar Histórico
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Apagar histórico de conversas salvo</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <ScrollArea className="flex-1 mb-4">
        {isHistoryPanelVisible ? (
          // History panel content
          <div className="space-y-4">
            {chatHistory.length > 0 ? (
              <>
                {selectedHistoryIds.length > 0 && (
                  <div className="mb-2">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={onDeleteSelectedHistory}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Selecionados ({selectedHistoryIds.length})
                    </Button>
                  </div>
                )}
                
                {chatHistory.map((msg) => (
                  <div key={msg.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                    <Checkbox 
                      id={`history-${msg.id}`} 
                      checked={selectedHistoryIds.includes(msg.id || '')}
                      onCheckedChange={(checked) => 
                        onToggleHistorySelection(msg.id || '', checked === true)
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          {msg.sender === 'user' ? 'Você' : 'Assistente'}
                        </span>
                        {msg.created_at && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), 'dd/MM/yyyy HH:mm')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm truncate">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">Nenhum histórico disponível</p>
              </div>
            )}
          </div>
        ) : (
          // User messages content
          <div className="space-y-4">
            {userMessages.map((msg, index) => (
              <div key={index} className="flex justify-end">
                <Card className="max-w-[90%] p-3 bg-primary text-primary-foreground rounded-br-none">
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                </Card>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          placeholder="Digite sua mensagem aqui..."
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          disabled={isLoading}
          className="min-h-[100px] resize-none bg-background"
        />
        
        <div className="flex gap-2">
          <Button 
            type="submit" 
            disabled={isLoading || !inputValue.trim()}
            className="flex-1"
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={onClearChat}
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Chat
          </Button>
        </div>
      </form>
    </aside>
  );
};
