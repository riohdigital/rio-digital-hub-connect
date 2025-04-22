
import { History, Send, Trash2, ArchiveX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

interface ChatSidebarProps {
  inputValue: string;
  isLoading: boolean;
  messages: Message[];
  onInputChange: (value: string) => void;
  onSendMessage: (e?: React.FormEvent) => void;
  onClearChat: () => void;
  onClearHistory: () => void;
}

export const ChatSidebar = ({
  inputValue,
  isLoading,
  messages,
  onInputChange,
  onSendMessage,
  onClearChat,
  onClearHistory,
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
              <Button variant="ghost" className="flex-1">
                <History className="h-4 w-4 mr-2" />
                Expandir Histórico
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Histórico de conversas (Em breve)</p>
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
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className="flex justify-end">
              <Card className="max-w-[90%] p-3 bg-primary text-primary-foreground rounded-br-none">
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              </Card>
            </div>
          ))}
        </div>
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
