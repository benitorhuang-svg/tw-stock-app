/**
 * 新聞 RSS 整合（模擬）
 * 提供股票相關新聞資料
 */

export interface NewsItem {
    id: string;
    title: string;
    summary: string;
    source: string;
    url: string;
    publishedAt: string;
    symbol?: string;
    category: 'market' | 'stock' | 'industry' | 'global';
}

// 模擬新聞資料
const mockNews: NewsItem[] = [
    {
        id: 'news-1',
        title: '台積電法說會：2025 年營收成長上看 25%',
        summary: '台積電今日舉行法說會，管理層表示受惠於 AI 需求強勁，預期 2025 年營收將成長 20-25%。',
        source: '經濟日報',
        url: '#',
        publishedAt: '2025/01/24 14:30',
        symbol: '2330',
        category: 'stock'
    },
    {
        id: 'news-2',
        title: '外資連續買超台股，金融股受青睞',
        summary: '外資本週連續五日買超台股，累計買超金額達 500 億元，以金融股最受青睞。',
        source: '工商時報',
        url: '#',
        publishedAt: '2025/01/24 10:15',
        category: 'market'
    },
    {
        id: 'news-3',
        title: '聯發科發表天璣 9400 處理器，搶攻 AI 手機市場',
        summary: '聯發科今日發表最新旗艦處理器天璣 9400，效能大幅提升，鎖定 AI 智慧型手機市場。',
        source: '自由時報',
        url: '#',
        publishedAt: '2025/01/23 16:00',
        symbol: '2454',
        category: 'stock'
    },
    {
        id: 'news-4',
        title: '美股創新高，道瓊突破 44000 點',
        summary: '受惠於科技股強勢表現，美國道瓊工業指數首度突破 44000 點關卡。',
        source: 'CNN',
        url: '#',
        publishedAt: '2025/01/23 08:00',
        category: 'global'
    },
    {
        id: 'news-5',
        title: '航運股走強，貨櫃船運價再創新高',
        summary: '受紅海危機影響，貨櫃船運價持續上漲，航運三雄股價同步走高。',
        source: '經濟日報',
        url: '#',
        publishedAt: '2025/01/22 11:30',
        symbol: '2603',
        category: 'industry'
    }
];

/**
 * 取得最新新聞
 */
export function getLatestNews(limit: number = 10): NewsItem[] {
    return mockNews.slice(0, limit);
}

/**
 * 取得個股相關新聞
 */
export function getStockNews(symbol: string): NewsItem[] {
    return mockNews.filter(news => news.symbol === symbol);
}

/**
 * 取得分類新聞
 */
export function getNewsByCategory(category: NewsItem['category']): NewsItem[] {
    return mockNews.filter(news => news.category === category);
}

/**
 * 搜尋新聞
 */
export function searchNews(keyword: string): NewsItem[] {
    const lowerKeyword = keyword.toLowerCase();
    return mockNews.filter(news =>
        news.title.toLowerCase().includes(lowerKeyword) ||
        news.summary.toLowerCase().includes(lowerKeyword)
    );
}

/**
 * 新聞元件資料
 */
export function formatNewsForDisplay(news: NewsItem): {
    title: string;
    summary: string;
    meta: string;
    categoryLabel: string;
    categoryColor: string;
} {
    const categoryLabels: Record<string, string> = {
        market: '大盤',
        stock: '個股',
        industry: '產業',
        global: '國際'
    };

    const categoryColors: Record<string, string> = {
        market: '#00d4aa',
        stock: '#4dabf7',
        industry: '#ffd43b',
        global: '#ff6b6b'
    };

    return {
        title: news.title,
        summary: news.summary,
        meta: `${news.source} · ${news.publishedAt}`,
        categoryLabel: categoryLabels[news.category] || '其他',
        categoryColor: categoryColors[news.category] || '#a0a0b0'
    };
}
