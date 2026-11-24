-- ====================================================================
-- SQL Script: Delete Original Uncompressed Files & Free Up Storage
-- ====================================================================
-- Run this query in your Supabase SQL Editor.
-- It deletes the heavy uncompressed MP3 files from Supabase Storage
-- and updates the songs database to use compressed audio URLs.

-- Step 1: Delete original uncompressed files from storage.objects
DELETE FROM storage.objects
WHERE bucket_id = 'audio-files'
  AND name IN (
    SELECT 
      split_part(audio_url, '/audio-files/', 2)
    FROM public.songs
    WHERE compressed_audio_url IS NOT NULL 
      AND compressed_audio_url != ''
      AND audio_url NOT LIKE '%/compressed/%'
  );

-- Step 2: Update the songs table to point audio_url to the compressed audio URL
UPDATE public.songs
SET 
  audio_url = compressed_audio_url,
  compressed_audio_url = NULL
WHERE 
  compressed_audio_url IS NOT NULL 
  AND compressed_audio_url != '';
