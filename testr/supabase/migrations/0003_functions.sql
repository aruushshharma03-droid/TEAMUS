-- Money functions live in src/lib/money.ts for the hackathon runtime (single Node process + SSE).
-- Port these to plpgsql security definer before production Supabase cutover.
-- Non-negotiables:
-- 1. Every balance change writes a ledger row.
-- 2. SELECT ... FOR UPDATE wallets in uuid order.
-- 3. Escrow locks at reward_max.
-- 4. Only TOPUP mints, only REDEEM burns.
-- 5. bigint coins.

create or replace function fn_recompute_tier(p_user uuid) returns void language plpgsql as $$
begin
  update profiles set tier = case
    when trust_score >= 85 then 'expert'::trust_tier
    when trust_score >= 70 then 'trusted'::trust_tier
    when trust_score >= 40 then 'verified'::trust_tier
    else 'open'::trust_tier end
  where id = p_user;
end;
$$;
