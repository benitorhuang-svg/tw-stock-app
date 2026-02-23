import fs from 'fs';

// Constants from industries.ts
const industries = [
    { id: 'etf', name: 'ETF/基金' },
    { id: 'semiconductor', name: '半導體' },
    { id: 'electronics', name: '電子零組件' },
    { id: 'optoelectronics', name: '光電' },
    { id: 'communication', name: '通信網路' },
    { id: 'computer', name: '電腦及週邊' },
    { id: 'finance', name: '金融' },
    { id: 'food', name: '食品' },
    { id: 'plastic', name: '塑膠' },
    { id: 'textile', name: '紡織' },
    { id: 'steel', name: '鋼鐵' },
    { id: 'shipping', name: '航運' },
    { id: 'biotech', name: '生技醫療' },
    { id: 'construction', name: '營建' },
    { id: 'tourism', name: '觀光' },
    { id: 'trading', name: '貿易百貨' },
    { id: 'other', name: '其他' },
];

const stockIndustryMap = {
    2330: 'semiconductor',
    2454: 'semiconductor',
    3034: 'semiconductor',
    2317: 'electronics',
    2308: 'electronics',
    2382: 'electronics',
    2881: 'finance',
    2882: 'finance',
    2884: 'finance',
    2891: 'finance',
    2412: 'communication',
    3008: 'optoelectronics',
    2105: 'food',
    1301: 'plastic',
    2002: 'steel',
    2603: 'shipping',
    2609: 'shipping',
};

function getSectorBySymbol(symbol) {
    if (stockIndustryMap[symbol]) return stockIndustryMap[symbol];
    const prefix = symbol.substring(0, 2);
    if (prefix === '00' || prefix === '01') return 'etf';
    if (prefix === '11') return 'construction';
    if (prefix === '12') return 'food';
    if (prefix === '13') return 'plastic';
    if (prefix === '14') return 'textile';
    if (prefix === '15' || prefix === '16') return 'electronics';
    if (prefix === '17') return 'other'; // Manual check needed: usually chemicals
    if (prefix === '18') return 'construction';
    if (prefix === '19') return 'other'; // Paper
    if (prefix === '20') return 'steel';
    if (prefix === '21') return 'other'; // Rubber
    if (prefix === '22') return 'other'; // Auto
    if (prefix === '23') return 'semiconductor';
    if (prefix === '24') return 'computer';
    if (prefix === '25') return 'construction';
    if (prefix === '26') return 'shipping';
    if (prefix === '27') return 'tourism';
    if (prefix === '28') return 'finance';
    if (prefix === '29') return 'trading';
    if (['30', '31', '32', '33', '34', '36', '37', '53', '61', '81'].includes(prefix))
        return 'electronics';
    if (['35', '49', '54', '62', '64', '80'].includes(prefix)) return 'semiconductor';
    return 'other';
}

const stocks = JSON.parse(fs.readFileSync('./public/data/stocks.json', 'utf-8'));
const counts = {};
industries.forEach(ind => (counts[ind.id] = 0));

stocks.forEach(s => {
    const sector = getSectorBySymbol(s.symbol);
    counts[sector] = (counts[sector] || 0) + 1;
});

console.log('--- Industry Distribution Audit ---');
industries.forEach(ind => {
    console.log(`${ind.name.padEnd(10)} (${ind.id.padEnd(15)}): ${counts[ind.id]} stocks`);
});

const emptySectors = industries.filter(ind => counts[ind.id] === 0);
if (emptySectors.length > 0) {
    console.log('\nWarning: Empty Sectors found:', emptySectors.map(ind => ind.name).join(', '));
} else {
    console.log('\nSuccess: All sectors have stocks.');
}
