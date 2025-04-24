import React, { useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
// 1. Importe o plugin remark-gfm se você o instalou
import remarkGfm from 'remark-gfm';
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
              {/* Aplica overflow-wrap diretamente no Card para que break-words funcione */}
              <Card className="max-w-[85%] p-3 bg-muted text-muted-foreground rounded-bl-none shadow-sm overflow-wrap-break-word">
                <div className="flex items-start gap-2 mb-1">
                  <Bot className="h-4 w-4 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
                  <span className="text-xs font-medium text-primary">Assistente</span>
                </div>
                {/* 2. Aplica a classe 'prose' e remove as classes de espaçamento manual */}
                <div className={cn(
                  "prose prose-sm max-w-none", // Usa prose e prose-sm (ou prose-base se preferir maior)
                  "text-muted-foreground"      // Garante que a cor do texto seja aplicada
                  // Removidas: leading-relaxed, [&_ul]:space-y-2, [&_li]:mb-1, [&_li>p]:leading-relaxed, tracking-tight
                )}>
                  {/* 3. Adiciona o plugin remarkGfm */}
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* --- Seção isLoading --- */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
             {/* Aplica overflow-wrap também */}
            <Card className="max-w-[85%] p-3 bg-muted rounded-bl-none shadow-sm overflow-wrap-break-word">
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

        {/* --- Seção Error --- */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-start"
          >
             {/* Aplica overflow-wrap também */}
            <Card className="max-w-[85%] p-3 bg-destructive/15 border-destructive text-destructive rounded-bl-none shadow-sm overflow-wrap-break-word">
              <div className="flex items-start gap-2">
                {/* Ícone de erro poderia ser adicionado aqui */}
                <span className="text-sm font-medium">Erro:</span>
                <p className="text-sm">{error}</p> {/* Garante que o erro também quebre linha */}
              </div>
            </Card>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
