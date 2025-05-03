
-- Função para gerenciar os planos de um usuário de forma segura
-- Esta função será chamada pelo admin e vai contornar o RLS

CREATE OR REPLACE FUNCTION public.manage_user_assistant_plans(
  p_user_id UUID,
  p_assistant_types TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com os privilégios do criador da função
SET search_path = public
AS $$
DECLARE
  v_type TEXT;
BEGIN
  -- Primeiro, remover todos os planos de assistentes existentes (exceto 'free')
  DELETE FROM public.user_plans
  WHERE user_id = p_user_id AND plan_name != 'free';

  -- Garantir que existe pelo menos o plano free
  IF NOT EXISTS (SELECT 1 FROM public.user_plans WHERE user_id = p_user_id AND plan_name = 'free') THEN
    INSERT INTO public.user_plans (user_id, plan_name, expires_at)
    VALUES (p_user_id, 'free', NULL);
  END IF;

  -- Adicionar os novos planos
  FOREACH v_type IN ARRAY p_assistant_types
  LOOP
    -- Pular o plano 'free' que já foi garantido acima
    IF v_type != 'free' THEN
      INSERT INTO public.user_plans (user_id, plan_name, expires_at)
      VALUES (p_user_id, v_type, (CURRENT_DATE + INTERVAL '1 year'));
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$;
