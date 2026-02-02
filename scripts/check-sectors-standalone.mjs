
import fs from 'fs';

// Mocked logic from industry.ts and stockDataService.ts
const stockIndustryMap = {
    '2317': 'electronics',
    '2308': 'electronics',
    '2382': 'electronics'
};

function getSectorBySymbol(symbol) {
    const prefix = symbol.substring(0, 2);
    if (prefix === '23') return 'semiconductor';
    if (prefix === '24') return 'computer';
    if (prefix === '25') return 'electronics';
    if (prefix === '30') return 'electronics';

    return stockIndustryMap[symbol] || 'others';
}

const stocks = JSON.parse(fs.readFileSync('./public/data/stocks.json', 'utf-8'));
const sectorCounts = {};

stocks.forEach(s => {
    const sector = getSectorBySymbol(s.symbol);
    sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
});

console.log('Sector Counts:', JSON.stringify(sectorCounts, null, 2));

const electronics = stocks.filter(s => getSectorBySymbol(s.symbol) === 'electronics');
console.log('Electronics samples (first 5):', JSON.stringify(electronics.slice(0, 5), null, 2));

const foxes = ['2317', '2308', '2382'];
foxes.forEach(f => {
    console.log(`Symbol ${f} sector: ${getSectorBySymbol(f)}`);
});
