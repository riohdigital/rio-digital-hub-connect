// Dentro do componente AssistantChat

// ... (importações, estados, useEffects como antes) ...

// **IMPORTANTE**: Coloque a URL de PRODUÇÃO do seu Webhook N8N aqui!
const N8N_WEBHOOK_BASE_URL = "https://agentes-rioh-digital-n8n.sobntt.easypanel.host/webhook/5c024eb2-5ab2-4be3-92f9-26250da4c65d"; // Substitua pelo seu domínio N8N

const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    // Garante que temos tudo necessário: input, assistente, URL base, usuário e ID do usuário
    if (!inputValue.trim() || !currentAssistant || !N8N_WEBHOOK_BASE_URL || !user || !user.id) {
        console.warn("Pré-requisitos para envio não atendidos:", { inputValue, currentAssistant, N8N_WEBHOOK_BASE_URL, user });
        return;
    }

    // Pega o path específico do webhook do assistente atual (do nó Webhook no N8N)
    // Assumindo que o 'webhook_url' no mock data agora contém apenas o PATH (ex: '5c024eb2-5ab2-4be3-92f9-26250da4c65d')
    // OU você pode hardcodar o path aqui se for sempre o mesmo para este componente.
    // VAMOS ASSUMIR que 'webhook_url' no availableAssistants contém o PATH ID do webhook específico
    // Se não, ajuste essa linha ou a estrutura de 'availableAssistants'
    // const webhookPath = currentAssistant.webhook_url; // Descomente e ajuste se necessário
    const webhookPath = "5c024eb2-5ab2-4be3-92f9-26250da4c65d"; // <-- Hardcoded com o path do seu nó Webhook N8N

    if (!webhookPath) {
        setError("Configuração do webhook ausente para este assistente.");
        return;
    }

    const fullWebhookUrl = `${N8N_WEBHOOK_BASE_URL.replace(/\/$/, '')}/${webhookPath}`; // Garante uma única barra

    const userMessage: Message = { sender: 'user', text: inputValue.trim() };
    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputValue.trim(); // Guarda a mensagem antes de limpar
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
        console.log(`Enviando para: ${fullWebhookUrl}`);
        console.log("Payload:", {
            message: messageToSend,
            userId: user.id,
            sessionId: user.id // Usando userId como sessionId para a memória do N8N
        });

        const response = await fetch(fullWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Adicione headers de Autenticação se o seu webhook N8N estiver protegido
                // 'Authorization': 'Basic SEU_USUARIO:SUA_SENHA_BASE64',
                // 'X-N8N-Api-Key': 'SUA_CHAVE_DE_API',
            },
            body: JSON.stringify({
                message: messageToSend, // A mensagem que o usuário digitou
                userId: user.id,        // ID do usuário do Supabase
                sessionId: user.id      // ID para agrupar a memória no N8N (usando userId)
                // Você pode adicionar mais dados se o seu workflow precisar
                // userEmail: user.email,
                // assistantType: currentAssistant.type
            }),
        });

        console.log("Resposta recebida, Status:", response.status);

        if (!response.ok) {
            // Tenta ler o corpo do erro se possível
            let errorBody = `Status: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorBody += ` | Detalhes: ${JSON.stringify(errorData)}`;
            } catch (jsonError) {
                // Ignora se o corpo não for JSON
            }
            throw new Error(`Erro na API: ${errorBody}`);
        }

        // Assume que o N8N retorna um JSON com a chave 'reply' (ou 'output', 'result', etc.)
        const data = await response.json();
        console.log("Dados recebidos:", data);

        // Verifique qual campo contém a resposta do agente (ajuste 'data.reply' se necessário)
        const assistantReply = data.reply || data.output || data.result || data[0]?.json?.reply || "Não foi possível obter uma resposta.";

        if (assistantReply) {
            const assistantMessage: Message = { sender: 'assistant', text: assistantReply };
            setMessages(prev => [...prev, assistantMessage]);
        } else {
            throw new Error("Resposta da API não continha um campo de resposta esperado ('reply', 'output', 'result').");
        }

    } catch (err: any) {
        console.error("Erro ao chamar webhook N8N:", err);
        setError(`Erro ao conectar com o assistente: ${err.message}`);
        setMessages(prev => [...prev, { sender: 'assistant', text: `Desculpe, ocorreu um erro. (${err.message})` }]);
    } finally {
        setIsLoading(false);
    }
};

// ... (Resto do componente AssistantChat.tsx como antes) ...
