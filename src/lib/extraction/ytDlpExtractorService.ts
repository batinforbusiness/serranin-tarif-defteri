import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { RecipeExtractionMetadata } from "@/lib/extraction/types";
import { getYtDlpCommand, withoutBrowserCookies } from "@/lib/extraction/ytDlpCommand";

const execFileAsync = promisify(execFile);

type YtDlpInfo = {
  title?: string;
  description?: string;
  thumbnail?: string;
  webpage_url?: string;
  url?: string;
  ext?: string;
  formats?: Array<{
    url?: string;
    ext?: string;
    acodec?: string;
    vcodec?: string;
    filesize?: number;
    filesize_approx?: number;
    height?: number;
    width?: number;
    protocol?: string;
  }>;
  subtitles?: Record<string, Array<{ url?: string; ext?: string }>>;
  automatic_captions?: Record<string, Array<{ url?: string; ext?: string }>>;
};

export async function ytDlpExtractorService(url: string): Promise<RecipeExtractionMetadata | null> {
  const ytDlp = getYtDlpCommand();

  try {
    const stdout = await dumpJson(ytDlp, url);

    const info = JSON.parse(stdout) as YtDlpInfo;
    const transcript = await fetchTranscript(info);
    const videoUrl = chooseVideoUrl(info);

    return {
      url: info.webpage_url || url,
      title: info.title || "",
      caption: info.description || "",
      transcript,
      thumbnail: info.thumbnail || "",
      videoUrl,
      rawText: [info.title, info.description, transcript].filter(Boolean).join("\n\n"),
      extractor: "yt-dlp"
    };
  } catch (error) {
    if (ytDlp.commonArgs.length) {
      try {
        const stdout = await dumpJson(withoutBrowserCookies(ytDlp), url);
        const info = JSON.parse(stdout) as YtDlpInfo;
        const transcript = await fetchTranscript(info);
        const videoUrl = chooseVideoUrl(info);

        return {
          url: info.webpage_url || url,
          title: info.title || "",
          caption: info.description || "",
          transcript,
          thumbnail: info.thumbnail || "",
          videoUrl,
          rawText: [info.title, info.description, transcript].filter(Boolean).join("\n\n"),
          extractor: "yt-dlp"
        };
      } catch (fallbackError) {
        console.warn("yt-dlp extraction skipped", fallbackError instanceof Error ? fallbackError.message : fallbackError);
        return null;
      }
    }

    console.warn("yt-dlp extraction skipped", error instanceof Error ? error.message : error);
    return null;
  }
}

async function dumpJson(ytDlp: ReturnType<typeof getYtDlpCommand>, url: string) {
  const { stdout } = await execFileAsync(
    ytDlp.command,
    [...ytDlp.argsPrefix, ...ytDlp.commonArgs, "--dump-json", "--no-playlist", "--skip-download", url],
    {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
      env: ytDlp.env,
      windowsHide: true
    }
  );

  return stdout;
}

function chooseVideoUrl(info: YtDlpInfo) {
  if (info.url && (info.ext === "mp4" || info.url.includes(".mp4"))) return info.url;

  const formats = info.formats ?? [];
  const directMp4 = formats
    .filter((format) => format.url && format.ext === "mp4" && format.vcodec !== "none")
    .filter((format) => !format.protocol || !format.protocol.includes("m3u8"))
    .sort((a, b) => scoreFormat(b) - scoreFormat(a))[0];

  return directMp4?.url || "";
}

function scoreFormat(format: NonNullable<YtDlpInfo["formats"]>[number]) {
  const size = format.filesize ?? format.filesize_approx ?? 0;
  const height = format.height ?? 0;
  const hasAudio = format.acodec && format.acodec !== "none" ? 1 : 0;
  return hasAudio * 100000000 + height * 100000 + size;
}

async function fetchTranscript(info: YtDlpInfo) {
  const tracks = info.subtitles ?? info.automatic_captions ?? {};
  const preferred = tracks.tr || tracks["tr-TR"] || tracks.en || tracks["en-US"] || Object.values(tracks)[0];
  const track = preferred?.find((item) => item.url && ["vtt", "srv3", "json3", "ttml"].includes(item.ext ?? ""));

  if (!track?.url) return "";

  try {
    const response = await fetch(track.url, { cache: "no-store" });
    if (!response.ok) return "";
    const text = await response.text();
    return cleanSubtitleText(text).slice(0, 12000);
  } catch {
    return "";
  }
}

function cleanSubtitleText(text: string) {
  return text
    .replace(/WEBVTT[\s\S]*?\n\n/i, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}.*/g, " ")
    .replace(/^\d+$/gm, " ")
    .replace(/\{[\s\S]*?\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
