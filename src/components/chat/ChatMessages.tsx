
import { useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export const ChatMessages = ({ messages, isLoading, error }: ChatMessagesProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
      <div className="space-y-4 max-w-4xl mx-auto">
        {messages.map((msg, index) => (
          <div key={index} className="flex justify-start">
            <Card className="max-w-[80%] p-3 bg-muted text-muted-foreground rounded-bl-none shadow-sm">
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
            </Card>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <Card className="max-w-[80%] p-3 bg-muted rounded-bl-none shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Analisando...</span>
              </div>
              <img 
                src="/loading-sports.gif" 
                alt="Analisando..." 
                className="h-24 w-auto object-contain rounded-md"
              />
            </Card>
          </div>
        )}
        
        {error && (
          <div className="flex justify-start">
            <Card className="max-w-[80%] p-3 bg-destructive text-destructive-foreground rounded-bl-none shadow-sm">
              <p className="text-sm">{error}</p>
            </Card>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
