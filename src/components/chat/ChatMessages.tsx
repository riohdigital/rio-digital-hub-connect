import React, { useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface Message {
  id?: string;
  sender: 'user' | 'assistant';
  text: string;
  created_at?: string;
}

interface StructuredResponse {
  relatorioInterno?: string;
  informacaoAgente?: string;
  respostaCliente?: string;
}

interface IntermediateMessage {
  isIntermediateMessage: boolean;
  originalText: string;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

// Componente personalizado para renderizar blocos de código no ReactMarkdown
const CodeBlock = ({ className, children }: { className?: string, children: React.ReactNode }) => {
  return (
    <div className="my-2 w-full overflow-x-auto">
      <pre className="p-2 bg-gray-800 rounded-md text-white overflow-x-auto whitespace-pre-wrap break-words w-full max-w-full">
        <code className={cn("text-xs break-words whitespace-pre-wrap max-w-full", className)}>
          {children}
        </code>
      </pre>
    </div>
  );
};

// Verifica se o texto é definitivamente JSON válido
const isValidJSON = (text: string): boolean => {
  const trimmedText = text.trim();
  
  // Deve começar e terminar com chaves ou colchetes
  const hasJSONBrackets = (trimmedText.startsWith('[') && trimmedText.endsWith(']')) || 
                         (trimmedText.startsWith('{') && trimmedText.endsWith('}'));
  
  if (!hasJSONBrackets) {
    return false;
  }
  
  // Verificação adicional: deve conter palavras-chave específicas que esperamos
  const hasExpectedKeys = trimmedText.includes('relatorioInterno') || 
                         trimmedText.includes('informacaoAgente') || 
                         trimmedText.includes('respostaCliente') ||
                         trimmedText.includes('isIntermediateMessage');
  
  return hasExpectedKeys;
};

// Tenta analisar texto como JSON APENAS se parecer ser JSON estruturado
const tryParseJSON = (text: string) => {
  // Primeiro, verifica se realmente parece ser JSON estruturado
  if (!isValidJSON(text)) {
    return null;
  }

  try {
    const parsed = JSON.parse(text);
    
    // Verificamos se é uma mensagem intermediária
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].isIntermediateMessage) {
      return { type: 'intermediate', data: parsed[0] };
    }
    
    // Verificamos se é uma resposta estruturada com três blocos
    if (Array.isArray(parsed) && 
        parsed.length > 0 && 
        (parsed[0].relatorioInterno || 
         parsed[0].informacaoAgente || 
         parsed[0].respostaCliente)) {
      return { type: 'structured', data: parsed[0] };
    }
    
    return null;
  } catch (e) {
    // Se chegou até aqui, não deveria acontecer com nossa verificação mais rigorosa
    return null;
  }
};

