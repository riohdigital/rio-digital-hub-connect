// src/components/chat/ChatMessages.tsx - INCORPORANDO SUGESTÕES

import React, { useRef, useEffect, useState } from 'react'; // Adiciona useState
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

// Tipos
interface Message { sender: 'user' | 'assistant'; text: string; }

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  loadingGifPath: string; 
  requestStartTime: number | null; // Timestamp de quando a requisição começou
  error: string | null;
}

// Otimização com React.memo
export const ChatMessages = React.memo(({ messages, isLoading, loadingGifPath, requestStartTime, error }: ChatMessagesProps) => {
  const assistantMessagesScrollRef = useRef<HTMLDivElement>(null); 
  const [elapsedTime, setElapsedTime] = useState(0); // Estado para tempo decorrido
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Ref para o intervalo

  // Calcula tempo decorrido enquanto está carregando
  useEffect(() => {
    if (isLoading && requestStartTime) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(Date.now() - requestStartTime);
      }, 1000); // Atualiza a cada segundo
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsedTime(0); // Reseta o tempo quando não está carregando
    }
    // Limpa o intervalo ao desmontar
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLoading, requestStartTime]);


  // Scroll automático
  useEffect(() => { /* ... (lógica do scroll como antes) ... */ }, [messages, isLoading, error]); 

  return (
    <ScrollArea className="flex-1 w-full" ref={assistantMessagesScrollRef}>
      <div className="space-y-3 pr-4 pb-4"> 
        
        {messages.map((msg, index) => (
           // Adiciona classe de animação
          <div key={`assistant-${index}`} className="flex justify-start animate-fadeIn"> 
             <Card className={`max-w-[90%] p-3 shadow-sm ${ msg.text.includes("Erro:") || msg.text.startsWith("Desculpe") ? 'bg-destructive text-destructive-foreground' : 'bg-card rounded-bl-none text-card-foreground' }`}>
               <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
             </Card>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-fadeIn"> {/* Animação no loading também */}
             <Card className="max-w-[90%] p-2 bg-muted rounded-bl-none shadow-sm inline-flex"> 
                 <div className="flex items-center space-x-2">
                     <img src={loadingGifPath} alt="Analisando..." className="h-5 w-5"/> 
                     {/* Texto de loading dinâmico */}
                     <span className="text-sm italic text-muted-foreground">
                        {elapsedTime > 5000 ? "Aguarde mais um pouco..." : "Analisando..."} 
                        ({Math.floor(elapsedTime / 1000)}s) {/* Mostra segundos */}
                     </span>
                 </div>
             </Card>
          </div>
        )}

        {/* Erro global (já tratado nas mensagens, mas pode ser um fallback) */}
        {error && !isLoading && ( 
             <div className="flex justify-start animate-fadeIn"> {/* Animação no erro também */}
               <Card className="max-w-[90%] p-3 shadow-sm bg-destructive text-destructive-foreground">
                   <p className="text-sm font-medium">{error}</p>
               </Card>
           </div>
        )}

      </div>
    </ScrollArea>
  );
});

// Adicione esta definição de animação ao seu arquivo CSS global (ex: src/index.css)
/*
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.3s ease-out forwards;
}
*/
