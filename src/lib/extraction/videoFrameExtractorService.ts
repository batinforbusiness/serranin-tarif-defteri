import { execFile } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import type { DownloadedVideo } from "@/lib/extraction/types";

const execFileAsync = promisify(execFile);
const SAMPLE_SECONDS = [1, 3, 5, 8, 12, 16, 20];

export type ExtractedFrame = {
  mimeType: "image/jpeg";
  data: string;
  second: number;
};

export async function videoFrameExtractorService(video: DownloadedVideo): Promise<ExtractedFrame[]> {
  if (!ffmpegPath) return [];

  const frames: ExtractedFrame[] = [];

  for (const second of SAMPLE_SECONDS) {
    const output = join(dirname(video.path), `frame-${Date.now()}-${second}.jpg`);

    try {
      await execFileAsync(
        ffmpegPath,
        [
          "-y",
          "-ss",
          String(second),
          "-i",
          video.path,
          "-frames:v",
          "1",
          "-update",
          "1",
          "-vf",
          "scale=640:-2",
          "-q:v",
          "3",
          output
        ],
        {
          timeout: 15000,
          windowsHide: true
        }
      );

      const bytes = await readFile(output);
      if (bytes.length) {
        frames.push({
          mimeType: "image/jpeg",
          data: bytes.toString("base64"),
          second
        });
      }
    } catch {
      // Short videos may not have every requested timestamp. Keep usable frames.
    } finally {
      await unlink(output).catch(() => undefined);
    }
  }

  return frames;
}
