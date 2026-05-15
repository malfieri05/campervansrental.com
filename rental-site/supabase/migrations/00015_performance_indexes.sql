-- Performance indexes — additive, safe to apply on a live database.
-- Maps to Phase 2 Batch A, item A10 in the performance audit.

-- 1. Published catalog sort
--    Covers: getPublishedListings → WHERE status = 'published' ORDER BY updated_at DESC
--    Also covers getPublishedListingBySlug's secondary status filter.
CREATE INDEX IF NOT EXISTS listings_published_updated_at_idx
  ON public.listings (status, updated_at DESC);

-- 2. Chat chunk deletion by document
--    Covers: lib/chatbot.ts ingestDocumentChunks → DELETE FROM listing_chat_chunks WHERE document_id = $1
CREATE INDEX IF NOT EXISTS listing_chat_chunks_document_id_idx
  ON public.listing_chat_chunks (document_id);

-- 3. Reviews list sort
--    Covers: getListingReviews → WHERE listing_id = $1 ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS listing_reviews_listing_created_at_idx
  ON public.listing_reviews (listing_id, created_at DESC);

-- 4. Availability timeline per listing
--    Covers: getBlockedRangesForListing → WHERE listing_id = $1 ORDER BY start_date
--    Also covers getBlockedRangesByListingIds with the leading listing_id column.
CREATE INDEX IF NOT EXISTS availability_blocks_listing_start_idx
  ON public.availability_blocks (listing_id, start_date);

-- 5. Reservation overlap check
--    Covers: checkout route → WHERE listing_id = $1 AND status IN (...)
CREATE INDEX IF NOT EXISTS reservations_listing_status_idx
  ON public.reservations (listing_id, status);
