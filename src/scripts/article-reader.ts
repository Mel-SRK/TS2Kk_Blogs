async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const previousFocus = document.activeElement;
    const field = document.createElement('textarea');
    field.value = text;
    field.readOnly = true;
    field.className = 'reading-visually-hidden';
    document.body.append(field);
    field.select();

    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      field.remove();
      if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
    }
  }
}

function restoreArchiveFilters(article: HTMLElement) {
  const back = article.querySelector<HTMLAnchorElement>('[data-article-back]');
  if (!back || !document.referrer) return;

  const previous = new URL(document.referrer);
  const archive = new URL(back.href);
  const withoutTrailingSlash = (path: string) => path.replace(/\/$/u, '');

  if (previous.origin === archive.origin && withoutTrailingSlash(previous.pathname) === withoutTrailingSlash(archive.pathname)) {
    archive.search = previous.search;
    back.href = archive.href;
  }
}

function enhanceCodeBlocks(prose: HTMLElement, announce: (message: string) => void) {
  for (const block of prose.querySelectorAll('pre')) {
    const code = block.querySelector('code');
    if (!code || block.closest('.code-frame')) continue;

    const frame = document.createElement('div');
    frame.className = 'code-frame';
    const header = document.createElement('div');
    header.className = 'code-header';
    const language = document.createElement('span');
    language.className = 'code-language';
    language.textContent = (block.dataset.language || 'text').toUpperCase();
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'code-copy';
    const setCopyLabel = (label: string) => {
      copy.textContent = label;
      copy.setAttribute('aria-label', `${label} · ${language.textContent} 代码`);
    };
    setCopyLabel('COPY');
    header.append(language, copy);
    block.before(frame);
    frame.append(header, block);

    let reset: number;
    copy.addEventListener('click', async () => {
      const copied = await writeClipboard(code.textContent ?? '');
      setCopyLabel(copied ? 'COPIED ✓' : '重试');
      copy.toggleAttribute('data-copied', copied);
      announce(copied ? '代码已复制' : '无法复制，请手动选择代码');
      window.clearTimeout(reset);
      reset = window.setTimeout(() => {
        setCopyLabel('COPY');
        copy.removeAttribute('data-copied');
      }, 1500);
    });
  }
}

function enhanceSectionLinks(prose: HTMLElement, announce: (message: string) => void) {
  for (const heading of prose.querySelectorAll<HTMLElement>('h2[id], h3[id]')) {
    const title = heading.textContent?.trim();
    const link = document.createElement('a');
    link.className = 'section-link';
    link.href = `#${encodeURIComponent(heading.id)}`;
    link.textContent = '#';
    link.setAttribute('aria-label', title ? `复制章节链接：${title}` : '复制章节链接');
    if (title && !heading.hasAttribute('aria-label') && !heading.hasAttribute('aria-labelledby')) {
      heading.setAttribute('aria-label', title);
    }
    heading.append(' ', link);

    let reset: number;
    link.addEventListener('click', async (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

      const copied = await writeClipboard(link.href);
      link.toggleAttribute('data-copied', copied);
      link.textContent = copied ? '✓' : '#';
      announce(copied ? '章节链接已复制' : '无法复制，可从地址栏获取章节链接');
      window.clearTimeout(reset);
      reset = window.setTimeout(() => {
        link.textContent = '#';
        link.removeAttribute('data-copied');
      }, 1500);
    });
  }
}

const calloutLabels = { note: '说明', tip: '提示', warning: '警告', caution: '注意' };

function enhanceCallouts(prose: HTMLElement) {
  for (const quote of prose.querySelectorAll('blockquote')) {
    const first = quote.firstElementChild;
    const text = first?.firstChild;
    if (first?.tagName !== 'P' || !(text instanceof Text)) continue;

    const marker = /^\[!(note|tip|warning|caution)\][+-]?(?:[ \t]+([^\r\n]*))?(?:\r?\n|$)/iu.exec(text.data);
    if (!marker) continue;

    const kind = marker[1].toLowerCase() as keyof typeof calloutLabels;
    quote.dataset.callout = kind;
    text.deleteData(0, marker[0].length);
    if (text.length === 0) {
      if (text.nextSibling instanceof HTMLBRElement) text.nextSibling.remove();
      text.remove();
    }
    if (!first.hasChildNodes()) first.remove();

    const title = document.createElement('p');
    title.className = 'callout-title';
    title.textContent = marker[2]?.trim() || calloutLabels[kind];
    quote.prepend(title);
  }
}

function enhanceLightbox(article: HTMLElement, prose: HTMLElement) {
  const dialog = article.querySelector<HTMLDialogElement>('[data-image-lightbox]');
  const content = dialog?.querySelector<HTMLElement>('[data-lightbox-content]');
  if (!dialog || !content || typeof dialog.showModal !== 'function') return;

  let trigger: HTMLButtonElement | undefined;
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    content.replaceChildren();
    trigger?.focus({ preventScroll: true });
  });

  for (const image of prose.querySelectorAll<HTMLImageElement>('img[src]')) {
    if (image.closest('a, button')) continue;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'article-image-trigger';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-label', image.alt ? `放大图片：${image.alt}` : '放大图片');
    const picture = image.closest('picture') ?? image;
    picture.before(button);
    button.append(picture);
    button.addEventListener('click', () => {
      const expanded = new Image();
      expanded.src = image.currentSrc || image.src;
      expanded.alt = image.alt;
      content.replaceChildren(expanded);
      trigger = button;
      dialog.showModal();
    });
  }
}

