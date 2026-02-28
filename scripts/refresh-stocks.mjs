import Database from 'better-sqlite3';

const db = new Database('public/data/stocks.db');

async function refreshStocks() {
    console.log('🔄 [Refresh] Correcting Industry Codes via TWSE Official Mapping...');
    try {
        // Corrected TWSE Open Data Category ID Mapping
        const industryMapping = {
            '01': 'legacy', // 水泥
            '02': 'legacy', // 食品
            '03': 'legacy', // 塑膠
            '04': 'legacy', // 紡織
            '05': 'machinery', // 電機
            '06': 'machinery', // 電纜
            '07': 'chemical', // 化學
            '08': 'biotech', // 生技
            '09': 'legacy', // 玻璃
            10: 'legacy', // 造紙
            11: 'steel', // 鋼鐵
            12: 'legacy', // 橡膠
            13: 'legacy', // 汽車
            14: 'construction', // 營建
            15: 'shipping', // 航運
            16: 'tourism', // 觀光
            17: 'finance', // 金融
            18: 'trading', // 貿易
            19: 'legacy', // 綜合
            20: 'other', // 其他
            21: 'chemical', // 化工
            22: 'biotech', // 生技(醫療)
            23: 'other', // 油電
            24: 'semiconductor', // 半導體
            25: 'computer', // 電腦
            26: 'electronics', // 光電
            27: 'electronics', // 通信
            28: 'electronics', // 電子組件
            29: 'electronics', // 電子通路
            30: 'electronics', // 資訊服務
            31: 'electronics', // 其他電子
        };

        const tseMetaRes = await fetch('https://openapi.twse.com.tw/v1/opendata/t187ap03_L');
        const tseMetaData = await tseMetaRes.json();
        const tseMap = new Map();
        for (const item of tseMetaData) {
            const code = item['公司代號'].trim();
            const indCode = item['產業別'];
            tseMap.set(code, industryMapping[indCode] || 'other');
        }

        const response = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL');
        const data = await response.json();
        const upsert = db.prepare(
            `INSERT INTO stocks (symbol, name, market, sector) VALUES (?, ?, ?, ?) ON CONFLICT(symbol) DO UPDATE SET name=excluded.name, market=excluded.market, sector=excluded.sector`
        );

        db.transaction(() => {
            for (const s of data) {
                const code = s.Code.trim();
                let sector = code.startsWith('00') ? 'etf' : tseMap.get(code) || 'other';
                upsert.run(code, s.Name.trim(), 'TSE', sector);
            }
        })();

        // OTC
        const otcRes = await fetch('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes');
        const otcData = await otcRes.json();
        db.transaction(() => {
            for (const s of otcData) {
                const symbol = (s.SecCode || s.symbol || '').trim();
                const name = (s.SecName || s.name || '').trim();
                if (!symbol) continue;
                let sector = symbol.startsWith('00') || symbol.startsWith('01') ? 'etf' : 'other';
                const prefix = symbol.slice(0, 2);
                if (['28', '58', '60'].includes(prefix)) sector = 'finance';
                else if (
                    [
                        '23',
                        '24',
                        '31',
                        '32',
                        '52',
                        '53',
                        '54',
                        '61',
                        '62',
                        '64',
                        '66',
                        '80',
                        '81',
                        '30',
                    ].includes(prefix)
                )
                    sector = 'electronics';
                else if (['15', '16', '45'].includes(prefix)) sector = 'machinery';
                else if (['55'].includes(prefix)) sector = 'construction';
                else if (['56', '26'].includes(prefix)) sector = 'shipping';
                upsert.run(symbol, name, 'OTC', sector);
            }
        })();
        console.log('✅ Sector Codes Corrected Successfully.');
    } catch (e) {
        console.error('❌ Sync failed:', e.message);
    }
}
await refreshStocks();
