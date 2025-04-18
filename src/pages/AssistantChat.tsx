const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading || !currentAssistant || !N8N_WEBHOOK_BASE_URL || !user || !user.id) {
        console.warn("Pré-requisitos para envio não atendidos:", { inputValue, currentAssistant, N8N_WEBHOOK_BASE_URL, user });
        return;
    }

    const webhookPath = "5c024eb2-5ab2-4be3-92f9-26250da4c65d"; // <-- Confirme se este é o path correto!
    if (!webhookPath) {
        setError("Configuração do webhook ausente para este assistente.");
        console.error("Erro: webhookPath está faltando.");
        return;
    }

    const fullWebhookUrl = `${N8N_WEBHOOK_BASE_URL.replace(/\/$/, '')}/${webhookPath}`;

    const userMessage: Message = { sender: 'user', text: inputValue.trim() };
    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    setError(null);

    let responseText = ''; // Variável para armazenar a resposta como texto

    try {
        console.log(`[LOG] Enviando para URL: ${fullWebhookUrl}`);
        const payload = {
            message: messageToSend,
            userId: user.id,
            sessionId: user.id
        };
        console.log("[LOG] Payload:", JSON.stringify(payload, null, 2)); // Log formatado

        const response = await fetch(fullWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': 'Basic SEU_USUARIO:SUA_SENHA_BASE64', // Descomente se usar Basic Auth
                // 'X-N8N-Api-Key': 'SUA_CHAVE_DE_API', // Descomente se usar API Key
            },
            body: JSON.stringify(payload),
        });

        console.log(`[LOG] Resposta recebida. Status: ${response.status} ${response.statusText}`);
        console.log("[LOG] Content-Type Header:", response.headers.get('Content-Type'));

        // Lê a resposta como TEXTO primeiro para depuração
        responseText = await response.text();
        console.log("[LOG] Raw response text:", responseText); // Log do HTML recebido!

        if (!response.ok) {
            // Joga um erro já incluindo o início do texto recebido
            throw new Error(`Erro na API: Status ${response.status}. Resposta não era OK. Início da resposta: ${responseText.substring(0, 200)}...`);
        }

        // AGORA tenta analisar como JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error("[LOG] Falha ao analisar a resposta como JSON:", parseError);
            // Joga um erro específico informando que não é JSON
            throw new Error(`Resposta recebida não é JSON válido. Início da resposta: ${responseText.substring(0, 200)}...`);
        }

        console.log("[LOG] Dados JSON analisados:", data);

        const assistantReply = data.reply || data.output || data.result || data[0]?.json?.reply || null; // Tenta vários campos comuns

        if (assistantReply !== null) {
            const assistantMessage: Message = { sender: 'assistant', text: assistantReply };
            setMessages(prev => [...prev, assistantMessage]);
        } else {
             console.warn("[LOG] Campo de resposta esperado ('reply', 'output', 'result', etc.) não encontrado no JSON:", data);
            throw new Error("Resposta da API não continha um campo de resposta esperado.");
        }

    } catch (err: any) {
        console.error("[LOG] Erro no bloco catch principal:", err);
        // Usa a mensagem de erro gerada, que pode incluir o início da resposta HTML
        const errorMessageText = `Erro ao conectar com o assistente: ${err.message}`;
        setError(errorMessageText);
        // Exibe a mensagem de erro detalhada também no chat
        setMessages(prev => [...prev, { sender: 'assistant', text: `Desculpe, ocorreu um erro. (${err.message})` }]);
    } finally {
        setIsLoading(false);
        console.log("[LOG] Finalizando handleSendMessage.");
    }
};
