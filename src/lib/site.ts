export const siteName = 'TS2Kk Blog';
export const siteProfile = {
  name: 'TS2Kk',
  avatar: 'images/ts2kk-avatar.webp',
  bio: '二进制漏洞利用 · 逆向工程 · Linux',
  email: 'TS2Kk@outlook.com',
  githubHandle: 'Mel-SRK',
  githubUrl: 'https://github.com/Mel-SRK',
};
export const siteDescription = 'TS2Kk 的技术博客，收录技术文章和 CTF 题解。';

export function pathTo(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\/+/, '')}`;
}
