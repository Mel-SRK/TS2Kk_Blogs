# TS2Kk Blog

用 Astro 和 Markdown 构建的个人博客。文章保存在仓库中，GitHub Actions 将静态页面发布到 GitHub Pages。

## 本地预览

安装 Node.js 24，然后在仓库根目录运行以下命令。终端会显示预览地址，通常是 `http://localhost:4321/`。

```sh
npm ci
npm run dev
```

用 `npm run check` 检查 Astro 页面与类型。`npm run build` 将站点输出到 `dist/`，`npm run preview` 可以预览这份构建产物。

## 写文章

在 `src/content/posts/` 新建一个 Markdown 文件。建议用小写英文和短横线命名，因为文件名会成为文章网址的一部分。

```markdown
---
title: 我的第一篇文章
description: 用一句话概括文章内容。
pubDate: '2026-11-25'
category: 随笔
tags: [写作, 博客]
cover: notebook
featured: false
---

在这里写正文。可以使用 Markdown 标题、列表、链接和代码块。
```

`cover` 默认为 `desk`，也可选 `observatory`、`terminal`、`notebook` 或 `signal`，用于文章分享预览。若想更换首页索引中置顶的精选文章，将新文章设为 `featured: true`，并取消上一篇的精选标记。`example: true` 的示例文章仍可从归档打开，首页的精选和最近文章会跳过它们。

## 发布到 GitHub Pages

1. 在 GitHub 上创建博客仓库。使用 GitHub Free 时，Pages 适用于公开仓库。确认准备公开的文章、图片和文件后，再将本地改动提交并推送到默认分支 `main` 或 `master`。 [GitHub Pages 适用的仓库](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
2. 打开仓库的 **Settings → Pages**，在 **Build and deployment → Source** 选择 **GitHub Actions**。 [配置发布源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
3. 打开 **Actions → Deploy to GitHub Pages**，选择默认分支并点击 **Run workflow**。发布成功后，工作流和 **Settings → Pages** 都会显示访问地址。之后推送到默认分支会自动更新站点。

普通仓库的默认地址类似 `https://用户名.github.io/TS2Kk_Blogs/`。以 `用户名.github.io` 命名的个人站点仓库则发布到 `https://用户名.github.io/`。工作流会把 GitHub Pages 的实际地址传给 `SITE_URL`，由 Astro 处理域名和项目子路径。若在本地模拟项目子路径，可运行以下命令。

```sh
SITE_URL=https://example.github.io/TS2Kk_Blogs/ npm run build
SITE_URL=https://example.github.io/TS2Kk_Blogs/ npm run preview
```
