import React, { useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Bot, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface Message {
  id?: string;
  sender: 'user' | 'assistant';
  text: string;
  created_at?: string;
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

  // Função para formatar as mensagens com destaque adequado para apostas
  const formatMarkdown = (text: string) => {
    // Adiciona classes especiais para termos específicos de apostas
    const formattedText = text
      .replace(/\*\*Resultado Final:\*\*/g, '**Resultado Final:** ')
      .replace(/➡️/g, '➡️ ');

    return formattedText;
  };

  return (
    <div 
      className="flex-1 overflow-y-auto p-4" 
      role="log" 
      aria-label="Mensagens do assistente"
    >
      <div className="space-y-4 max-w-4xl mx-auto">
        <AnimatePresence>
          {messages.map((msg, index) => (
            <motion.div
              key={msg.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex justify-start"
            >
              <Card className="max-w-[85%] p-3 bg-muted text-foreground rounded-bl-none shadow-sm break-words">
                <div className="flex items-start gap-2 mb-1">
                  <Bot className="h-4 w-4 text-primary mt-1" aria-hidden="true" />
                  <span className="text-xs font-medium text-primary">Assistente</span>
                </div>
                <div className={cn(
                  "text-sm prose-sm max-w-none",
                  "prose prose-slate",
                  "[&_ul]:space-y-1",
                  "[&_li]:mb-1",
                  "[&_p]:mb-2",
                  "[&_strong]:text-primary [&_strong]:font-medium",
                  "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2",
                  "[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-1"
                )}>
                  <ReactMarkdown>{formatMarkdown(msg.text)}</ReactMarkdown>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <Card className="max-w-[85%] p-3 bg-muted rounded-bl-none shadow-sm">
              <div className="flex items-center gap-3">
                <img 
                  src="/loading-sports.gif" 
                  alt="Analisando..." 
                  className="h-6 w-auto object-contain rounded-md"
                />
                <span className="text-sm text-muted-foreground">Analisando sua consulta...</span>
              </div>
            </Card>
          </motion.div>
        )}
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-start"
          >
            <Card className="max-w-[85%] p-3 bg-destructive/15 border-destructive rounded-bl-none shadow-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-1" />
                <div>
                  <p className="text-sm font-medium text-destructive">Erro na verificação</p>
                  <p className="text-sm text-destructive/90">{error}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
