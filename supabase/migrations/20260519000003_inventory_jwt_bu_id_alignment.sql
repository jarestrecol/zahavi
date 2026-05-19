-- SEC-002: Align Catalog/Inventory RLS with the API JWT contract.
--
-- The API emits the active business unit as `bu_id`.
-- Older inventory policies expected `zahavi_business_unit_id`, which can leave
-- RLS out of sync with the authenticated request context.

CREATE OR REPLACE FUNCTION identity.jwt_bu_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public AS
$$
  SELECT (COALESCE(
    NULLIF(current_setting('request.jwt.claim.bu_id', TRUE), ''),
    (NULLIF(current_setting('request.jwt.claims', TRUE), '')::jsonb ->> 'bu_id'),
    NULLIF(current_setting('request.jwt.claim.zahavi_business_unit_id', TRUE), ''),
    (NULLIF(current_setting('request.jwt.claims', TRUE), '')::jsonb ->> 'zahavi_business_unit_id')
  ))::uuid;
$$;

COMMENT ON FUNCTION identity.jwt_bu_id() IS
  'Devuelve el claim bu_id del JWT activo como UUID. '
  'Mantiene fallback al claim legado zahavi_business_unit_id para compatibilidad, '
  'pero el contrato canonico de la API es bu_id.';
