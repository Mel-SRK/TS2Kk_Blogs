import type { APIRoute } from 'astro';
import { getPosts } from '../lib/posts';
import { pathTo, siteDescription, siteName } from '../lib/site';

const entities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

function escapeXml(value: string) {
  return value.replace(/[&<>"']/gu, (character) => entities[character] ?? character);
}

export const GET: APIRoute = async ({ site, url }) => {
  const posts = await getPosts();
  const home = escapeXml(new URL(pathTo(), site ?? url).href);
  const feed = escapeXml(new URL(pathTo('rss.xml'), site ?? url).href);
  const items = posts.map(({ id, data }) => {
    const link = escapeXml(new URL(pathTo(`posts/${encodeURIComponent(id)}/`), site ?? url).href);

    return `    <item>
      <title>${escapeXml(data.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(data.description)}</description>
      <pubDate>${data.pubDate.toUTCString()}</pubDate>
      <category>${escapeXml(data.category)}</category>
    </item>`;
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <description>${escapeXml(siteDescription)}</description>
    <link>${home}</link>
    <language>zh-cn</language>
    <atom:link href="${feed}" rel="self" type="application/rss+xml" />
${items.join('\n')}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
