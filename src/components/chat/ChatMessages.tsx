import React, { useRef, useEffect } from "react";
import { Card } from "@/components/ui/card"; // Assumindo que Card vem de shadcn/ui ou similar
import { Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils"; // Utilitário para classnames

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

  // Auto-scroll para o final quando mensagens mudam ou estado de loading muda
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  return (
    <div
      className="flex-1 overflow-y-auto p-4" // Permite scroll vertical na área de mensagens
      role="log"
      aria-label="Mensagens do assistente"
    >
      <div className="space-y-4 max-w-4xl mx-auto"> {/* Controla espaçamento entre mensagens */}
        <AnimatePresence>
          {messages.map((msg, index) => (
            // Renderiza cada mensagem do assistente
            msg.sender === 'assistant' && (
              <motion.div
                key={msg.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex justify-start" // Alinha à esquerda para o assistente
              >
                {/* Card que contém a bolha da mensagem */}
                <Card className="max-w-[85%] p-3 bg-muted text-muted-foreground rounded-lg rounded-bl-none shadow-sm"> {/* Estilo da bolha */}
                  <div className="flex items-start gap-2 mb-1"> {/* Header da mensagem (ícone + nome) */}
                    <Bot className="h-4 w-4 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
                    <span className="text-xs font-medium text-primary">Assistente</span>
                  </div>
                  {/* Container do conteúdo Markdown */}
                  <div className={cn(
                    "text-sm", // Tamanho base da fonte
                    "prose prose-sm max-w-none", // Aplica estilos de tipografia base (tailwindcss/typography)
                    "break-words", // <-- ADICIONADO: Garante a quebra de palavras longas para evitar overflow
                    "[&_p]:mb-2", // <-- AJUSTADO/ADICIONADO: Adiciona um pequeno espaço após parágrafos (gerados pelo Markdown)
                    "[&_ul]:space-y-1 [&_ul]:my-2", // <-- AJUSTADO: Espaçamento vertical para listas
                    "[&_li]:mb-1", // Mantido ou ajustado para espaçamento de itens de lista
                    // Outros overrides de prose podem ser adicionados aqui se necessário
                  )}>
                    {/* Renderiza o texto da mensagem como Markdown */}
                    <ReactMarkdown
                      // Opcional: Componentes customizados se precisar de mais controle
                      // components={{ ... }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </Card>
              </motion.div>
            )
            // Você pode adicionar um bloco 'else' aqui para renderizar mensagens do 'user' com estilo diferente (alinhado à direita, cor diferente)
          ))}
        </AnimatePresence>

        {/* Indicador de Loading */}
        {isLoading && (
           <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <Card className="max-w-[85%] p-3 bg-muted rounded-lg rounded-bl-none shadow-sm">
              <div className="flex items-center gap-3">
                <img
                  src="/loading-sports.gif" // Certifique-se que este GIF existe no seu diretório public
                  alt="Analisando..."
                  className="h-6 w-auto object-contain rounded-md"
                />
                <span className="text-sm text-muted-foreground">Analisando sua consulta...</span>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Mensagem de Erro */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-start"
          >
            <Card className="max-w-[85%] p-3 bg-destructive/15 border-destructive text-destructive rounded-lg rounded-bl-none shadow-sm">
              <div className="flex items-start gap-2">
                {/* Ícone de erro poderia ser adicionado aqui */}
                <span className="text-sm font-medium">Erro:</span>
                <p className="text-sm break-words">{error}</p> {/* Adicionado break-words aqui também */}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Elemento de referência para auto-scroll */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
