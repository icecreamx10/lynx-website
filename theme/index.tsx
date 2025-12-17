import {
  Head,
  removeBase,
  useLang,
  useLocation,
  usePageData,
} from '@rspress/core/runtime';
import {
  HomeLayout as BaseHomeLayout,
  Layout as BaseLayout,
  getCustomMDXComponent,
  Link as BaseLink,
} from '@rspress/core/theme';
import type { SearchProps } from '@rspress/plugin-algolia/runtime';
import {
  Search as PluginAlgoliaSearch,
  ZH_LOCALES,
} from '@rspress/plugin-algolia/runtime';
import { useCallback, useEffect, useMemo, useState } from 'react';

import './index.scss';

import {
  Banner,
  Features,
  Footer,
  MeteorsBackground,
  ShowCase,
} from '@/components/home-comps';
import { SUBSITES_CONFIG } from '@site/shared-route-config';
import AfterNavTitle from './AfterNavTitle';
import BeforeSidebar from './BeforeSidebar';
import { useBlogBtnDom } from './hooks/use-blog-btn-dom';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      htmlAttrs: unknown;
    }
  }
}

function Layout(props: Parameters<typeof BaseLayout>[0]) {
  const { pathname } = useLocation();
  const { page } = usePageData();

  const subsite = SUBSITES_CONFIG.find((s) => pathname.includes(s.value));

  return (
    <>
      <Head>
        <htmlAttrs data-subsite={subsite ? subsite.value : 'guide'} />
        {(() => {
          const toISO = (val: any) => {
            if (!val) return '';
            const d = new Date(val);
            return Number.isNaN(d.getTime()) ? '' : d.toISOString();
          };
          const publishedISO = toISO(page?.frontmatter?.date);
          const updatedISO = toISO(
            (page as any)?.lastUpdated ?? page?.frontmatter?.date,
          );
          const isDeprecated = Boolean(page?.frontmatter?.deprecated);
          const title = (page as any)?.title || '';
          const jsonld =
            updatedISO || publishedISO
              ? JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'Article',
                  headline: title,
                  datePublished: publishedISO || undefined,
                  dateModified: updatedISO || undefined,
                })
              : '';
          return (
            <>
              {updatedISO && (
                <meta property="article:modified_time" content={updatedISO} />
              )}
              {updatedISO && (
                <meta name="docsearch:updated_at" content={updatedISO} />
              )}
              {isDeprecated && (
                <meta name="docsearch:deprecated" content="true" />
              )}
              {isDeprecated && (
                <meta name="docsearch:tags" content="deprecated" />
              )}
              {jsonld && <script type="application/ld+json">{jsonld}</script>}
            </>
          );
        })()}
      </Head>
      <BaseLayout
        {...props}
        afterNavTitle={<AfterNavTitle />}
        beforeSidebar={<BeforeSidebar />}
        bottom={<Footer />}
      />
    </>
  );
}

const enSuffix = ' Native for More';
const enWords = ['Unlock', 'Render', 'Toward', 'Ship'];
const zhWords = ['迈向', '更快的', '更多平台的', '更多人的'];
const zhSuffix = '原生体验';

function HomeLayout(props: Parameters<typeof BaseHomeLayout>[0]) {
  const { pathname } = useLocation();
  const isZh = pathname.startsWith('/zh/');
  const { page } = usePageData();
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [text, setText] = useState(
    isZh ? `${zhWords[0]}${zhSuffix}` : `${enWords[0]}${enSuffix}`,
  );
  const [delta, setDelta] = useState(200);
  const [isPaused, setIsPaused] = useState(false);

  const routePath = useMemo(() => {
    let tmp = page.routePath.replace('/zh/', '/');
    return removeBase(tmp);
  }, [page]);

  useBlogBtnDom(routePath);

  // Update theme based on URL
  useEffect(() => {
    const subsite = SUBSITES_CONFIG.find((s) => pathname.includes(s.value));
    document.documentElement.setAttribute(
      'data-subsite',
      subsite ? subsite.value : 'guide',
    );
  }, [pathname]);

  const updateText = useCallback(() => {
    const h1Ele = document.querySelector('h1');
    const h1Span = document.querySelector('h1 > span');
    if (!h1Ele) return;
    if (!h1Span) return;

    // Add negative margin to h1 span to avoid text wrapping
    h1Ele.style.margin = '0 -100px';

    const words = isZh ? zhWords : enWords;
    const suffix = isZh ? zhSuffix : enSuffix;

    const currentWord = words[currentWordIndex];
    const currentLength = text.replace(suffix, '').length;
    const dynamicText = isDeleting
      ? currentWord.substring(0, currentLength - 1)
      : currentWord.substring(0, currentLength + 1);

    const fullText = `${dynamicText}${suffix}`;
    setText(fullText);

    const dynamicSpan = h1Span.querySelector('.dynamic-text');
    const suffixSpan = h1Span.querySelector('.suffix-text');

    if (!dynamicSpan || !suffixSpan) {
      h1Span.innerHTML = `
        <span class="dynamic-text">${dynamicText}</span><span class="suffix-text">${suffix}</span>
      `;
    } else {
      dynamicSpan.textContent = dynamicText;
      suffixSpan.textContent = suffix;
    }

    if (!isDeleting && dynamicText === currentWord) {
      if (!isPaused) {
        setIsPaused(true);
        setDelta(2000);
      } else {
        setIsPaused(false);
        setIsDeleting(true);
        setDelta(100);
      }
    } else if (isDeleting && dynamicText === '') {
      setIsDeleting(false);
      setCurrentWordIndex((prev) => (prev + 1) % words.length);
      setDelta(140);
    }
  }, [currentWordIndex, isDeleting, text, isPaused, isZh]);

  // Reset animation when language changes or when returning to home page
  useEffect(() => {
    const isHomePage = routePath === '/';

    if (isHomePage) {
      // Reset all states when returning to home
      setCurrentWordIndex(0);
      setIsDeleting(false);
      setIsPaused(false);
      setDelta(200);
      setText(isZh ? `${zhWords[0]}${zhSuffix}` : `${enWords[0]}${enSuffix}`);
    }
  }, [isZh, page]); // Watch both language and path changes

  useEffect(() => {
    const isHomePage = routePath === '/';

    if (!isHomePage) {
      return;
    }

    const ticker = setInterval(updateText, delta);
    return () => clearInterval(ticker);
  }, [updateText, delta, page]);

  const { pre: PreWithCodeButtonGroup, code: Code } = getCustomMDXComponent();

  // Rspress would pass `afterHero: undefined` and `afterHeroActions: undefined` props to HomeLayout,
  const {
    afterHero = (
      <>
        <Features src={routePath} /> {routePath === '/' && <ShowCase />}
        {routePath === '/' && <Banner />}
      </>
    ),
    afterHeroActions = (
      <div
        className="rp-doc"
        style={{ minHeight: 'auto', width: '100%', maxWidth: 300 }}
      >
        <PreWithCodeButtonGroup
          containerElementClassName="language-bash home-layout-create-block"
          codeButtonGroupProps={{
            showCodeWrapButton: false,
          }}
        >
          <Code
            className="language-bash home-layout-create-block"
            style={{ textAlign: 'center' }}
          >
            npm create rspeedy@latest
          </Code>
        </PreWithCodeButtonGroup>
      </div>
    ),
  } = props;

  return (
    <>
      <MeteorsBackground gridSize={120} meteorCount={3} />
      <div className="home-layout-container">
        <BaseHomeLayout
          {...props}
          afterHero={afterHero}
          afterHeroActions={afterHeroActions}
        />
      </div>
    </>
  );
}

