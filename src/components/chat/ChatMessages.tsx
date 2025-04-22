import { useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
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
            <Card className="max-w-[80%] p-3 bg-muted rounded-bl-none shadow-sm">
              <div className="flex items-center gap-3">
                <img 
                  src="/loading-sports.gif" 
                  alt="Analisando..." 
                  className="h-6 w-auto object-contain rounded-md"
                />
                <span className="text-sm text-muted-foreground">Analisando...</span>
              </div>
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
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
