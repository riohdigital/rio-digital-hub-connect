import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ShoppingCart, Package, Users, TrendingUp, Zap, Bot, RefreshCw } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { WEBHOOK_URLS } from "@/lib/constants";

export default function SupermarketAssistant() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  
  // NOVO: Estado para armazenar o ID da sessão
  const [sessionId, setSessionId] = useState<string>('');
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // NOVO: Hook para gerenciar o ID da sessão na inicialização
  useEffect(() => {
    let currentSessionId = sessionStorage.getItem('supermarket_session_id');
    if (!currentSessionId) {
      currentSessionId = crypto.randomUUID();
      sessionStorage.setItem('supermarket_session_id', currentSessionId);
    }
    setSessionId(currentSessionId);
  }, []);

  // NOVO: Função para reiniciar a sessão
  const handleRestartSession = () => {
    setConversation([]);
    const newSessionId = crypto.randomUUID();
    sessionStorage.setItem('supermarket_session_id', newSessionId);
    setSessionId(newSessionId);
    toast({
      title: "Sessão Reiniciada",
      description: "Você pode iniciar uma nova conversa.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading || !sessionId) return;

    const userMessage = query.trim();
    setQuery('');
    setIsLoading(true);
    setConversation(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch(WEBHOOK_URLS.SUPERMARKET_AGENT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // ALTERADO: Adiciona o cabeçalho customizado com o ID da sessão
          'X-Session-ID': sessionId,
        },
        body: JSON.stringify({
          message: userMessage,
          context: 'supermarket_assistant'
        }),
      });

      if (!response.ok) {
        throw new Error('Erro na comunicação com o assistente');
      }

      const data = await response.json();
      const assistantMessage = (data && data.output) ? data.output : 'Desculpe, não consegui processar sua solicitação no momento.';
      
      setConversation(prev => [...prev, { 
        role: 'assistant', 
        content: assistantMessage
      }]);

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: "Verificar Estoque", icon: Package, query: "Como verificar o estoque de produtos?" },
    { label: "Atendimento ao Cliente", icon: Users, query: "Preciso de ajuda com atendimento ao cliente" },
    { label: "Relatórios de Vendas", icon: TrendingUp, query: "Como gerar relatórios de vendas?" },
    { label: "Promoções", icon: Zap, query: "Como criar promoções para produtos?" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
      <div className="container py-8 px-4 md:px-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/dashboard')} 
            aria-label="Voltar para Dashboard"
            className="hover:bg-white/20 dark:hover:bg-gray-800/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl">
              🛒
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Atendimento para Super Mercados
              </h1>
              <p className="text-muted-foreground">
                Assistente inteligente para gestão e atendimento de supermercados
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2 space-y-6">
            {/* Conversation Area */}
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-xl">Conversa com o Assistente</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="min-h-[400px] max-h-[400px] overflow-y-auto space-y-4 mb-4">
                  {conversation.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl mb-4">
                        🤖
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Olá! Como posso ajudar?</h3>
                      <p className="text-muted-foreground max-w-md">
                        Sou seu assistente especializado em supermercados. Posso ajudar com gestão de estoque, 
                        atendimento ao cliente, relatórios e muito mais!
                      </p>
                    </div>
                  ) : (
                    conversation.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-4 rounded-2xl ${
                            message.role === 'user'
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                              : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-foreground'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        </div>
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 p-4 rounded-2xl">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-75"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></div>
                          <span className="text-sm text-muted-foreground ml-2">Assistente está pensando...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Form */}
                <form onSubmit={handleSubmit} className="flex gap-2 items-center">
                  <Input
                    placeholder="Digite sua pergunta sobre supermercados..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 bg-white/50 dark:bg-gray-800/50 border-2 border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:focus:border-blue-400"
                    disabled={isLoading}
                  />
                  
                  {/* ALTERADO: Botão de reiniciar sessão reposicionado aqui */}
                  <Button
                    type="button" // Importante para não submeter o formulário
                    variant="ghost"
                    size="icon"
                    onClick={handleRestartSession}
                    disabled={isLoading}
                    aria-label="Reiniciar Sessão"
                    className="hover:bg-white/20 dark:hover:bg-gray-800/50"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </Button>
                  
                  <Button 
                    type="submit" 
                    disabled={isLoading || !query.trim()}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6"
                  >
                    {isLoading ? 'Enviando...' : 'Enviar'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-600" />
                  Ações Rápidas
                </CardTitle>
                <CardDescription>
                  Perguntas frequentes para facilitar seu atendimento
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start gap-3 h-auto p-4 bg-white/50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                      onClick={() => {
                        setQuery(action.query);
                        // Dispara o envio do formulário programaticamente
                        const form = document.querySelector('form');
                        if (form) {
                            // Criamos um evento 'submit' falso e o despachamos no formulário
                            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                            form.dispatchEvent(submitEvent);
                        }
                      }}
                      disabled={isLoading}
                    >
                      <action.icon className="h-5 w-5 text-blue-600" />
                      <span className="text-left">{action.label}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Features Card */}
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-green-600" />
                  Recursos Disponíveis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Gestão de Estoque</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Atendimento ao Cliente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Relatórios e Analytics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>Promoções e Ofertas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>Suporte Operacional</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
