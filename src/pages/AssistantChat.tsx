
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { LanguageSelector } from "@/components/chat/LanguageSelector";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id?: string;
  sender: 'user' | 'assistant';
  text: string;
  created_at?: string;
}

interface AssistantInfo {
  id: string;
  name: string;
  icon?: string;
}

type Language = 'portuguese' | 'english';

const assistantDisplayInfo: { [key: string]: { name: string, icon: string } } = {
  "assistente_de_resultados_esportivos": { name: "Resultados Esportivos Oficiais", icon: "🏆" },
  "digirioh": { name: "DigiRioh", icon: "⚙️" },
  "agente_do_booking": { name: "Agente do Booking", icon: "🏨" },
  "agente_de_airbnb": { name: "Agente de Airbnb", icon: "🏠" },
};

const AssistantChat = () => {
  const { assistantType } = useParams<{ assistantType: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAssistant, setCurrentAssistant] = useState<AssistantInfo | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('portuguese');
  
  // History functionality
  const [isHistoryPanelVisible, setIsHistoryPanelVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  
  // Filter messages for sidebar and main chat area
  const userMessages = useMemo(() => messages.filter(msg => msg.sender === 'user'), [messages]);
  const assistantMessages = useMemo(() => messages.filter(msg => msg.sender === 'assistant'), [messages]);

  // Get webhook URL based on selected language
  const getWebhookUrl = useCallback((language: Language) => {
    const baseUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
    return language === 'portuguese' 
      ? `${baseUrl}/webhook/Portugues`
      : `${baseUrl}/webhook/English`;
  }, []);

  // Get full initial message for page load
  const getInitialMessage = useCallback((language: Language) => {
    if (language === 'portuguese') {
      return `Olá! 👋 Sou o Agente de Resultados Esportivos Oficiais. Minha missão é fornecer verificações precisas e relatórios eficientes para suas apostas esportivas contestadas.

Para que eu possa te ajudar, por favor, forneça os seguintes detalhes da aposta:

*   ⚽ **Jogo:** Time A vs Time B
*   📅 **Data da Partida:** Formato YYYY-MM-DD
*   📊 **Mercado da Aposta:** (ex: Resultado Final, Jogador X Cometer 2+ Faltas, Time A Mais Escanteios HT & FT)
*   ✅ **Sua Seleção:** (ex: Time A Vence, Sim, Jogador Y)
*   *(Opcional, mas útil:)*
    *   *Tipo da Aposta:* **BACK** (a favor) ou **LAY** (contra)?
    *   *Resultado Original da Liquidação:* Ganha (W) ou Perdida (L)?

---

Com essas informações, consultarei nossas fontes de dados oficiais (API's). Para apostas complexas que envolvam um segundo jogador ou a aplicação da regra de "Substituição Segura", posso realizar buscas adicionais para obter as estatísticas específicas desses jogadores.

**Posso verificar uma ampla gama de resultados, incluindo:**

🎯 **Resultados da Partida e de Tempos:**
    *   Placar Final, Placar ao Intervalo (HT), Placar do Segundo Tempo (ST)
    *   Resultado Final (1X2), Dupla Chance, Empate Anula Aposta
    *   Resultado Correto (Final e HT)
    *   Intervalo / Final do Jogo (HT/FT)
    *   Equipe Sem Sofrer Gols (Clean Sheet)
    *   Margem de Vitória
    *   Time para Marcar em Ambos os Tempos
    *   Intervalo com Mais Gols

⚽ **Gols:**
    *   Total de Gols (Mais/Menos - partida completa, HT, ST)
    *   Ambas as Equipes Marcam (BTTS - partida completa, HT, ST)
    *   Gols por Equipe (Mais/Menos - partida completa, HT, ST)
    *   Primeira/Última Equipe a Marcar
    *   Total Exato de Gols na Partida

🥅 **Estatísticas e Eventos de Jogador (quando os dados estiverem disponíveis na fonte oficial):**
    *   **Marcador de Gol:** Qualquer Momento, Primeiro Marcador, Último Marcador, Jogador Marca 2+ Gols (Doblete), Jogador Marca 3+ Gols (Hat-trick).
    *   **Cartões para Jogador:** Jogador Recebe Cartão Amarelo, Jogador Recebe Cartão Vermelho.
    *   **Chutes do Jogador:** Chutes no Alvo (SOT), Total de Chutes.
    *   **Faltas do Jogador:** Faltas Cometidas, Faltas Sofridas.
    *   **Desarmes do Jogador:** Total de Desarmes.
    *   Outras estatísticas individuais como Passes, Passes Chave, Duelos Ganhos, etc.

🟨🟥 **Cartões (Geral da Partida):**
    *   Total de Cartões (Amarelos, Vermelhos, por Pontos - Y=10, R=25, Máx. 35/jogador)
    *   Equipe com Mais Cartões
    *   Cartão Vermelho na Partida (Sim/Não)
    *   Cartões por Tempo (HT/ST - *dependendo da fonte*)

📊 **Estatísticas da Equipe:**
    *   Escanteios (Total, Por Equipe, Por Tempo, Handicap, Mais/Menos)
    *   Chutes (Total, No Alvo - Por Equipe, Por Tempo)
    *   Posse de Bola
    *   Faltas Cometidas pela Equipe
    *   Desarmes da Equipe
    *   Impedimentos
    *   Mercados de "Time com Mais [Estatística X] em Cada Tempo".

⏱️ **Regras Especiais de Apostas:**
    *   **"2 UP" (Dois Gols de Vantagem):** Verificamos se o time selecionado abriu 2 gols de vantagem em mercados aplicáveis.
    *   **"Substituição Segura":** Para mercados de jogador qualificados (Marcador, Assistência, Cartão, Chutes, Faltas) nas seguintes competições: **Brasileirão Série A, Brasileirão Betano, Copa do Mundo de Clubes FIFA, Champions League, Europa League, Premier League, Copa da Inglaterra.**
        *   *Importante:* Esta regra **não se aplica** se o mercado for do tipo "Boost" (OddsBoost, Super Boost, etc.).

---

🔍 **Observações Importantes:**

*   A disponibilidade e granularidade das **estatísticas individuais de jogador** (chutes, faltas, desarmes, etc.) dependem inteiramente da cobertura da fonte oficial para cada partida e liga específica. Se um dado não estiver explicitamente disponível, farei o possível para **inferir logicamente** quando aplicável (ex: um gol marcado por um jogador confirma que ele teve "1+ Chute no Alvo"). Caso contrário, informarei claramente a limitação na verificação.
*   Para **apostas combinadas** envolvendo múltiplos jogadores ou múltiplas estatísticas, todas as partes da aposta precisam ser confirmáveis para que a aposta seja considerada "Ganha".

⚠️ **Atenção:**

*   **Por favor, **Nunca forneça dados confidenciais** como IDs únicos de apostas, senhas e informações pessoais!

Aguardo os detalhes da sua aposta para iniciar a verificação! 😊`;
    } else {
      return `Hello! 👋 I'm the Official Sports Results Agent. My mission is to provide accurate verifications and efficient reports for your disputed sports bets.

To help you, please provide the following bet details:

*   ⚽ **Match:** Team A vs Team B
*   📅 **Match Date:** YYYY-MM-DD format
*   📊 **Bet Market:** (e.g., Match Result, Player X Commits 2+ Fouls, Team A Most Corners HT & FT)
*   ✅ **Your Selection:** (e.g., Team A Wins, Yes, Player Y)
*   *(Optional, but helpful:)*
    *   *Bet Type:* **BACK** (for) or **LAY** (against)?
    *   *Original Settlement Result:* Won (W) or Lost (L)?

---

With this information, I'll consult our official data sources (APIs). For complex bets involving a second player or application of the "Safe Substitution" rule, I can perform additional searches to obtain specific statistics for these players.

**I can verify a wide range of results, including:**

🎯 **Match and Half Results:**
    *   Final Score, Half Time Score (HT), Second Half Score (ST)
    *   Final Result (1X2), Double Chance, Draw No Bet
    *   Correct Score (Final and HT)
    *   Half Time / Full Time (HT/FT)
    *   Clean Sheet
    *   Winning Margin
    *   Team to Score in Both Halves
    *   Half with Most Goals

⚽ **Goals:**
    *   Total Goals (Over/Under - full match, HT, ST)
    *   Both Teams to Score (BTTS - full match, HT, ST)
    *   Goals per Team (Over/Under - full match, HT, ST)
    *   First/Last Team to Score
    *   Exact Total Goals in Match

🥅 **Player Statistics and Events (when data is available from official sources):**
    *   **Goal Scorer:** Anytime, First Scorer, Last Scorer, Player Scores 2+ Goals (Brace), Player Scores 3+ Goals (Hat-trick).
    *   **Player Cards:** Player Receives Yellow Card, Player Receives Red Card.
    *   **Player Shots:** Shots on Target (SOT), Total Shots.
    *   **Player Fouls:** Fouls Committed, Fouls Suffered.
    *   **Player Tackles:** Total Tackles.
    *   Other individual statistics like Passes, Key Passes, Duels Won, etc.

🟨🟥 **Cards (General Match):**
    *   Total Cards (Yellow, Red, by Points - Y=10, R=25, Max. 35/player)
    *   Team with Most Cards
    *   Red Card in Match (Yes/No)
    *   Cards per Half (HT/ST - *depending on source*)

📊 **Team Statistics:**
    *   Corners (Total, Per Team, Per Half, Handicap, Over/Under)
    *   Shots (Total, On Target - Per Team, Per Half)
    *   Ball Possession
    *   Fouls Committed by Team
    *   Team Tackles
    *   Offsides
    *   "Team with Most [Statistic X] in Each Half" markets.

⏱️ **Special Betting Rules:**
    *   **"2 UP" (Two Goals Advantage):** We verify if the selected team opened a 2-goal advantage in applicable markets.
    *   **"Safe Substitution":** For qualified player markets (Scorer, Assist, Card, Shots, Fouls) in the following competitions: **Brazilian Serie A, Brasileirao Betano, FIFA Club World Cup, Champions League, Europa League, Premier League, FA Cup.**
        *   *Important:* This rule **does not apply** if the market is "Boost" type (OddsBoost, Super Boost, etc.).

---

🔍 **Important Notes:**

*   The availability and granularity of **individual player statistics** (shots, fouls, tackles, etc.) depend entirely on the official source coverage for each specific match and league. If data is not explicitly available, I'll do my best to **logically infer** when applicable (e.g., a goal scored by a player confirms they had "1+ Shot on Target"). Otherwise, I'll clearly inform about the verification limitation.
*   For **combination bets** involving multiple players or multiple statistics, all parts of the bet need to be confirmable for the bet to be considered "Won".

⚠️ **Warning:**

*   **Please, Never provide confidential data** such as unique bet IDs, passwords, and personal information!

I'm waiting for your bet details to start verification! 😊`;
    }
  }, []);
  
  // Get short message for chat clearing
  const getShortMessage = useCallback((language: Language) => {
    if (language === 'portuguese') {
      return `Olá! 👋 Sou o Agente de Resultados Esportivos Oficiais. Para verificar sua aposta, por favor, informe: ⚽ Jogo (Time A vs Time B), 📅 Data (YYYY-MM-DD), 📊 Mercado (ex: Placar Final) e ✅ Seleção (ex: Time A vence).`;
    } else {
      return `Hello! 👋 I'm the Official Sports Results Agent. To verify your bet, please provide: ⚽ Match (Team A vs Team B), 📅 Date (YYYY-MM-DD), 📊 Market (e.g., Final Score) and ✅ Selection (e.g., Team A wins).`;
    }
  }, []);
  
  // Fetch chat history from Supabase
  const fetchChatHistory = useCallback(async () => {
    if (!user?.id || !currentAssistant) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('chat_resultados_esportivos_oficiais_history')
        .select('id, message_content, sender, created_at')
        .eq('user_id', user.id)
        .eq('assistant_type', currentAssistant.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching chat history:", error);
        toast({
          title: "Erro ao carregar histórico",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      // Transform data to match Message interface
      const formattedHistory: Message[] = data.map(item => ({
        id: item.id,
        sender: item.sender as 'user' | 'assistant',
        text: item.message_content,
        created_at: item.created_at
      }));
      
      setChatHistory(formattedHistory);
    } catch (err: any) {
      console.error("Error in fetchChatHistory:", err);
      toast({
        title: "Erro ao carregar histórico",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, currentAssistant, toast]);
  
  // Toggle history panel visibility
  const handleToggleHistoryPanel = useCallback(() => {
    const newVisibility = !isHistoryPanelVisible;
    setIsHistoryPanelVisible(newVisibility);
    
    // Fetch history when opening the panel if it's empty
    if (newVisibility && chatHistory.length === 0) {
      fetchChatHistory();
    }
  }, [isHistoryPanelVisible, chatHistory.length, fetchChatHistory]);
  
  // Toggle history item selection
  const handleToggleHistorySelection = useCallback((id: string, isChecked: boolean) => {
    setSelectedHistoryIds(prev => {
      if (isChecked) {
        return [...prev, id];
      } else {
        return prev.filter(item => item !== id);
      }
    });
  }, []);
  
  // Delete selected history items
  const handleDeleteSelectedHistory = useCallback(async () => {
    if (!selectedHistoryIds.length || !user?.id) return;
    
    const confirmDelete = window.confirm(
      `Você tem certeza que deseja excluir ${selectedHistoryIds.length} ${
        selectedHistoryIds.length === 1 ? "item" : "itens"
      } do histórico?`
    );
    
    if (!confirmDelete) return;
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('chat_resultados_esportivos_oficiais_history')
        .delete()
        .in('id', selectedHistoryIds);
      
      if (error) {
        console.error("Error deleting history items:", error);
        toast({
          title: "Erro ao excluir histórico",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Histórico excluído",
        description: `${selectedHistoryIds.length} ${
          selectedHistoryIds.length === 1 ? "item" : "itens"
        } excluídos com sucesso.`
      });
      
      // Clear selection and refresh history
      setSelectedHistoryIds([]);
      fetchChatHistory();
    } catch (err: any) {
      console.error("Error in handleDeleteSelectedHistory:", err);
      toast({
        title: "Erro ao excluir histórico",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedHistoryIds, user, fetchChatHistory, toast]);
  
  // Handle language change
  const handleLanguageChange = useCallback((language: Language) => {
    setSelectedLanguage(language);
    // Reset messages with new language
    if (currentAssistant) {
      setMessages([{
        sender: 'assistant',
        text: getInitialMessage(language)
      }]);
    }
  }, [currentAssistant, getInitialMessage]);
  
  useEffect(() => {
    if (assistantType) {
      const displayInfo = assistantDisplayInfo[assistantType] || { name: assistantType, icon: '🤖' };
      setCurrentAssistant({
        id: assistantType,
        name: displayInfo.name,
        icon: displayInfo.icon,
      });
      setMessages([{
        sender: 'assistant',
        text: getInitialMessage(selectedLanguage)
      }]);
      setError(null);
      setIsLoading(false);
    } else {
      navigate('/dashboard');
    }
  }, [assistantType, navigate, getInitialMessage, selectedLanguage]);
  
  // Função para verificar se a resposta contém dados estruturados (JSON)
  const isStructuredResponse = (text: string): boolean => {
    // Primeiro, verifica se o texto parece ser JSON
    const trimmedText = text.trim();
    const couldBeJSON = (trimmedText.startsWith('[') && trimmedText.endsWith(']')) || 
                       (trimmedText.startsWith('{') && trimmedText.endsWith('}'));
    
    if (!couldBeJSON) {
      return false;
    }

    try {
      const parsed = JSON.parse(text);
      
      // Verificar se é uma mensagem estruturada com três blocos
      const isThreeBlockResponse = Array.isArray(parsed) && parsed.length > 0 && 
             (parsed[0].relatorioInterno || 
              parsed[0].informacaoAgente || 
              parsed[0].respostaCliente);
      
      // Verificar se é uma mensagem intermediária
      const isIntermediate = Array.isArray(parsed) && parsed.length > 0 && 
             parsed[0].isIntermediateMessage;
      
      return isThreeBlockResponse || isIntermediate;
    } catch (e) {
      // Se não for JSON válido, não é uma resposta estruturada
      return false;
    }
  };
  
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading || !currentAssistant || !user?.id) return;
    
    const userMessage: Message = { sender: 'user', text: inputValue.trim() };
    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    setError(null);
    
    try {
      const startTime = new Date();
      
      await supabase.from('chat_resultados_esportivos_oficiais_history').insert({
        user_id: user.id,
        assistant_type: currentAssistant.id,
        message_content: userMessage.text,
        sender: userMessage.sender,
        status: 'sent',
      });
      
      // Use the language-specific webhook
      const webhookUrl = getWebhookUrl(selectedLanguage);
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          userId: user.id,
          sessionId: user.id,
          language: selectedLanguage
        }),
      });
      
      const endTime = new Date();
      const responseTime = endTime.getTime() - startTime.getTime();
      
      if (response.ok) {
        // Verificar se a resposta tem conteúdo antes de tentar fazer parse
        const responseText = await response.text();
        console.log("Raw API response:", responseText);
        
        if (!responseText || responseText.trim() === '') {
          throw new Error('Resposta vazia do servidor');
        }
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Erro ao fazer parse da resposta JSON:", parseError);
          throw new Error('Resposta do servidor não é um JSON válido');
        }
        
        // Verificar e processar a resposta que pode ser estruturada (JSON) ou texto simples
        const rawResponse = data.cleaned_text || data.output || data.reply || "Desculpe, não consegui processar sua solicitação.";
        
        // Criar a mensagem do assistente
        const assistantMessage: Message = { sender: 'assistant', text: rawResponse };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Salvar no histórico, verificando se contém um relatório (seja formato texto ou JSON)
        const shouldSaveToHistory = isStructuredResponse(rawResponse) || 
                                   rawResponse.includes("Relatório Interno de Verificação");
        
        if (shouldSaveToHistory) {
          await supabase.from('chat_resultados_esportivos_oficiais_history').insert({
            user_id: user.id,
            assistant_type: currentAssistant.id,
            message_content: assistantMessage.text,
            sender: assistantMessage.sender,
            status: 'processed',
            response_time: `${responseTime} milliseconds`,
          });
          
          // Refresh history if panel is visible
          if (isHistoryPanelVisible) {
            fetchChatHistory();
          }
        }
      } else {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message || 'Erro ao processar a mensagem');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClearChat = () => {
    if (currentAssistant) {
      setMessages([{
        sender: 'assistant',
        text: getShortMessage(selectedLanguage)
      }]);
    }
    setInputValue("");
    setError(null);
  };
  
  const handleClearHistory = async () => {
    if (!user || !currentAssistant) return;
    
    if (window.confirm("Tem certeza que deseja apagar todo o histórico de conversas salvo?")) {
      try {
        setIsLoading(true);
        
        await supabase
          .from('chat_resultados_esportivos_oficiais_history')
          .delete()
          .eq('user_id', user.id)
          .eq('assistant_type', currentAssistant.id);
        
        toast({
          title: "Histórico apagado",
          description: "Todo o histórico de conversas foi apagado com sucesso."
        });
        
        // Reset history state
        setChatHistory([]);
        setSelectedHistoryIds([]);
      } catch (error) {
        console.error("Erro ao apagar histórico:", error);
        toast({
          title: "Erro ao apagar histórico",
          description: "Não foi possível apagar o histórico. Tente novamente.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <ChatHeader 
        icon={currentAssistant?.icon} 
        name={currentAssistant?.name}
        gifUrl="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExODIxcDQ4azljM2lxMHlmdGQ5NHR0bWhrNXlycWwzcDF0MThudWRoNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/elatsjsGzdLtNov4Ky/giphy.gif"
      />
      
      {/* Language Selector */}
      <div className="px-4 py-2 border-b bg-background">
        <LanguageSelector 
          selectedLanguage={selectedLanguage}
          onLanguageChange={handleLanguageChange}
        />
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          inputValue={inputValue}
          isLoading={isLoading}
          userMessages={userMessages}
          onInputChange={setInputValue}
          onSendMessage={handleSendMessage}
          onClearChat={handleClearChat}
          onClearHistory={handleClearHistory}
          isHistoryPanelVisible={isHistoryPanelVisible}
          onToggleHistoryPanel={handleToggleHistoryPanel}
          chatHistory={chatHistory}
          selectedHistoryIds={selectedHistoryIds}
          onToggleHistorySelection={handleToggleHistorySelection}
          onDeleteSelectedHistory={handleDeleteSelectedHistory}
        />
        
        <main className="flex-1 bg-background overflow-hidden flex flex-col">
          <ChatMessages 
            messages={assistantMessages}
            isLoading={isLoading}
            error={error}
          />
        </main>
      </div>
    </div>
  );
};

export default AssistantChat;
