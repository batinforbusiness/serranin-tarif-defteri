export async function fetchReadableText(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "SerraTarifDefteri/1.0",
      Accept: "text/html,application/json,text/plain;q=0.9,*/*;q=0.8"
    },
    redirect: "follow",
    cache: "no-store"
  });

  if (!response.ok) return null;

  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (contentType.includes("application/json")) return text.slice(0, 16000);
  if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return null;

  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16000);
}
