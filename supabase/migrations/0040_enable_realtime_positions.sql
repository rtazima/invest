-- Habilita Supabase Realtime para a tabela positions.
-- O price-daemon (Amaia) atualiza preços a cada 10s; o browser recebe via
-- postgres_changes WebSocket em vez de fazer polling.
ALTER PUBLICATION supabase_realtime ADD TABLE public.positions;
