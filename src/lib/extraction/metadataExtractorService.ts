import type { RecipeExtractionMetadata } from "@/lib/extraction/types";
import { apifyExtractorService } from "@/lib/extraction/apifyExtractorService";
import { ytDlpExtractorService } from "@/lib/extraction/ytDlpExtractorService";

export async function metadataExtractorService(url: string): Promise<RecipeExtractionMetadata> {
  const apifyMetadata = await apifyExtractorService(url);
  if (apifyMetadata) return apifyMetadata;

  const ytDlpMetadata = await ytDlpExtractorService(url);
  if (ytDlpMetadata) return ytDlpMetadata;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 SerraTarifDefteri/1.0",
      Accept: "text/html,application/json,text/plain;q=0.9,*/*;q=0.8"
    },
    redirect: "follow",
    cache: "no-store"
  });

  if (!response.ok) {
    return emptyMetadata(url);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();

  if (contentType.includes("application/json")) {
    return {
      ...emptyMetadata(url),
      rawText: body.slice(0, 20000),
      caption: body.slice(0, 12000),
      extractor: "html"
    };
  }

  const title = decodeHtml(getMeta(body, ["og:title", "twitter:title"]) || getTitle(body));
  const caption = decodeHtml(getMeta(body, ["og:description", "description", "twitter:description"]));
  const thumbnail = getMeta(body, ["og:image", "twitter:image"]);
  const videoUrl = getMeta(body, [
    "og:video:secure_url",
    "og:video:url",
    "og:video",
    "twitter:player:stream"
  ]);
  const transcript = extractTranscript(body);
  const rawText = htmlToText(body);

  return {
    url,
    title,
    caption,
    transcript,
    thumbnail,
    videoUrl,
    rawText,
    extractor: "html"
  };
}

function emptyMetadata(url: string): RecipeExtractionMetadata {
  return {
    url,
    title: "",
    caption: "",
    transcript: "",
    thumbnail: "",
    videoUrl: "",
    rawText: "",
    extractor: "none"
  };
}

function getMeta(html: string, names: string[]) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i")
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1];
    }
  }

  return "";
}

function getTitle(html: string) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
}

function extractTranscript(html: string) {
  const transcriptLike = html.match(/"transcript"\s*:\s*"([^"]+)"/i)?.[1] ?? "";
  return decodeHtml(transcriptLike).slice(0, 12000);
}

function htmlToText(html: string) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  ).slice(0, 20000);
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, " ")
    .replace(/\\u0026/g, "&")
    .trim();
}
