
import { History, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatSidebarProps {
  inputValue: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: (e?: React.FormEvent) => void;
  onClearChat: () => void;
}

export const ChatSidebar = ({
  inputValue,
  isLoading,
  onInputChange,
  onSendMessage,
  onClearChat,
}: ChatSidebarProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendMessage(e);
  };

  return (
    <aside className="w-full md:w-96 h-full bg-muted/50 border-r flex flex-col p-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" className="w-full mb-4">
              <History className="h-4 w-4 mr-2" />
              Expandir Histórico
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Histórico de conversas (Em breve)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="flex-grow" />

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
