// Auto-búsqueda de picks de cappers en Twitter/X.
// Usa múltiples métodos gratuitos para encontrar tweets.
// Corre como parte del cron — el usuario no busca nada.
import { CAPPERS } from "./cappers";
import { getSupabaseAdmin } from "./supabase";

const PICK_KEYWORDS = /\b(pick|play|lock|bet|wager|lean|take|POTD|free play|hammer|max bet|unit|parlay)\b/i;
const ODDS_PATTERN = /[+-]\d{2,4}|\d+\.\d{2}|o\d+\.?\d*|u\d+\.?\d*/i;
const SPORT_KEYWORDS = /\b(NFL|NBA|MLB|UFC|MMA|Liga MX|Champions|La Liga|NHL|NCAAF|tennis|soccer|football|baseball|basketball|boxing)\b/i;
const SPREAD_PATTERN = /[+-]\d+\.5/;

function looksLikePick(text: string): boolean {
  let score = 0;
  if (PICK_KEYWORDS.test(text)) score += 2;
  if (ODDS_PATTERN.test(text)) score += 2;
  if (SPORT_KEYWORDS.test(text)) score += 1;
  if (SPREAD_PATTERN.test(text)) score += 2;
  if (/vs\.?|@/i.test(text)) score += 1;
  return score >= 3;
}

interface RawTweet {
  id: string;
  text: string;
  url: string;
  date: string;
  authorName: string;
  authorHandle: string;
}

// Method 1: Twitter syndication timeline (HTML parsing)
async function method1_syndication(handle: string): Promise<RawTweet[]> {
  const clean = handle.replace("@", "");
  const r = await fetch(
    `https://syndication.twitter.com/srv/timeline-profile/screen-name/${clean}`,
    { headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" }, cache: "no-store" }
  );
  if (!r.ok) return [];
  const html = await r.text();
  const tweets: RawTweet[] = [];

  // Extract tweet data from the HTML - multiple patterns
  const patterns = [
    // Pattern: data-tweet-id with text content
    /data-tweet-id="(\d+)"[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g,
    // Pattern: status URLs with nearby text
    /href="\/\w+\/status\/(\d+)"[\s\S]{0,500}?<div[^>]*>([\s\S]*?)<\/div>/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const id = match[1];
      const text = match[2].replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
      if (text.length > 10 && !tweets.find((t) => t.id === id)) {
        tweets.push({ id, text, url: `https://x.com/${clean}/status/${id}`, date: new Date().toISOString(), authorName: clean, authorHandle: handle });
      }
    }
  }

  // Fallback: extract all status URLs
  if (tweets.length === 0) {
    const urlMatches = [...html.matchAll(/\/(\w+)\/status\/(\d+)/g)];
    const seen = new Set<string>();
    for (const m of urlMatches) {
      if (seen.has(m[2])) continue;
      seen.add(m[2]);
      tweets.push({ id: m[2], text: "", url: `https://x.com/${clean}/status/${m[2]}`, date: new Date().toISOString(), authorName: clean, authorHandle: handle });
    }
  }

  return tweets.slice(0, 15);
}

// Method 2: Use the RSS bridge / Nitter approach
async function method2_nitter(handle: string): Promise<RawTweet[]> {
  const clean = handle.replace("@", "");
  const instances = [
    `https://nitter.net/${clean}/rss`,
    `https://nitter.privacydev.net/${clean}/rss`,
  ];

  for (const rssUrl of instances) {
    try {
      const r = await fetch(rssUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) continue;
      const xml = await r.text();
      const tweets: RawTweet[] = [];

      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of items.slice(0, 15)) {
        const titleMatch = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || item.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
        const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

        if (!linkMatch) continue;
        const link = linkMatch[1].trim();
        const idMatch = link.match(/status\/(\d+)/);
        if (!idMatch) continue;

        const text = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").trim() : "";
        const date = dateMatch ? new Date(dateMatch[1].trim()).toISOString() : new Date().toISOString();

        tweets.push({
          id: idMatch[1],
          text,
          url: link.replace("nitter.net", "x.com").replace("nitter.privacydev.net", "x.com"),
          date,
          authorName: clean,
          authorHandle: handle,
        });
      }
      if (tweets.length > 0) return tweets;
    } catch {
      continue;
    }
  }
  return [];
}

// Method 3: Google search for recent tweets (last resort)
async function method3_search(handle: string, name: string): Promise<RawTweet[]> {
  const clean = handle.replace("@", "");
  const query = encodeURIComponent(`site:x.com/${clean}/status OR site:twitter.com/${clean}/status`);
  try {
    const r = await fetch(
      `https://www.google.com/search?q=${query}&tbs=qdr:w&num=10`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" }, cache: "no-store", signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) return [];
    const html = await r.text();
    const tweets: RawTweet[] = [];
    const seen = new Set<string>();
    const matches = [...html.matchAll(/https:\/\/(?:x|twitter)\.com\/\w+\/status\/(\d+)/g)];
    for (const m of matches) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      tweets.push({ id: m[1], text: "", url: `https://x.com/${clean}/status/${m[1]}`, date: new Date().toISOString(), authorName: name, authorHandle: handle });
    }
    return tweets.slice(0, 10);
  } catch {
    return [];
  }
}

export async function autoFetchExpertPicks(): Promise<{ found: number; saved: number; methods: Record<string, number>; errors: string[] }> {
  const sb = getSupabaseAdmin();
  let found = 0;
  let saved = 0;
  const methods: Record<string, number> = {};
  const errors: string[] = [];

  for (const capper of CAPPERS.filter((c) => c.platform === "X")) {
    try {
      // Try methods in order of reliability
      let tweets = await method1_syndication(capper.handle);
      let method = "syndication";

      if (tweets.length === 0) {
        tweets = await method2_nitter(capper.handle);
        method = "nitter";
      }

      if (tweets.length === 0) {
        tweets = await method3_search(capper.handle, capper.name);
        method = "search";
      }

      // Filter for picks (if we have text; if no text, keep all — better to show too many than none)
      const pickTweets = tweets.filter((t) => t.text ? looksLikePick(t.text) : true);
      found += pickTweets.length;
      methods[method] = (methods[method] || 0) + pickTweets.length;

      for (const t of pickTweets.slice(0, 3)) {
        // No duplicar
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
          pick: t.text || `Pick de ${capper.name} — ver tweet incrustado`,
          odds: null,
          stake_units: null,
          rationale: null,
          verified: false,
          result: "pending",
        });
        if (error) errors.push(`${capper.handle}: ${error.message}`);
        else saved++;
      }
    } catch (e) {
      errors.push(`${capper.handle}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { found, saved, methods, errors };
}
