/**
 * 產業分類資料
 */

export interface Industry {
    id: string;
    name: string;
    icon: string;
    description: string;
    stockCount?: number;
}

export const industries: Industry[] = [
    { id: 'etf', name: 'ETF/基金', icon: '📈', description: 'ETF、指數型基金、權證' },
    { id: 'semiconductor', name: '半導體', icon: '💻', description: 'IC 設計、晶圓代工、封測' },
    { id: 'electronics', name: '電子零組件', icon: '🔌', description: '被動元件、PCB、連接器' },
    { id: 'optoelectronics', name: '光電', icon: '💡', description: 'LED、面板、太陽能' },
    { id: 'communication', name: '通信網路', icon: '📡', description: '網通設備、5G' },
    { id: 'computer', name: '電腦及週邊', icon: '🖥️', description: 'PC、NB、伺服器' },
    { id: 'other-tech', name: '其他電子', icon: '⚙️', description: '其他電子產品及服務' },
    { id: 'finance', name: '金融', icon: '🏦', description: '銀行、保險、證券' },
    { id: 'food', name: '食品', icon: '🍜', description: '食品加工、飲料' },
    { id: 'plastic', name: '塑膠', icon: '🧪', description: '塑膠原料、加工' },
    { id: 'chemical', name: '化學工業', icon: '⚗️', description: '化學製品、特用化學品' },
    { id: 'energy', name: '綠能環保', icon: '🔋', description: '電力、資源回收、太陽能' },
    { id: 'textile', name: '紡織', icon: '👔', description: '成衣、布料' },
    { id: 'steel', name: '鋼鐵', icon: '🏗️', description: '鋼鐵製造、金屬加工' },
    { id: 'rubber', name: '橡膠', icon: '🛞', description: '橡膠製品、輪胎' },
    { id: 'paper', name: '造紙', icon: '📄', description: '造紙、紙製品' },
    { id: 'auto', name: '汽車工業', icon: '🚗', description: '汽車、零組件' },
    { id: 'shipping', name: '航運', icon: '🚢', description: '海運、空運、物流' },
    { id: 'biotech', name: '生技醫療', icon: '💊', description: '製藥、醫療器材' },
    { id: 'construction', name: '營建', icon: '🏠', description: '建設、營造' },
    { id: 'tourism', name: '觀光', icon: '✈️', description: '飯店、旅遊' },
    { id: 'trading', name: '貿易百貨', icon: '🛒', description: '百貨、零售' },
    { id: 'sports-leisure', name: '休閒與運動', icon: '👟', description: '自行車、運動鞋、健身' },
    { id: 'household', name: '生活與居家', icon: '🏠', description: '保全、家居配件、水電' },
    { id: 'other', name: '其他', icon: '📦', description: '其他產業、未分類' },
];

export function getIndustry(id: string): Industry | undefined {
    return industries.find(i => i.id === id);
}
