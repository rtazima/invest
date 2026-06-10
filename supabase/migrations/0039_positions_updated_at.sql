-- Adiciona updated_at às posições para rastrear quando cada preço foi atualizado pela última vez.

ALTER TABLE public.positions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Inicializa com created_at para posições existentes
UPDATE public.positions
  SET updated_at = created_at
  WHERE updated_at IS NULL;

ALTER TABLE public.positions
  ALTER COLUMN updated_at SET DEFAULT now();

-- Trigger para manter updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_positions_updated_at ON public.positions;

CREATE TRIGGER trg_positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
