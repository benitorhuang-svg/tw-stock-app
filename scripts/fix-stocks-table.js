const db = require('better-sqlite3')('public/data/stocks.db');

// Sector logic from stockDataService
function getSectorBySymbol(symbol) {
    const overrides = {
        2330: 'semiconductor',
        2454: 'semiconductor',
        3034: 'semiconductor',
        2317: 'electronics',
        2308: 'electronics',
        2382: 'electronics',
        2412: 'communication',
        3008: 'optoelectronics',
        1301: 'plastic',
        2002: 'steel',
        2603: 'shipping',
        2609: 'shipping',
        7722: 'finance',
        7705: 'tourism',
        9910: 'sports-leisure',
    };
    if (overrides[symbol]) return overrides[symbol];
    const prefix = symbol.slice(0, 2);
    if (prefix === '00' || prefix === '01' || prefix === '03' || prefix === '04') return 'etf';
    if (prefix === '11') return 'construction';
    if (prefix === '12') return 'food';
    if (prefix === '13') return 'plastic';
    if (prefix === '14') return 'textile';
    if (prefix === '15' || prefix === '16') return 'electronics';
    if (prefix === '17') return 'chemical';
    if (prefix === '20') return 'steel';
    if (prefix === '21') return 'rubber';
    if (prefix === '22') return 'auto';
    if (prefix === '23') return 'semiconductor';
    if (prefix === '24') return 'computer';
    if (prefix === '25') return 'construction';
    if (prefix === '26') return 'shipping';
    if (prefix === '27') return 'tourism';
    if (prefix === '28') return 'finance';
    if (prefix === '29') return 'trading';
    if (prefix === '58' || prefix === '60') return 'finance';
    if (prefix === '30' || prefix === '31' || prefix === '32') return 'electronics';
    return 'other';
}

// 1. Get all symbols from price_history that are NOT in stocks table OR have null names
const missing = db
    .prepare(
        `
    SELECT DISTINCT symbol FROM price_history 
    WHERE symbol NOT IN (SELECT symbol FROM stocks)
`
    )
    .all();

console.log(`Found ${missing.length} missing symbols in stocks table.`);

// Since we can't easily get ALL names without a fresh TWSE fetch,
// let's at least initialize the rows so the JOINs don't fail, and use SYMBOL as NAME for now
// if we can't find it.
// ACTUALLY, I'll try to fetch from TWSE directly to fix this ONCE AND FOR ALL.

const insert = db.prepare(
    'INSERT OR IGNORE INTO stocks (symbol, name, market, sector) VALUES (?, ?, ?, ?)'
);

db.transaction(() => {
    for (const row of missing) {
        const sector = getSectorBySymbol(row.symbol);
        const market = row.symbol.length === 4 ? 'TSE' : 'OTC';
        insert.run(row.symbol, row.symbol, market, sector);
    }
})();

console.log('Database stocks table initialized with missing symbols.');