function observeReadingPosition(article: HTMLElement, prose: HTMLElement) {
  const progress = article.querySelector<HTMLElement>('[data-reading-progress]');
  const directory = article.querySelector<HTMLElement>('[data-article-contents]');
  const indicator = directory?.querySelector<HTMLElement>('[data-contents-indicator]');
  const toggle = directory?.querySelector<HTMLButtonElement>('[data-contents-toggle]');
  const list = directory?.querySelector<HTMLUListElement>('[data-contents-list]');
  const sections = Array.from(list?.querySelectorAll<HTMLAnchorElement>('a[href^="#"]') ?? []).flatMap((link) => {
    const hash = link.getAttribute('href')?.slice(1);
    const heading = hash ? document.getElementById(hash) : null;
    return heading ? [{ link, heading }] : [];
  });

  let current: HTMLAnchorElement | undefined;
  let frame: number | undefined;
  let ratio = -1;

  function update() {
    frame = undefined;
    const viewport = window.innerHeight;
    const proseBounds = prose.getBoundingClientRect();
    const nextRatio = Math.max(0, Math.min(1, (viewport - proseBounds.top) / Math.max(proseBounds.height, 1)));
    if (progress && nextRatio !== ratio) {
      ratio = nextRatio;
      progress.style.transform = `scaleX(${ratio})`;
    }

    if (!directory || !indicator) return;

    const readingLine = Math.min(136, viewport * .23);
    const scroller = document.scrollingElement;
    const atBottom = scroller && scroller.scrollTop > 0 && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
    let next: HTMLAnchorElement | undefined;

    for (const { link, heading } of sections) {
      if (heading.getBoundingClientRect().top > readingLine) break;
      next = link;
    }

    const target = sections.find(({ heading }) => heading.matches(':target'));
    if (target) {
      const rect = target.heading.getBoundingClientRect();
      const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const margin = parseFloat(getComputedStyle(target.heading).scrollMarginTop) || 0;
      if (Math.abs(rect.top - padding - margin) < 4 || (atBottom && rect.bottom > 0 && rect.top < viewport)) next = target.link;
    }
    if (atBottom && !target) next = sections.at(-1)?.link;

    const changed = current !== next;
    if (changed) {
      current?.removeAttribute('aria-current');
      next?.setAttribute('aria-current', 'location');
      current = next;
    }

    indicator.hidden = !next || Boolean(list?.hidden);
    if (next && !indicator.hidden) {
      const rect = next.getBoundingClientRect();
      const bounds = directory.getBoundingClientRect();
      const top = rect.top - bounds.top + directory.scrollTop;
      indicator.style.setProperty('--indicator-top', `${top + 4}px`);
      indicator.style.setProperty('--indicator-length', String(Math.max(1, rect.height - 8)));
      if (changed && directory.scrollHeight > directory.clientHeight) {
        if (rect.top < bounds.top) directory.scrollTop = top;
        if (rect.bottom > bounds.bottom) directory.scrollTop = top + rect.height - directory.clientHeight;
      }
    }
  }

  function scheduleUpdate() {
    frame ??= requestAnimationFrame(update);
  }

  if (toggle && list) {
    const mobile = matchMedia('(max-width: 49rem)');
    const setOpen = (open: boolean) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? '收起目录' : `展开 ${sections.length} 节`;
      list.hidden = !open;
      scheduleUpdate();
    };
    const adapt = () => {
      toggle.hidden = !mobile.matches;
      setOpen(!mobile.matches);
    };

    toggle.addEventListener('click', () => setOpen(list.hidden));
    for (const { link, heading } of sections) {
      link.addEventListener('click', (event) => {
        if (!mobile.matches || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

        setOpen(false);
        heading.tabIndex = -1;
        requestAnimationFrame(() => heading.focus({ preventScroll: true }));
      });
    }
    mobile.addEventListener('change', adapt);
    adapt();
  }

  progress?.removeAttribute('hidden');
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('hashchange', scheduleUpdate);
  window.addEventListener('pageshow', scheduleUpdate);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(article);
    observer.observe(prose);
    if (list) observer.observe(list);
  }
  document.fonts?.ready.then(scheduleUpdate);
  scheduleUpdate();
}

export function enhanceArticle(article: HTMLElement) {
  const prose = article.querySelector<HTMLElement>('[data-article-prose]');
  if (!prose || article.dataset.enhanced === 'true') return;

  article.dataset.enhanced = 'true';
  const status = article.querySelector<HTMLElement>('[data-article-status]');
  let statusTimeout: number;
  const announce = (message: string) => {
    if (!status) return;

    window.clearTimeout(statusTimeout);
    status.textContent = '';
    statusTimeout = window.setTimeout(() => {
      status.textContent = message;
    }, 50);
  };

  restoreArchiveFilters(article);
  enhanceCodeBlocks(prose, announce);
  enhanceSectionLinks(prose, announce);
  enhanceCallouts(prose);
  enhanceLightbox(article, prose);
  observeReadingPosition(article, prose);
}