const Search = (props?: Partial<SearchProps> | undefined) => {
  const lang = useLang();
  return (
    <PluginAlgoliaSearch
      docSearchProps={{
        appId: 'V4ET1OFZ5S', // cspell:disable-line
        apiKey: '15236c16e0f335c0cb2a67bc3ac06bcb', // cspell:disable-line
        indexName: 'lynx_next',
        searchParameters: {
          facetFilters: [`lang:${lang}`],
          optionalFilters: [
            'deprecated:false',
            'isDeprecated:false',
            'is_outdated:false',
            'isLatest:true',
          ],
          sumOrFiltersScores: true,
          getRankingInfo: true,
        },
        maxResultsPerGroup: 5,
        transformItems: (items: any[]) => {
          const getTs = (item: any) => {
            const pick = (k: string) => {
              const v = (item as any)[k];
              return typeof v === 'string' && v ? v : undefined;
            };
            const s =
              pick('updated_at') ||
              pick('docsearch:updated_at') ||
              pick('modified_time') ||
              pick('dateModified') ||
              pick('datePublished') ||
              pick('lastmod') ||
              pick('published_at') ||
              pick('date');
            if (s) {
              const d = new Date(s);
              const t = d.getTime();
              if (!Number.isNaN(t)) return t;
            }
            const url = String(item.url || '');
            if (url.includes('/next')) return Number.MAX_SAFE_INTEGER;
            const m = url.match(/\/(\d+)\.(\d+)\//);
            if (m) return Number(m[1]) * 100 + Number(m[2]);
            return 0;
          };
          const hasDeprecated = (it: any) => {
            const t = String((it as any).content || '').toLowerCase();
            if (t.includes('deprecated') || t.includes('弃用')) return true;
            const u = String((it as any).url || '').toLowerCase();
            return u.includes('deprecated');
          };
          const groups = new Map<number, any[]>();
          const scores: number[] = [];
          items.forEach((it) => {
            const s = (it as any)._rankingInfo?.rankingScore;
            const key = typeof s === 'number' ? s : -1;
            if (!groups.has(key)) {
              groups.set(key, []);
              scores.push(key);
            }
            groups.get(key)!.push(it);
          });
          scores.sort((a, b) => b - a);
          const out: any[] = [];
          scores.forEach((score) => {
            const arr = groups.get(score)!;
            arr.sort((a, b) => {
              const ad = hasDeprecated(a) ? 1 : 0;
              const bd = hasDeprecated(b) ? 1 : 0;
              if (ad !== bd) return ad - bd;
              return getTs(b) - getTs(a);
            });
            out.push(...arr);
          });
          return out;
        },
        ...props?.docSearchProps,
      }}
      locales={ZH_LOCALES}
    />
  );
};

export { HomeLayout, Layout, Search };

const Link = (props: React.ComponentProps<typeof BaseLink>) => {
  const { href, children, className, ...restProps } = props;
  const getLangPrefix = (lang: string) => (lang === 'en' ? '' : `/${lang}`);
  if (href && href.startsWith(`${getLangPrefix(useLang())}/blog`)) {
    return (
      <a
        className={`rp-link ${className}`}
        href={`/next${removeBase(href)}`}
        target="_blank"
      >
        {children}
      </a>
    );
  }
  return (
    <BaseLink href={href} className={className} {...restProps}>
      {children}
    </BaseLink>
  );
};

export { Link }; // override Link from @rspress/core/theme

export * from '@rspress/core/theme';
