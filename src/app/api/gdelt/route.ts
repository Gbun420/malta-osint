import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const GDELT_DOC_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';

export async function GET() {
  try {
    const [maltaRes, medRes] = await Promise.allSettled([
      fetch(`${GDELT_DOC_URL}?query=malta&mode=artlist&format=json&maxrecords=10&sort=datedesc`, { signal: AbortSignal.timeout(8000) }),
      fetch(`${GDELT_DOC_URL}?query=Mediterranean+shipping+OR+port+OR+crisis+OR+humanitarian&mode=artlist&format=json&maxrecords=10&sort=datedesc`, { signal: AbortSignal.timeout(8000) }),
    ]);

    const allArticles: any[] = [];
    const seenUrls = new Set<string>();

    for (const result of [maltaRes, medRes]) {
      if (result.status !== 'fulfilled') continue;
      try {
        const text = await result.value.text();
        const data = JSON.parse(text);
        const articles = data?.articles || data?.results || [];
        for (const article of articles) {
          const url = article.url || article.link || '';
          if (!url || seenUrls.has(url)) continue;
          seenUrls.add(url);
          allArticles.push({
            id: `gdelt-${article.seenguid || Buffer.from(url).toString('base64').slice(0, 20)}`,
            title: article.title || '',
            summary: (article.selection || article.summary || '').slice(0, 500),
            url,
            source: article.sourcecountry || article.domain || 'GDELT',
            publishedAt: article.seendate || article.date || new Date().toISOString(),
          });
        }
      } catch { /* skip parse failures */ }
    }

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
    console.error('[GDELT] Error:', error);
    return NextResponse.json({ articles: [], total: 0, error: 'Failed to fetch GDELT data' }, { status: 500 });
  }
}
