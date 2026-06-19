import type { RecipeExtractionMetadata } from "@/lib/extraction/types";

type ApifyItem = Record<string, unknown>;

const APIFY_TIMEOUT_MS = 45000;

export async function apifyExtractorService(url: string): Promise<RecipeExtractionMetadata | null> {
  const token = process.env.APIFY_TOKEN;
  const actorId = getActorId(url);

  if (!token || !actorId) return null;

  for (const input of getInputCandidates(url)) {
    try {
      const items = await runActor({ actorId, token, input });
      const metadata = normalizeApifyItems(url, items);
      if (hasUsefulMetadata(metadata)) return metadata;
    } catch (error) {
      console.warn("Apify extraction skipped", error instanceof Error ? error.message : error);
    }
  }

  return null;
}

function getActorId(url: string) {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes("instagram.com")) return process.env.APIFY_INSTAGRAM_ACTOR || "";
  if (lowerUrl.includes("tiktok.com")) return process.env.APIFY_TIKTOK_ACTOR || "";
  if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
    return process.env.APIFY_YOUTUBE_ACTOR || "";
  }

  return process.env.APIFY_DEFAULT_ACTOR || "";
}

async function runActor(input: {
  actorId: string;
  token: string;
  input: Record<string, unknown>;
}): Promise<ApifyItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APIFY_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://api.apify.com/v2/acts/${encodeActorId(input.actorId)}/run-sync-get-dataset-items?token=${input.token}&clean=true&format=json`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.input),
        signal: controller.signal,
        cache: "no-store"
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Apify ${response.status}: ${detail.slice(0, 300)}`);
    }

    const payload = await response.json();
    if (Array.isArray(payload)) return payload as ApifyItem[];
    if (Array.isArray(payload.items)) return payload.items as ApifyItem[];

    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function encodeActorId(actorId: string) {
  return encodeURIComponent(actorId.trim().replace("/", "~"));
}

function getInputCandidates(url: string): Record<string, unknown>[] {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes("instagram.com")) {
    return [
      {
        directUrls: [url],
        resultsType: "posts",
        resultsLimit: 1,
        addParentData: false
      },
      {
        urls: [url],
        resultsLimit: 1
      }
    ];
  }

  if (lowerUrl.includes("tiktok.com")) {
    return [
      {
        postURLs: [url],
        resultsPerPage: 1
      },
      {
        urls: [url],
        resultsLimit: 1
      },
      {
        startUrls: [{ url }],
        resultsLimit: 1
      }
    ];
  }

  return [
    {
      directUrls: [url],
      resultsType: "posts",
      resultsLimit: 1,
      addParentData: false
    },
    {
      startUrls: [{ url }],
      resultsLimit: 1
    },
    {
      urls: [url],
      resultsLimit: 1
    },
    {
      postURLs: [url],
      resultsPerPage: 1
    },
    {
      url
    }
  ];
}

function normalizeApifyItems(url: string, items: ApifyItem[]): RecipeExtractionMetadata {
  const item = items.find(Boolean) ?? {};
  const title = getFirstString(item, [
    "title",
    "fullName",
    "ownerFullName",
    "authorMeta.name",
    "channelName"
  ]);
  const caption = getFirstString(item, [
    "caption",
    "description",
    "text",
    "alt",
    "videoMeta.description",
    "edge_media_to_caption.edges.0.node.text"
  ]);
  const transcript = getFirstString(item, [
    "transcript",
    "subtitles",
    "subtitle",
    "captions",
    "videoMeta.transcript"
  ]);
  const thumbnail = getFirstString(item, [
    "thumbnailUrl",
    "thumbnail_url",
    "thumbnail",
    "thumbnail_src",
    "thumbnailSrc",
    "displayUrl",
    "display_url",
    "imageUrl",
    "image_url",
    "image",
    "images.0",
    "images.0.url",
    "images.0.src",
    "images.0.uri",
    "coverUrl",
    "cover_url",
    "cover",
    "coverImage",
    "coverImageUrl",
    "videoMeta.cover",
    "videoMeta.coverUrl",
    "videoMeta.dynamicCover",
    "videoMeta.originCover",
    "videoMeta.thumbnailUrl",
    "videoMeta.thumbnail",
    "videoMeta.imageUrl",
    "videoMeta.image"
  ]);
  const videoUrl = getFirstString(item, [
    "videoUrl",
    "video_url",
    "videoUrlNoWaterMark",
    "videoUrlNoWatermark",
    "video_url_no_watermark",
    "videoDownloadUrl",
    "video_download_url",
    "downloadUrl",
    "download_url",
    "video",
    "url",
    "mediaUrl",
    "media_url",
    "videoMeta.videoUrl",
    "videoMeta.downloadAddr",
    "videoMeta.playAddr",
    "videoMeta.url",
    "videoMeta.video",
    "videoMeta.mediaUrl"
  ]);

  return {
    url,
    title,
    caption,
    transcript,
    thumbnail,
    videoUrl: isLikelyPageUrl(videoUrl) ? "" : videoUrl,
    rawText: [title, caption, transcript, JSON.stringify(item)].filter(Boolean).join("\n\n").slice(0, 20000),
    extractor: "apify"
  };
}

function getFirstString(item: ApifyItem, paths: string[]) {
  for (const path of paths) {
    const value = getPath(item, path);
    const stringValue = stringifyValue(value);
    if (stringValue) return stringValue.slice(0, 12000);
  }

  return "";
}

function getPath(item: ApifyItem, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current == null) return undefined;
    if (Array.isArray(current)) return current[Number(key)];
    if (typeof current === "object") return (current as Record<string, unknown>)[key];
    return undefined;
  }, item);
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyValue(item))
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  if (value && typeof value === "object") return JSON.stringify(value).slice(0, 12000);
  return "";
}

function hasUsefulMetadata(metadata: RecipeExtractionMetadata) {
  return Boolean(metadata.caption || metadata.transcript || metadata.videoUrl || metadata.thumbnail);
}

function isLikelyPageUrl(value: string) {
  return /instagram\.com\/(p|reel|reels)\//i.test(value) || /tiktok\.com\/@/i.test(value);
}
