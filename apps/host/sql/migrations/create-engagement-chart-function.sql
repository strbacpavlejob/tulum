-- Function to get engagement chart data efficiently
-- This provides better performance than the fallback JavaScript implementation
CREATE OR REPLACE FUNCTION get_engagement_chart_data(
  p_venue_ids integer[],
  p_event_id integer DEFAULT NULL
)
RETURNS TABLE (
  date date,
  views bigint,
  bookmarks bigint,
  attended bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - INTERVAL '90 days',
      CURRENT_DATE,
      INTERVAL '1 day'
    )::date AS date
  ),

  views_data AS (
    SELECT
      ee.created_at::date AS date,
      COUNT(*) AS views
    FROM public.event_engagements ee
    JOIN public.events e ON e.id = ee.event_id
    WHERE ee.engagement_type = 'seen'
      AND e.venue_id = ANY(p_venue_ids)
      AND (p_event_id IS NULL OR ee.event_id = p_event_id)
      AND ee.created_at >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY ee.created_at::date
  ),

  bookmarks_data AS (
    SELECT
      ee.created_at::date AS date,
      COUNT(*) AS bookmarks
    FROM public.event_engagements ee
    JOIN public.events e ON e.id = ee.event_id
    WHERE ee.engagement_type = 'saved'
      AND e.venue_id = ANY(p_venue_ids)
      AND (p_event_id IS NULL OR ee.event_id = p_event_id)
      AND ee.created_at >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY ee.created_at::date
  ),

  attended_data AS (
    SELECT
      es.entered_at::date AS date,
      COUNT(DISTINCT es.user_id) AS attended
    FROM public.event_sessions es
    JOIN public.events e ON e.id = es.event_id
    WHERE es.entered_at IS NOT NULL
      AND e.venue_id = ANY(p_venue_ids)
      AND (p_event_id IS NULL OR es.event_id = p_event_id)
      AND es.entered_at >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY es.entered_at::date
  )

  SELECT
    ds.date,
    COALESCE(v.views, 0) AS views,
    COALESCE(b.bookmarks, 0) AS bookmarks,
    COALESCE(a.attended, 0) AS attended
  FROM date_series ds
  LEFT JOIN views_data v ON v.date = ds.date
  LEFT JOIN bookmarks_data b ON b.date = ds.date
  LEFT JOIN attended_data a ON a.date = ds.date
  ORDER BY ds.date;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_engagement_chart_data(integer[], integer) IS 
'Returns engagement metrics (views, bookmarks, attended) aggregated by date for the last 90 days. 
Can be filtered by venue_ids and optionally by a specific event_id.';
