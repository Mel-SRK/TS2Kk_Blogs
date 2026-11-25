import { getCollection, type CollectionEntry } from 'astro:content';
import { pathTo } from './site';

const covers = {
  desk: { alt: '阳光下摊开的红色布面笔记本，旁边放着一支铅笔', position: 'center 53%', width: 1200, height: 900 },
  observatory: { alt: '星空下的射电望远镜，远处亮起一道粉紫色光束', position: 'center 58%', width: 1440, height: 810 },
  terminal: { alt: '暗紫色灯光下的复古电脑和机械键盘', position: 'center 55%', width: 700, height: 700 },
  notebook: { alt: '摊开的笔记本和一支钢笔', position: 'center 52%', width: 700, height: 700 },
  signal: { alt: '雪山间的通信塔亮着一盏粉色信标灯', position: 'center 46%', width: 700, height: 700 },
};

const dateFormat = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

export async function getPosts() {
  const posts = await getCollection('posts');
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime() || a.id.localeCompare(b.id));
}

const generalTags = new Set(['ctf', 'writeup', 'write-up', 'write-ups', '待写']);

export function getRelatedPosts(post: CollectionEntry<'posts'>, posts: CollectionEntry<'posts'>[]) {
  const tags = new Map(post.data.tags.map((tag) => [tag.normalize('NFKC').toLowerCase(), tag]));

  for (const tag of generalTags) tags.delete(tag);

  return posts
    .filter((entry) => entry.id !== post.id && !entry.data.tags.includes('待写'))
    .map((entry) => {
      const entryTags = new Set(entry.data.tags.map((tag) => tag.normalize('NFKC').toLowerCase()));
      const shared = [...tags].filter(([tag]) => entryTags.has(tag)).map(([, label]) => label);
      const sameCategory = post.data.category === entry.data.category && post.data.category !== 'Write-ups';

      return {
        post: entry,
        topics: shared.length ? shared.slice(0, 2) : [entry.data.category],
        score: shared.length * 2 + Number(sameCategory),
      };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export function getCover(cover: CollectionEntry<'posts'>['data']['cover']) {
  return { src: pathTo(`images/${cover}.webp`), ...covers[cover] };
}

export function formatDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

export function accessibleDate(date: Date) {
  return dateFormat.format(date);
}

export function readingMinutes(body = '') {
  const prose = body.replace(/^[ 	]*```[^\n]*\n[\s\S]*?^[ 	]*```[^\n]*/gm, '');
  const chinese = prose.match(/\p{Script=Han}/gu)?.length ?? 0;
  const words = prose.match(/[a-z\d]+(?:['’-][a-z\d]+)*/gi)?.length ?? 0;
  return Math.max(1, Math.ceil(chinese / 350 + words / 220));
}
