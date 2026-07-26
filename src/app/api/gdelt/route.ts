import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GDELT_DOC_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';
const MEDITERRANEAN_COUNTRIES = [
  'malta', 'italy', 'libya', 'tunisia', 'egypt', 'algeria', 'morocco',
  'spain', 'france', 'greece', 'turkey', 'israel', 'lebanon', 'syria',
  'cyprus', 'croatia', 'slovenia', 'bosnia', 'montenegro', 'albania',
];

export async function GET() {
  try {
    const queries = [
      { q: 'conflict OR protest OR attack OR crisis', label: 'conflict' },
      { q: 'sanctions OR diplomatic OR treaty OR agreement', label: 'diplomacy' },
      { q: 'maritime OR shipping OR port OR vessel', label: 'maritime' },
      { q: 'election OR government OR parliament', label: 'politics' },
      { q: 'humanitarian OR refugee OR aid OR disaster', label: 'humanitarian' },
      { q: 'malta OR maltese', label: 'malta' },
    ];

    const allArticles: any[] = [];
    const seenUrls = new Set<string>();

    const results: { articles: any[]; label: string }[] = [];

    for (const query of queries) {
      try {
        const params = new URLSearchParams({
          query: query.q,
          mode: 'artlist',
          format: 'json',
          timespan: '72h',
          maxrecords: '8',
          sort: 'datedesc',
        });

        const res = await fetch(`${GDELT_DOC_URL}?${params}`, {
          signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            const articles = data?.articles || data?.results || [];
            if (articles.length > 0) results.push({ articles, label: query.label });
          } catch { /* skip non-JSON responses */ }
        }

        await new Promise(r => setTimeout(r, 6000));
      } catch { /* skip failed queries */ }
    }

    for (const { articles, label } of results) {
      for (const article of articles) {
          const url = article.url || article.link || '';
          if (!url || seenUrls.has(url)) continue;
          seenUrls.add(url);

          const title = article.title || '';
          const text = (title + ' ' + (article.selection || article.summary || '')).toLowerCase();
          const matchedCountries = MEDITERRANEAN_COUNTRIES.filter(c => text.includes(c));
          const isMaltaRelevant = text.includes('malta') || text.includes('maltese');

          allArticles.push({
            id: `gdelt-${article.seenguid || Buffer.from(url).toString('base64').slice(0, 20)}`,
            title,
            summary: (article.selection || article.summary || '').slice(0, 500),
            url,
            source: article.sourcecountry || article.domain || 'GDELT',
            publishedAt: article.seendate || article.date || new Date().toISOString(),
            image: article.image || null,
            category: label,
            matchedCountries,
            isMaltaRelevant,
            maltaRelevance: isMaltaRelevant ? 25 : matchedCountries.length > 0 ? 10 : 0,
          });
      }
    }

    allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return NextResponse.json({
      articles: allArticles,
      total: allArticles.length,
      timestamp: new Date().toISOString(),
      source: 'GDELT DOC 2.0 API',
      scope: 'global',
      coverageLabel: 'Global events and media intelligence from GDELT',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('[GDELT] Fetch error:', error);
    return NextResponse.json({ articles: [], total: 0, error: 'Failed to fetch GDELT data' }, { status: 500 });
  }
}
