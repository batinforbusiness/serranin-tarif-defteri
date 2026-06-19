# Serra'nin Tarif Defteri

Mobil oncelikli Next.js 15, TypeScript, Tailwind ve Supabase MVP tarif defteri.

## Kurulum

1. `.env.example` dosyasini `.env.local` olarak kopyala.
2. Supabase URL ve anon key degerlerini ekle.
3. Gemini API anahtarini ekle.
4. Supabase SQL editor icinde `supabase/schema.sql` dosyasini calistir.
5. Bagimliliklari kurup gelistirme sunucusunu baslat:

```bash
npm install
npm run dev
```

## Tarif cikarici akisi

Linkten veri alma sirasi:

1. Apify scraper
2. yt-dlp fallback
3. HTML metadata fallback

Apify basarili olursa caption, video URL ve thumbnail daha stabil gelir. Sonra uygulama videoyu indirir, kareler cikarir ve Gemini ile tarif JSON'u uretir.

## Apify ayarlari

Apify token ve actor ID'lerini `.env.local` icine ekle:

```bash
APIFY_TOKEN=
APIFY_INSTAGRAM_ACTOR=
APIFY_TIKTOK_ACTOR=
APIFY_YOUTUBE_ACTOR=
```

Actor ID ornek formati:

```bash
APIFY_INSTAGRAM_ACTOR=apify/instagram-scraper
```

Kullandigin actor farkli input bekliyorsa sorun degil; uygulama en yaygin input sekillerini sirayla dener:

- `directUrls`
- `startUrls`
- `urls`
- `postURLs`
- `url`

## Ortam degiskenleri

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
OPENAI_API_KEY=
APIFY_TOKEN=
APIFY_INSTAGRAM_ACTOR=
APIFY_TIKTOK_ACTOR=
APIFY_YOUTUBE_ACTOR=
YTDLP_PATH=
```

## MVP kapsami

- Supabase magic link auth
- Linkten AI tarif cikarici
- Apify destekli sosyal medya metadata cikarimi
- Video indirip frame analizi
- Tarif kaydetme ve detay goruntuleme
- Tarif malzemelerini alisveris listesine ekleme
- Ayni malzemeleri alisveris listesinde birlestirme
- PWA manifest ve app icon hazirligi
- Supabase RLS policy ornekleri
