const db = require('better-sqlite3')('public/data/stocks.db');

async function updateStockNames() {
    console.log('Fetching fresh stock list from TWSE...');
    try {
        const response = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL');
        const data = await response.json();

        const upsert = db.prepare(`
            INSERT INTO stocks (symbol, name, market, sector) 
            VALUES (?, ?, ?, ?)
            ON CONFLICT(symbol) DO UPDATE SET 
                name=excluded.name,
                market=excluded.market,
                sector=excluded.sector
        `);

        function getSectorBySymbol(symbol) {
            const prefix = symbol.slice(0, 2);
            if (prefix === '00' || prefix === '01' || prefix === '03' || prefix === '04')
                return 'etf';
            if (prefix === '28' || prefix === '58' || prefix === '60') return 'finance';
            if (prefix === '23' || prefix === '24' || prefix === '30' || prefix === '31')
                return 'semiconductor';
            if (prefix === '26') return 'shipping';
            // Default for now
            return 'other';
        }

        db.transaction(() => {
            for (const s of data) {
                const sector = getSectorBySymbol(s.Code);
                upsert.run(s.Code, s.Name.trim(), 'TSE', sector);
            }
        })();
        console.log(`Updated ${data.length} stocks from TWSE.`);
    } catch (e) {
        console.error('Failed to fetch from TWSE:', e.message);
    }
}

updateStockNames();
