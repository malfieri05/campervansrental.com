-- Enable query observability extensions.
-- Maps to Phase 2 Batch C, items C9 in the performance audit.
--
-- pg_stat_statements: tracks execution statistics for all SQL statements.
--   Visible in Supabase Dashboard → Reports → Query Performance, or via:
--   SELECT query, calls, mean_exec_time, stddev_exec_time, total_exec_time
--   FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 20;
--
-- NOTE: Extensions must be enabled by a Supabase superuser. On Supabase.com,
-- navigate to Dashboard → Database → Extensions and enable each one there.
-- The SQL below is provided for documentation / local Supabase CLI usage.

-- Enable pg_stat_statements for production query profiling.
-- Safe: read-only overhead is negligible (~1 % CPU).
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Reset stats after adding the indexes from 00015_performance_indexes.sql
-- so the next hour of traffic gives clean "before/after" data.
-- Run manually after deploying the indexes:
--   SELECT pg_stat_statements_reset();
