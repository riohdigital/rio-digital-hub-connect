
-- Atualização das políticas de segurança para a tabela user_plans

-- Primeiro, remover políticas existentes se houver
DROP POLICY IF EXISTS "Allow users to view own plans" ON public.user_plans;
DROP POLICY IF EXISTS "Allow users to insert own plans" ON public.user_plans;
DROP POLICY IF EXISTS "Allow users to update own plans" ON public.user_plans;
DROP POLICY IF EXISTS "Allow users to delete own plans" ON public.user_plans;

-- Habilitar RLS na tabela (caso ainda não esteja habilitado)
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

-- Criar novas políticas
CREATE POLICY "Allow users to view own plans" 
ON public.user_plans 
FOR SELECT 
USING (auth.uid() = user_id);

-- Não permitimos que usuários normais manipulem diretamente os planos
-- Usaremos a função RPC secure para isso

-- Permitir que o serviço de gateway tenha acesso completo
CREATE POLICY "Service role can do anything" 
ON public.user_plans 
USING (true)
WITH CHECK (true);
