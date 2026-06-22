// Auto-búsqueda de picks de cappers en Twitter/X.
// Usa el endpoint de syndication de Twitter (gratis, sin API key).
// Corre como parte del cron — el usuario no busca nada.
import { CAPPERS } from "./cappers";
import { getSupabaseAdmin } from "./supabase";

const PICK_KEYWORDS = /\b(pick|play|lock|bet|wager|lean|take|over|under|spread|parlay|ML|moneyline|POTD|free play)\b/i;
const ODDS_PATTERN = /[+-]\d{3,4}|\d+\.\d{2}/;
const SPORT_KEYWORDS = /\b(NFL|NBA|MLB|UFC|MMA|Liga MX|Champions|Premier|La Liga|NHL|NCAAF|NCAAB|CFB|CBB|tennis|boxing|soccer|football|baseball|basketball|hockey)\b/i;

interface ParsedTweet {
  id: string;
  text: string;
  url: string;
  date: string;
  authorName: string;
  authorHandle: string;
}

function looksLikePick(text: string): boolean {
  const hasKeyword = PICK_KEYWORDS.test(text);
  const hasOdds = ODDS_PATTERN.test(text);
  const hasSport = SPORT_KEYWORDS.test(text);
  // Al menos keyword + (odds O sport), o las tres
  return (hasKeyword && (hasOdds || hasSport)) || (hasOdds && hasSport);
}

async function fetchCapperTweets(handle: string): Promise<ParsedTweet[]> {
  const cleanHandle = handle.replace("@", "");
  const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${cleanHandle}`;
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html" },
      cache: "no-store",
    });
    if (!r.ok) return [];
    const html = await r.text();

    const tweets: ParsedTweet[] = [];
    // El HTML de syndication tiene bloques con data-tweet-id y el texto
    const tweetBlocks = html.match(/<article[^>]*>[\s\S]*?<\/article>/g) || [];
    for (const block of tweetBlocks) {
      const idMatch = block.match(/data-tweet-id="(\d+)"/);
      const textMatch = block.match(/<p[^>]*class="[^"]*tweet-text[^"]*"[^>]*>([\s\S]*?)<\/p>/);
      const timeMatch = block.match(/<time[^>]*datetime="([^"]+)"/);

      if (!idMatch) continue;
      const id = idMatch[1];
      const rawText = textMatch ? textMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
      const date = timeMatch ? timeMatch[1] : new Date().toISOString();

      if (rawText.length < 15) continue;

      tweets.push({
        id,
        text: rawText,
        url: `https://x.com/${cleanHandle}/status/${id}`,
        date,
        authorName: cleanHandle,
        authorHandle: handle,
      });
    }
    return tweets;
  } catch {
    return [];
  }
}

// Fallback: intenta parsear con un regex más flexible si el HTML cambió
async function fetchCapperTweetsFallback(handle: string): Promise<ParsedTweet[]> {
  const cleanHandle = handle.replace("@", "");
  try {
    const r = await fetch(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${cleanHandle}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    if (!r.ok) return [];
    const html = await r.text();
    const tweets: ParsedTweet[] = [];
    // Busca todos los links a tweets
    const urlMatches = html.matchAll(/https:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/g);
    const seen = new Set<string>();
    for (const m of urlMatches) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      tweets.push({
        id: m[1],
        text: "",
        url: m[0],
        date: new Date().toISOString(),
        authorName: cleanHandle,
        authorHandle: handle,
      });
    }
    return tweets.slice(0, 10);
  } catch {
    return [];
  }
}

export async function autoFetchExpertPicks(): Promise<{ found: number; saved: number; errors: string[] }> {
  const sb = getSupabaseAdmin();
  let found = 0;
  let saved = 0;
  const errors: string[] = [];

  for (const capper of CAPPERS.filter((c) => c.platform === "X")) {
    try {
      let tweets = await fetchCapperTweets(capper.handle);
      if (tweets.length === 0) {
        tweets = await fetchCapperTweetsFallback(capper.handle);
      }

      const pickTweets = tweets.filter((t) => t.text ? looksLikePick(t.text) : true);
      found += pickTweets.length;

      for (const t of pickTweets.slice(0, 5)) {
        // No duplicar: checa si ya existe por source_url
        const { data: existing } = await sb
          .from("expert_picks")
          .select("id")
          .eq("source_url", t.url)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const { error } = await sb.from("expert_picks").insert({
          expert_name: capper.name,
          source: `X / ${capper.handle}`,
          source_url: t.url,
          published_at: t.date,
          league: null,
          sport: capper.sport.split("·")[0]?.trim().toLowerCase() || null,
          match: null,
          pick: t.text || `Pick de ${capper.name} — ver tweet`,
          odds: null,
          stake_units: null,
          rationale: null,
          verified: false,
          result: "pending",
        });

        if (error) {
          errors.push(`${capper.handle}: ${error.message}`);
        } else {
          saved++;
        }
      }
    } catch (e) {
      errors.push(`${capper.handle}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { found, saved, errors };
}
