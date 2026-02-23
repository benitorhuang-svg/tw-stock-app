import fs from 'fs';
import { getSectorBySymbol } from './src/utils/stockDataService.ts';

const stocks = JSON.parse(fs.readFileSync('./public/data/stocks.json', 'utf-8'));
const sectorCounts = {};

stocks.forEach(s => {
    const sector = getSectorBySymbol(s.symbol);
    sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
});

console.log('Sector Counts:', JSON.stringify(sectorCounts, null, 2));

const electronics = stocks.filter(s => getSectorBySymbol(s.symbol) === 'electronics');
console.log('Electronics samples:', JSON.stringify(electronics.slice(0, 10), null, 2));
