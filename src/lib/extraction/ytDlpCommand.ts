import { existsSync } from "node:fs";
import { join } from "node:path";

export function getYtDlpCommand() {
  const cookiesFromBrowser = process.env.YTDLP_COOKIES_FROM_BROWSER;
  const commonArgs = cookiesFromBrowser ? ["--cookies-from-browser", cookiesFromBrowser] : [];
  const bundledBinary = join(process.cwd(), "node_modules", "youtube-dl-exec", "bin", "yt-dlp.exe");
  const configuredBinary = process.env.YTDLP_PATH;
  const binary = configuredBinary || (existsSync(bundledBinary) ? bundledBinary : "");

  if (binary) {
    return {
      command: binary,
      argsPrefix: [] as string[],
      commonArgs,
      env: process.env
    };
  }

  return {
    command: "yt-dlp",
    argsPrefix: [] as string[],
    commonArgs,
    env: process.env
  };
}

export function withoutBrowserCookies(command: ReturnType<typeof getYtDlpCommand>) {
  return {
    ...command,
    commonArgs: []
  };
}
