import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import type { DownloadedVideo } from "@/lib/extraction/types";
import { getYtDlpCommand, withoutBrowserCookies } from "@/lib/extraction/ytDlpCommand";

const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const execFileAsync = promisify(execFile);

export async function videoDownloaderService(videoUrl: string, sourceUrl?: string): Promise<DownloadedVideo | null> {
  const directVideo = videoUrl ? await downloadDirectVideo(videoUrl) : null;
  if (directVideo) return directVideo;

  const ytDlpVideo = sourceUrl ? await downloadWithYtDlp(sourceUrl) : null;
  if (ytDlpVideo) return ytDlpVideo;

  return null;
}

async function downloadDirectVideo(videoUrl: string): Promise<DownloadedVideo | null> {
  const response = await fetch(videoUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 SerraTarifDefteri/1.0"
    },
    redirect: "follow",
    cache: "no-store"
  });

  if (!response.ok) return null;

  const mimeType = response.headers.get("content-type")?.split(";")[0] || "video/mp4";
  if (!mimeType.startsWith("video/")) return null;

  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_VIDEO_BYTES) return null;

  const directory = join(tmpdir(), "serra-tarif-defteri");
  await mkdir(directory, { recursive: true });
  const path = join(directory, `recipe-video-${Date.now()}.mp4`);
  await writeFile(path, bytes);

  return {
    path,
    bytes,
    mimeType,
    size: bytes.length
  };
}

async function downloadWithYtDlp(sourceUrl: string): Promise<DownloadedVideo | null> {
  const ytDlp = getYtDlpCommand();
  const firstTry = await runYtDlpDownload(ytDlp, sourceUrl);
  if (firstTry) return firstTry;

  if (ytDlp.commonArgs.length) {
    return runYtDlpDownload(withoutBrowserCookies(ytDlp), sourceUrl);
  }

  return null;
}

async function runYtDlpDownload(
  ytDlp: ReturnType<typeof getYtDlpCommand>,
  sourceUrl: string
): Promise<DownloadedVideo | null> {
  const directory = join(tmpdir(), "serra-tarif-defteri");
  await mkdir(directory, { recursive: true });
  const output = join(directory, `recipe-video-${Date.now()}.%(ext)s`);
  const ffmpegArgs = ffmpegPath ? ["--ffmpeg-location", ffmpegPath] : [];

  try {
    await execFileAsync(
      ytDlp.command,
      [
        ...ytDlp.argsPrefix,
        ...ytDlp.commonArgs,
        ...ffmpegArgs,
        "--no-playlist",
        "--max-filesize",
        "20M",
        "-f",
        "bv*[ext=mp4][height<=720]+ba[ext=m4a]/b[ext=mp4][height<=720]/mp4",
        "--merge-output-format",
        "mp4",
        "-o",
        output,
        sourceUrl
      ],
      {
        timeout: 60000,
        maxBuffer: 2 * 1024 * 1024,
        env: ytDlp.env,
        windowsHide: true
      }
    );

    const path = output.replace("%(ext)s", "mp4");
    const bytes = await import("node:fs/promises").then((fs) => fs.readFile(path));
    if (!bytes.length || bytes.length > MAX_VIDEO_BYTES) return null;

    return {
      path,
      bytes,
      mimeType: "video/mp4",
      size: bytes.length
    };
  } catch (error) {
    console.warn("yt-dlp video download skipped", error instanceof Error ? error.message : error);
    return null;
  }
}