// Componente para renderizar uma resposta estruturada
const StructuredResponseView = ({ data }: { data: StructuredResponse }) => {
  return (
    <div className="space-y-4">
      {/* Exibe apenas a resposta ao cliente como conteúdo principal */}
      {data.respostaCliente && (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            components={{
              code: ({ node, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = (props as { inline?: boolean }).inline;
                return !isInline ? (
                  <CodeBlock className={match ? match[1] : ''}>
                    {String(children).replace(/\n$/, '')}
                  </CodeBlock>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => <div className="not-prose">{children}</div>,
            }}
          >
            {data.respostaCliente}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

// Componente para renderizar uma mensagem intermediária
const IntermediateMessageView = ({ data }: { data: IntermediateMessage }) => {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        components={{
          code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = (props as { inline?: boolean }).inline;
            return !isInline ? (
              <CodeBlock className={match ? match[1] : ''}>
                {String(children).replace(/\n$/, '')}
              </CodeBlock>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => <div className="not-prose">{children}</div>,
        }}
      >
        {data.originalText}
      </ReactMarkdown>
    </div>
  );
};

export const ChatMessages = ({ messages, isLoading, error }: ChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Pré-processa mensagens para melhorar a formatação de blocos de código aninhados
  const processMessageText = (text: string) => {
    // Busca por blocos de código aninhados dentro de listas markdown
    // Substitui o espaçamento de indentação para assegurar que o código seja renderizado corretamente
    return text.replace(
      /(\s{4,})(```[\s\S]*?```)/g, 
      (match, indent, codeBlock) => {
        // Reduz a indentação dos blocos de código dentro de listas para evitar problemas
        return "\n" + codeBlock + "\n";
      }
    );
  };

  return (
    <div 
      className="flex-1 overflow-y-auto p-4" 
      role="log" 
      aria-label="Mensagens do assistente"
    >
      <div className="space-y-2 max-w-4xl mx-auto">
        <AnimatePresence>
          {messages.map((msg, index) => {
            // Tenta analisar como JSON estruturado
            const parsedResult = tryParseJSON(msg.text);
            
            return (
              <motion.div
                key={msg.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex justify-start"
              >
                <Card className="max-w-[90%] p-3 bg-muted text-muted-foreground rounded-bl-none shadow-sm break-words overflow-hidden">
                  <div className="flex items-start gap-2 mb-1">
                    <Bot className="h-4 w-4 text-primary mt-1" aria-hidden="true" />
                    <span className="text-xs font-medium text-primary">Assistente</span>
                  </div>
                  
                  {parsedResult ? (
                    parsedResult.type === 'structured' ? (
                      // Renderização para resposta estruturada com três blocos
                      <StructuredResponseView data={parsedResult.data as StructuredResponse} />
                    ) : (
                      // Renderização para mensagem intermediária
                      <IntermediateMessageView data={parsedResult.data as IntermediateMessage} />
                    )
                  ) : (
                    // Renderização padrão para texto markdown (incluindo mensagem de boas-vindas)
                    <div className={cn(
                      "text-sm prose prose-sm max-w-none break-words whitespace-pre-wrap",
                      "overflow-hidden leading-tight", 
                      "[&_ul]:space-y-0 [&_ul]:pl-4 [&_ul]:my-1", 
                      "[&_ol]:space-y-0 [&_ol]:pl-4 [&_ol]:my-1", 
                      "[&_li]:my-0 [&_li]:py-0", 
                      "[&_li>p]:m-0 [&_li>p]:inline", 
                      "[&_h1]:mt-2 [&_h1]:mb-1 [&_h1]:text-lg [&_h1]:font-semibold", 
                      "[&_h2]:mt-2 [&_h2]:mb-1 [&_h2]:text-base [&_h2]:font-semibold", 
                      "[&_h3]:mt-1 [&_h3]:mb-0.5 [&_h3]:text-sm [&_h3]:font-semibold", 
                      "[&_hr]:my-2 [&_hr]:border-gray-200", 
                      "[&_p]:break-words [&_p]:mb-1", 
                      "[&_p]:leading-snug", 
                      "[&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-1"
                    )}>
                      <ReactMarkdown
                        components={{
                          code: ({ node, className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || '');
                            // Use proper type assertion for ReactMarkdown props
                            const isInline = (props as { inline?: boolean }).inline;
                            return !isInline ? (
                              <CodeBlock className={match ? match[1] : ''}>
                                {String(children).replace(/\n$/, '')}
                              </CodeBlock>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          },
                          pre: ({ children }) => <div className="not-prose">{children}</div>,
                          ul: ({ children }) => <ul className="list-disc pl-5">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-2">
                              <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                                {children}
                              </table>
                            </div>
                          ),
                          thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
                          tbody: ({ children }) => <tbody className="divide-y divide-gray-200">{children}</tbody>,
                          th: ({ children }) => <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{children}</th>,
                          td: ({ children }) => <td className="px-2 py-2 text-sm break-words">{children}</td>
                        }}
                      >
                        {processMessageText(msg.text)}
                      </ReactMarkdown>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
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
            <Card className="max-w-[85%] p-3 bg-destructive/15 border-destructive text-destructive rounded-bl-none shadow-sm">
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium">Erro:</span>
                <p className="text-sm">{error}</p>
              </div>
            </Card>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
