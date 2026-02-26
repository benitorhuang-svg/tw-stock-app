export interface NavItem {
    label: string;
    path: string;
    icon: string;
}

export const NAV_ITEMS: NavItem[] = [
    { label: '數據觀測', path: '/database', icon: '🗃️' },
    { label: '法人監控', path: '/institutional', icon: '🫂' },
    { label: '市場漲幅', path: '/', icon: '📊' },
    { label: '即時開盤', path: '/live', icon: '📡' },
    { label: '選股', path: '/screener', icon: '🔍' },
    { label: '分析', path: '/stocks', icon: '📈' },
    { label: '自選', path: '/watchlist', icon: '⭐' },
    { label: '策略回測', path: '/strategy', icon: '🧪' },

];
