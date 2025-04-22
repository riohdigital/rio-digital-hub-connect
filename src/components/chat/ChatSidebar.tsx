import { useState } from "react";
import { History, Send, Trash2, ArchiveX, ChevronDown, ChevronUp, Search, Calendar, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format, isToday, isYesterday, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendMessage(e);
  };
  
  // Format date intelligently
  const formatSmartDate = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return `Hoje, ${format(date, 'HH:mm')}`;
    } else if (isYesterday(date)) {
      return `Ontem, ${format(date, 'HH:mm')}`;
    } else if (differenceInDays(new Date(), date) < 7) {
      return format(date, 'eeee', { locale: ptBR });
    } else {
      return format(date, 'dd/MM/yyyy');
    }
  };
  
  // Filter and search history
  const filteredHistory = chatHistory.filter(msg => {
    const matchesSearch = searchQuery === "" || 
      msg.text.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesFilter = 
      filterType === "all" || 
      (filterType === "user" && msg.sender === "user") ||
      (filterType === "assistant" && msg.sender === "assistant");
      
    return matchesSearch && matchesFilter;
  });
  
  // Select all visible items
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const visibleIds = filteredHistory
        .filter(msg => msg.id)
        .map(msg => msg.id as string);
      onToggleHistorySelection("", true);
    } else {
      onToggleHistorySelection("", false);
    }
  };
  
  return (
    <aside className="w-full md:w-96 lg:w-80 xl:w-96 h-full bg-muted/50 border-r flex flex-col p-4">
      <div className="flex flex-wrap gap-2 mb-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex-1 min-w-[160px]"
                onClick={onToggleHistoryPanel}
              >
                <History className="h-4 w-4 mr-2" />
                {isHistoryPanelVisible ? (
                  <>Fechar Histórico <ChevronUp className="h-4 w-4 ml-1" /></>
                ) : (
                  <>Expandir Histórico <ChevronDown className="h-4 w-4 ml-1" /></>
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
              <Button variant="ghost" onClick={onClearHistory} className="flex-1 min-w-[160px]">
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

      <div className="flex-1 overflow-y-auto mb-4">
        {isHistoryPanelVisible ? (
          // History panel content
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar no histórico..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 bg-background h-9"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <Filter className="h-3.5 w-3.5 mr-2" />
                      Filtrar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={filterType} onValueChange={setFilterType}>
                      <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="user">Minhas mensagens</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="assistant">Respostas</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {filteredHistory.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {filteredHistory.length} item{filteredHistory.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
            
            {filteredHistory.length > 0 ? (
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
                
                <div className="space-y-2">
                  {/* Group messages by date */}
                  {filteredHistory.map((msg) => {
                    const date = msg.created_at ? new Date(msg.created_at) : new Date();
                    const formattedDate = formatSmartDate(date.toISOString());
                    
                    return (
                      <div 
                        key={msg.id} 
                        className="flex items-start gap-2 p-2 rounded-md hover:bg-muted transition-colors"
                      >
                        <Checkbox 
                          id={`history-${msg.id}`} 
                          checked={selectedHistoryIds.includes(msg.id || '')}
                          onCheckedChange={(checked) => 
                            onToggleHistorySelection(msg.id || '', checked === true)
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <Badge variant={msg.sender === 'user' ? "default" : "outline"} className="text-xs px-1.5 py-0">
                              {msg.sender === 'user' ? 'Você' : 'Assistente'}
                            </Badge>
                            {msg.created_at && (
                              <span className="text-xs text-muted-foreground flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formattedDate}
                              </span>
                            )}
                          </div>
                          <p className="text-sm line-clamp-2">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <History className="h-8 w-8 text-muted-foreground/50" />
                {searchQuery ? (
                  <p className="text-sm text-muted-foreground">Nenhum resultado para "{searchQuery}"</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum histórico disponível</p>
                )}
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
            {userMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-center p-4">
                <p className="text-sm text-muted-foreground">Envie uma mensagem para iniciar a conversa</p>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          placeholder="Digite sua mensagem aqui..."
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          disabled={isLoading}
          className="min-h-[100px] resize-none bg-background"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (inputValue.trim()) handleSubmit(e);
            }
          }}
        />
        
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            Pressione Enter para enviar, Shift+Enter para nova linha
          </div>
        </div>
        
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
