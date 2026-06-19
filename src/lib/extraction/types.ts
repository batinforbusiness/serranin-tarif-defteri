import type { ExtractedRecipe } from "@/lib/types";

export type RecipeExtractionMetadata = {
  url: string;
  title: string;
  caption: string;
  transcript: string;
  thumbnail: string;
  videoUrl: string;
  rawText: string;
  extractor: "apify" | "yt-dlp" | "html" | "none";
};

export type DownloadedVideo = {
  path: string;
  bytes: Buffer;
  mimeType: string;
  size: number;
};

export type ExtractorRecipe = ExtractedRecipe;

export type ExtractionRun = {
  metadata: RecipeExtractionMetadata;
  captionRecipe: ExtractorRecipe | null;
  videoRecipe: ExtractorRecipe | null;
  finalRecipe: ExtractorRecipe;
  debug: ExtractionDebug;
};

export type ExtractionDebug = {
  extractor: "apify" | "yt-dlp" | "html" | "none";
  title_found: boolean;
  caption_found: boolean;
  caption_length: number;
  transcript_found: boolean;
  transcript_length: number;
  thumbnail_found: boolean;
  video_url_found: boolean;
  video_downloaded: boolean;
  video_size_mb: number;
  frames_extracted: number;
  frame_seconds: number[];
  caption_ai_used: boolean;
  video_ai_used: boolean;
  step_repair_used: boolean;
  final_ingredient_count: number;
  final_step_count: number;
  overall_confidence: number;
};
