import { metadataExtractorService } from "@/lib/extraction/metadataExtractorService";
import { recipeCaptionExtractorService } from "@/lib/extraction/recipeCaptionExtractorService";
import { recipeConfidenceService } from "@/lib/extraction/recipeConfidenceService";
import { recipeMergeService } from "@/lib/extraction/recipeMergeService";
import { recipeQualityGateService } from "@/lib/extraction/recipeQualityGateService";
import { recipeStepRepairService } from "@/lib/extraction/recipeStepRepairService";
import { recipeVideoExtractorService } from "@/lib/extraction/recipeVideoExtractorService";
import { resolveRecipeImageUrl } from "@/lib/extraction/recipeImageService";
import { videoDownloaderService } from "@/lib/extraction/videoDownloaderService";
import { videoFrameExtractorService } from "@/lib/extraction/videoFrameExtractorService";

export async function extractRecipeEngine(url: string) {
  let metadata: Awaited<ReturnType<typeof metadataExtractorService>> | null = null;
  let captionRecipe: Awaited<ReturnType<typeof recipeCaptionExtractorService>> = null;
  let video: Awaited<ReturnType<typeof videoDownloaderService>> = null;
  let frames: Awaited<ReturnType<typeof videoFrameExtractorService>> = [];
  let videoRecipe: Awaited<ReturnType<typeof recipeVideoExtractorService>> = null;
  let stepRepairUsed = false;
  let finalRecipe: ReturnType<typeof recipeConfidenceService> | null = null;

  try {
    metadata = await metadataExtractorService(url);
    captionRecipe = await recipeCaptionExtractorService(metadata);
    const shouldUseVideo = needsVideoAnalysis(captionRecipe);
    video = shouldUseVideo ? await videoDownloaderService(metadata.videoUrl, metadata.url) : null;
    frames = video ? await videoFrameExtractorService(video) : [];
    videoRecipe = video ? await recipeVideoExtractorService(metadata, video, frames) : null;

    const mergedRecipe = await recipeMergeService({ metadata, captionRecipe, videoRecipe });
    const repairedRecipe = await recipeStepRepairService({
      recipe: mergedRecipe,
      metadata,
      video,
      frames
    });
    stepRepairUsed = repairedRecipe !== mergedRecipe;

    const scoredRecipe = recipeConfidenceService({
      ...repairedRecipe,
      source_summary: {
        caption_used: Boolean(captionRecipe),
        video_used: Boolean(videoRecipe),
        transcript_used: Boolean(metadata.transcript)
      }
    });
    finalRecipe = {
      ...recipeQualityGateService({
        recipe: scoredRecipe,
        metadata,
        videoUsed: Boolean(videoRecipe)
      }),
      image_url: await resolveRecipeImageUrl(metadata.thumbnail, frames)
    };

    return {
      metadata,
      captionRecipe,
      videoRecipe,
      finalRecipe,
      debug: buildDebug({
        metadata,
        video,
        frames,
        captionRecipe,
        videoRecipe,
        stepRepairUsed,
        finalRecipe
      })
    };
  } catch (error) {
    if (metadata) {
      Object.assign(error as object, {
        debug: buildDebug({
          metadata,
          video,
          frames,
          captionRecipe,
          videoRecipe,
          stepRepairUsed,
          finalRecipe
        })
      });
    }
    throw error;
  }
}

function buildDebug(input: {
  metadata: NonNullable<Awaited<ReturnType<typeof metadataExtractorService>>>;
  video: Awaited<ReturnType<typeof videoDownloaderService>>;
  frames: Awaited<ReturnType<typeof videoFrameExtractorService>>;
  captionRecipe: Awaited<ReturnType<typeof recipeCaptionExtractorService>>;
  videoRecipe: Awaited<ReturnType<typeof recipeVideoExtractorService>>;
  stepRepairUsed: boolean;
  finalRecipe: ReturnType<typeof recipeConfidenceService> | null;
}) {
  const { metadata, video, frames, captionRecipe, videoRecipe, stepRepairUsed, finalRecipe } = input;

  return {
    extractor: metadata.extractor,
    title_found: Boolean(metadata.title),
    caption_found: Boolean(metadata.caption),
    caption_length: metadata.caption.length,
    transcript_found: Boolean(metadata.transcript),
    transcript_length: metadata.transcript.length,
    thumbnail_found: Boolean(metadata.thumbnail),
    video_url_found: Boolean(metadata.videoUrl),
    video_downloaded: Boolean(video),
    video_size_mb: video ? Number((video.size / 1024 / 1024).toFixed(2)) : 0,
    frames_extracted: frames.length,
    frame_seconds: frames.map((frame) => frame.second),
    caption_ai_used: Boolean(captionRecipe),
    video_ai_used: Boolean(videoRecipe),
    step_repair_used: stepRepairUsed,
    final_ingredient_count: finalRecipe?.ingredients.length ?? 0,
    final_step_count: finalRecipe?.steps.length ?? 0,
    overall_confidence: finalRecipe?.overall_confidence ?? 0
  };
}

function needsVideoAnalysis(captionRecipe: Awaited<ReturnType<typeof recipeCaptionExtractorService>>) {
  if (!captionRecipe) return true;

  const ingredientsWithAmounts = captionRecipe.ingredients.filter(
    (ingredient) => ingredient.amount || ingredient.unit
  ).length;
  const amountCoverage = captionRecipe.ingredients.length
    ? ingredientsWithAmounts / captionRecipe.ingredients.length
    : 0;
  const confidence = captionRecipe.overall_confidence ?? 0;

  return confidence < 0.78 || amountCoverage < 0.6 || captionRecipe.steps.length < 3;
}
