export interface NavItem {
    label: string;
    path: string;
    icon: string;
}

export const NAV_ITEMS: NavItem[] = [
    { label: '數據觀測', path: '/database', icon: '🗃️' },
    { label: '總覽', path: '/', icon: '📊' },
    { label: '即時開盤', path: '/live', icon: '📡' },
    { label: '選股', path: '/screener', icon: '🔍' },
    { label: '分析', path: '/stocks', icon: '📈' },
    { label: '自選', path: '/watchlist', icon: '⭐' },
];
