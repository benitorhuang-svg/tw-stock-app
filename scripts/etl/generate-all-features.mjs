/**
 * generate-all-features.mjs — AI & Forensic Feature Extraction
 * Calculates technical and forensic features from raw price & chip data.
 *
 * 四層架構 ETL:
 *   ② 運算層: chip_features, tech_features, valuation_features
 *   ③ 聚合層: institutional_trend, sector_daily
 *   ④ 快照層: latest_prices (enrichment), institutional_snapshot
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { SMA, RSI, MACD, Stochastic } from 'technicalindicators';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'public', 'data', 'stocks.db');

const db = new Database(DB_PATH);

async function generate() {
    console.log('🧪 啟動鑑識特徵提取（M1 ETL）...');

    // 0. 正規化 chips 日期格式 (YYYYMMDD → YYYY-MM-DD)
    const compactCount = db.prepare(
        "SELECT COUNT(*) AS c FROM chips WHERE date NOT LIKE '____-__-__'"
    ).get().c;
    if (compactCount > 0) {
        console.log(`   🔧 正規化 ${compactCount} 筆 compact 日期 → ISO...`);
        db.exec(`
            UPDATE chips
            SET date = substr(date,1,4)||'-'||substr(date,5,2)||'-'||substr(date,7,2)
            WHERE length(date) = 8 AND date NOT LIKE '____-__-__';
        `);
        console.log('   ✅ chips 日期格式已統一為 YYYY-MM-DD');
    }

    // 1. Reset / Ensure Feature Tables Exist (Lean approach)
    db.exec(`
        DROP TABLE IF EXISTS chip_features;
        DROP TABLE IF EXISTS valuation_features;
        DROP TABLE IF EXISTS tech_features;

        CREATE TABLE chip_features (
            symbol TEXT NOT NULL,
            date TEXT NOT NULL,
            foreign_buy INTEGER,
            trust_buy INTEGER,
            dealer_buy INTEGER,
            total_inst_buy INTEGER,
            concentration_5d REAL,
            PRIMARY KEY (symbol, date)
        );

        CREATE TABLE IF NOT EXISTS valuation_features (
            symbol TEXT NOT NULL,
            date TEXT NOT NULL,
            pe_ratio REAL,
            pb_ratio REAL,
            dividend_yield REAL,
            PRIMARY KEY (symbol, date)
        );

        CREATE TABLE IF NOT EXISTS tech_features (
            symbol TEXT NOT NULL,
            date TEXT NOT NULL,
            ma5 REAL,
            ma20 REAL,
            rsi_14 REAL,
            macd_diff REAL,
            macd_dea REAL,
            kd_k REAL,
            kd_d REAL,
            PRIMARY KEY (symbol, date)
        );

        -- ③ 聚合層: 法人每日趨勢 & 產業每日彙總
        CREATE TABLE IF NOT EXISTS institutional_trend (
            date TEXT PRIMARY KEY,
            total_foreign INTEGER,
            total_trust INTEGER,
            total_dealer INTEGER,
            total_net INTEGER,
            avg_change_pct REAL,
            buy_count INTEGER,
            sell_count INTEGER
        );
        DELETE FROM institutional_trend;

        CREATE TABLE IF NOT EXISTS sector_daily (
            sector TEXT NOT NULL,
            date TEXT NOT NULL,
            stock_count INTEGER,
            avg_change_pct REAL,
            total_volume INTEGER,
            total_turnover REAL,
            up_count INTEGER,
            down_count INTEGER,
            top_gainer_symbol TEXT,
            top_gainer_pct REAL,
            avg_pe REAL,
            avg_pb REAL,
            avg_yield REAL,
            PRIMARY KEY (sector, date)
        );
        DELETE FROM sector_daily;

        -- ④ 快照層: 法人總覽快照
        CREATE TABLE IF NOT EXISTS institutional_snapshot (
            symbol TEXT NOT NULL PRIMARY KEY,
            date TEXT NOT NULL,
            foreign_inv INTEGER DEFAULT 0,
            invest_trust INTEGER DEFAULT 0,
            dealer INTEGER DEFAULT 0,
            margin_bal INTEGER DEFAULT 0,
            margin_net INTEGER DEFAULT 0,
            short_bal INTEGER DEFAULT 0,
            short_net INTEGER DEFAULT 0,
            total_shareholders INTEGER,
            large_holder_1000_ratio REAL,
            small_holder_under_10_ratio REAL,
            gov_net_buy INTEGER DEFAULT 0,
            gov_net_amount REAL DEFAULT 0,
            main_net_shares INTEGER DEFAULT 0,
            main_concentration REAL DEFAULT 0,
            director_ratio REAL DEFAULT 0,
            pawn_ratio REAL DEFAULT 0,
            insider_change INTEGER DEFAULT 0,
            lending_balance INTEGER DEFAULT 0,
            short_selling_balance INTEGER DEFAULT 0,
            prop_buy INTEGER DEFAULT 0,
            hedge_buy INTEGER DEFAULT 0
        );
        DELETE FROM institutional_snapshot;
    `);

    // 2. Fetch Symbols
    const symbols = db.prepare('SELECT symbol FROM stocks').all();
    console.log(`📊 正在計算 ${symbols.length} 檔股票的特徵值...`);

    // 3. Populate Valuation Features (Copy from latest_prices)
    db.exec(`
        INSERT OR REPLACE INTO valuation_features (symbol, date, pe_ratio, pb_ratio, dividend_yield)
        SELECT symbol, date, ROUND(pe, 2) as pe_ratio, ROUND(pb, 2) as pb_ratio, ROUND(yield, 2) as dividend_yield
        FROM latest_prices;
    `);
    console.log('   ✅ 估值特徵已同步。');

    // 4. Calculate Chip Concentration (Simplified 5-day sum)
    const insertChipFeature = db.prepare(`
        INSERT OR REPLACE INTO chip_features (symbol, date, foreign_buy, trust_buy, dealer_buy, total_inst_buy, concentration_5d)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const calcChipTx = db.transaction(() => {
        let count = 0;
        for (const { symbol } of symbols) {
            const history = db
                .prepare(
                    `
                SELECT c.date, c.foreign_inv, c.invest_trust, c.dealer, ph.volume
                FROM chips c
                JOIN price_history ph ON c.symbol = ph.symbol AND c.date = ph.date
                WHERE c.symbol = ?
                ORDER BY c.date DESC
                LIMIT 5
            `
                )
                .all(symbol);

            if (history.length === 0) continue;
            count++;

            const latest = history[0];
            const netFlow = history.reduce(
                (sum, h) => sum + (h.foreign_inv || 0) + (h.invest_trust || 0) + (h.dealer || 0),
                0
            );
            const totalVol = history.reduce((sum, h) => sum + (h.volume || 0), 1); // Avoid div by zero
            const concentration = (netFlow / totalVol) * 100;

            insertChipFeature.run(
                symbol,
                latest.date,
                latest.foreign_inv,
                latest.invest_trust,
                latest.dealer,
                latest.foreign_inv + latest.invest_trust + latest.dealer,
                Number(concentration.toFixed(2))
            );
        }
        console.log(`      （已處理 ${count} 檔有籌碼歷史的股票）`);
    });

    calcChipTx();
    console.log('   ✅ 籌碼集中度（5日）已計算。');

    // 5. Tech Features (RSI, MACD, KD, MA)
    const insertTechFeature = db.prepare(`
        INSERT OR REPLACE INTO tech_features (symbol, date, ma5, ma20, rsi_14, macd_diff, macd_dea, kd_k, kd_d)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const calcTechTx = db.transaction(() => {
        let count = 0;
        const round2 = num => (num != null ? Math.round(num * 100) / 100 : null);

        for (const { symbol } of symbols) {
            const history = db
                .prepare(
                    'SELECT date, close, high, low FROM price_history WHERE symbol = ? ORDER BY date ASC'
                )
                .all(symbol);

            if (history.length === 0) continue;

            const latestDate = history[history.length - 1].date;
            const closes = history.map(h => h.close);
            const highs = history.map(h => h.high);
            const lows = history.map(h => h.low);

            const ma5 = SMA.calculate({ period: 5, values: closes });
            const ma20 = SMA.calculate({ period: 20, values: closes });
            const rsi = RSI.calculate({ period: 14, values: closes });

            const macdVars = MACD.calculate({
                values: closes,
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9,
                SimpleMAOscillator: false,
                SimpleMASignal: false,
            });

            const kd = Stochastic.calculate({
                high: highs,
                low: lows,
                close: closes,
                period: 9,
                signalPeriod: 3,
            });

            insertTechFeature.run(
                symbol,
                latestDate,
                ma5.length > 0 ? round2(ma5[ma5.length - 1]) : null,
                ma20.length > 0 ? round2(ma20[ma20.length - 1]) : null,
                rsi.length > 0 ? round2(rsi[rsi.length - 1]) : null,
                macdVars.length > 0 ? round2(macdVars[macdVars.length - 1].histogram) : null,
                macdVars.length > 0 ? round2(macdVars[macdVars.length - 1].signal) : null,
                kd.length > 0 ? round2(kd[kd.length - 1].k) : null,
                kd.length > 0 ? round2(kd[kd.length - 1].d) : null
            );
            count++;
        }
        console.log(`      （已處理 ${count} 檔有技術特徵的股票）`);
    });

    calcTechTx();
    console.log('   ✅ 技術指標特徵已更新。');

    // ═══════════════════════════════════════════
    // ③ 聚合層: institutional_trend + sector_daily
    // ═══════════════════════════════════════════

    // 6. 法人每日趨勢 (從 chips 按日期彙總)
    db.exec(`
        INSERT OR REPLACE INTO institutional_trend
            (date, total_foreign, total_trust, total_dealer, total_net, avg_change_pct, buy_count, sell_count)
        SELECT
            c.date,
            SUM(c.foreign_inv)  AS total_foreign,
            SUM(c.invest_trust) AS total_trust,
            SUM(c.dealer)       AS total_dealer,
            SUM(c.foreign_inv + c.invest_trust + c.dealer) AS total_net,
            (SELECT AVG(ph.change_pct) FROM price_history ph WHERE ph.date = c.date AND ph.close > 0) AS avg_change_pct,
            SUM(CASE WHEN (c.foreign_inv + c.invest_trust + c.dealer) > 0 THEN 1 ELSE 0 END) AS buy_count,
            SUM(CASE WHEN (c.foreign_inv + c.invest_trust + c.dealer) < 0 THEN 1 ELSE 0 END) AS sell_count
        FROM chips c
        GROUP BY c.date
        ORDER BY c.date DESC;
    `);
    const trendCount = db.prepare('SELECT count(*) as c FROM institutional_trend').get().c;
    console.log(`   ✅ 法人趨勢：已彙總 ${trendCount} 個交易日。`);

    // 7. 產業每日彙總 (從 latest_prices + stocks 按產業彙總)
    db.exec(`
        INSERT OR REPLACE INTO sector_daily
            (sector, date, stock_count, avg_change_pct, total_volume, total_turnover,
             up_count, down_count, top_gainer_symbol, top_gainer_pct, avg_pe, avg_pb, avg_yield)
        SELECT
            s.sector,
            lp.date,
            COUNT(*)                                                      AS stock_count,
            ROUND(AVG(lp.change_pct), 2)                                  AS avg_change_pct,
            SUM(lp.volume)                                                AS total_volume,
            SUM(lp.turnover)                                              AS total_turnover,
            SUM(CASE WHEN lp.change_pct > 0 THEN 1 ELSE 0 END)          AS up_count,
            SUM(CASE WHEN lp.change_pct < 0 THEN 1 ELSE 0 END)          AS down_count,
            (SELECT lp2.symbol FROM latest_prices lp2
             JOIN stocks s2 ON s2.symbol = lp2.symbol
             WHERE s2.sector = s.sector
             ORDER BY lp2.change_pct DESC LIMIT 1)                        AS top_gainer_symbol,
            MAX(lp.change_pct)                                            AS top_gainer_pct,
            ROUND(AVG(CASE WHEN lp.pe > 0 THEN lp.pe END), 2)           AS avg_pe,
            ROUND(AVG(CASE WHEN lp.pb > 0 THEN lp.pb END), 2)           AS avg_pb,
            ROUND(AVG(CASE WHEN lp.yield > 0 THEN lp.yield END), 2)     AS avg_yield
        FROM latest_prices lp
        JOIN stocks s ON s.symbol = lp.symbol
        WHERE s.sector IS NOT NULL AND s.sector != ''
        GROUP BY s.sector, lp.date;
    `);
    const sectorCount = db.prepare('SELECT count(DISTINCT sector) as c FROM sector_daily').get().c;
    console.log(`   ✅ 產業日報：已彙總 ${sectorCount} 個產業。`);

    // ═══════════════════════════════════════════
    // ④ 快照層: institutional_snapshot + latest_prices enrichment
    // ═══════════════════════════════════════════

    // 8. 法人籌碼總覽快照 (合併 8 張法人表最新資料 → 一檔一列)
    db.exec(`
        INSERT OR REPLACE INTO institutional_snapshot
            (symbol, date, foreign_inv, invest_trust, dealer,
             margin_bal, margin_net, short_bal, short_net,
             total_shareholders, large_holder_1000_ratio, small_holder_under_10_ratio,
             gov_net_buy, gov_net_amount,
             main_net_shares, main_concentration,
             director_ratio, pawn_ratio, insider_change,
             lending_balance, short_selling_balance,
             prop_buy, hedge_buy)
        SELECT
            s.symbol,
            COALESCE(c.date, lp.date) AS date,
            COALESCE(c.foreign_inv, 0),
            COALESCE(c.invest_trust, 0),
            COALESCE(c.dealer, 0),
            COALESCE(ms.margin_bal, 0),
            COALESCE(ms.margin_net, 0),
            COALESCE(ms.short_bal, 0),
            COALESCE(ms.short_net, 0),
            sd.total_shareholders,
            sd.large_holder_1000_ratio,
            sd.small_holder_under_10_ratio,
            COALESCE(gc.net_buy_shares, 0),
            COALESCE(gc.net_buy_amount, 0),
            COALESCE(mb.net_main_player_shares, 0),
            COALESCE(mb.concentration_ratio, 0),
            COALESCE(dh.director_holding_ratio, 0),
            COALESCE(dh.pawn_ratio, 0),
            COALESCE(dh.insider_net_change, 0),
            COALESCE(sl.lending_balance, 0),
            COALESCE(sl.short_selling_balance, 0),
            COALESCE(dd.prop_buy, 0),
            COALESCE(dd.hedge_buy, 0)
        FROM stocks s
        LEFT JOIN latest_prices lp ON s.symbol = lp.symbol
        LEFT JOIN (
            SELECT symbol, foreign_inv, invest_trust, dealer, date,
                   ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) AS rn
            FROM chips
        ) c ON s.symbol = c.symbol AND c.rn = 1
        LEFT JOIN (
            SELECT symbol, margin_bal, margin_net, short_bal, short_net,
                   ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) AS rn
            FROM margin_short
        ) ms ON s.symbol = ms.symbol AND ms.rn = 1
        LEFT JOIN (
            SELECT symbol, total_shareholders, large_holder_1000_ratio, small_holder_under_10_ratio,
                   ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) AS rn
            FROM shareholder_distribution
        ) sd ON s.symbol = sd.symbol AND sd.rn = 1
        LEFT JOIN (
            SELECT symbol, net_buy_shares, net_buy_amount,
                   ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) AS rn
            FROM government_chips
        ) gc ON s.symbol = gc.symbol AND gc.rn = 1
        LEFT JOIN (
            SELECT symbol, net_main_player_shares, concentration_ratio,
                   ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) AS rn
            FROM major_broker_chips
        ) mb ON s.symbol = mb.symbol AND mb.rn = 1
        LEFT JOIN (
            SELECT symbol, director_holding_ratio, pawn_ratio, insider_net_change,
                   ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) AS rn
            FROM director_holdings
        ) dh ON s.symbol = dh.symbol AND dh.rn = 1
        LEFT JOIN (
            SELECT symbol, lending_balance, short_selling_balance,
                   ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) AS rn
            FROM security_lending
        ) sl ON s.symbol = sl.symbol AND sl.rn = 1
        LEFT JOIN (
            SELECT symbol, prop_buy, hedge_buy,
                   ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) AS rn
            FROM dealer_details
        ) dd ON s.symbol = dd.symbol AND dd.rn = 1;
    `);
    const instSnapCount = db.prepare('SELECT count(*) as c FROM institutional_snapshot').get().c;
    console.log(`   ✅ 法人快照：已具體化 ${instSnapCount} 檔股票。`);

    // 9. 增強 latest_prices: 回填法人籌碼 + 產業分類
    // 確保 latest_prices 有新欄位 (ALTER TABLE 對已存在欄位安全跳過)
    const existingCols = new Set(
        db
            .prepare('PRAGMA table_info(latest_prices)')
            .all()
            .map(c => c.name)
    );
    const newCols = [
        ['foreign_inv', 'INTEGER DEFAULT 0'],
        ['invest_trust', 'INTEGER DEFAULT 0'],
        ['dealer', 'INTEGER DEFAULT 0'],
        ['sector', 'TEXT'],
    ];
    for (const [col, type] of newCols) {
        if (!existingCols.has(col)) {
            db.exec(`ALTER TABLE latest_prices ADD COLUMN ${col} ${type}`);
            console.log(`      + 已新增欄位 latest_prices.${col}`);
        }
    }

    // 回填法人籌碼
    db.exec(`
        UPDATE latest_prices
        SET foreign_inv  = COALESCE((SELECT i.foreign_inv  FROM institutional_snapshot i WHERE i.symbol = latest_prices.symbol), 0),
            invest_trust = COALESCE((SELECT i.invest_trust FROM institutional_snapshot i WHERE i.symbol = latest_prices.symbol), 0),
            dealer       = COALESCE((SELECT i.dealer       FROM institutional_snapshot i WHERE i.symbol = latest_prices.symbol), 0),
            sector       = (SELECT s.sector FROM stocks s WHERE s.symbol = latest_prices.symbol);
    `);
    console.log('   ✅ latest_prices 已回填法人籌碼與產業分類。');

    // 10. Mock AI Report (Sample 2330)
    db.prepare(
        `
        INSERT OR REPLACE INTO ai_reports (symbol, date, report)
        VALUES ('2330', (SELECT date FROM latest_prices WHERE symbol='2330'), 
        '【Forensic Insight】TSMC (2330) displays robust institutional accumulation (+5.2% over 5D). Chip concentration is in the top decile. Bullish RSI divergence noted on daily timeframe.')
    `
    ).run();
    console.log('   ✅ 範例 AI 洞察報告已產生。');

    // 11. 建立索引
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_inst_trend_date ON institutional_trend(date DESC);
        CREATE INDEX IF NOT EXISTS idx_sector_daily_date ON sector_daily(date DESC);
        CREATE INDEX IF NOT EXISTS idx_sector_daily_sector ON sector_daily(sector, date DESC);
        CREATE INDEX IF NOT EXISTS idx_latest_sector ON latest_prices(sector);
        CREATE INDEX IF NOT EXISTS idx_latest_foreign ON latest_prices(foreign_inv DESC);
        CREATE INDEX IF NOT EXISTS idx_inst_snap_symbol ON institutional_snapshot(symbol);
    `);
    console.log('   ✅ 索引已建立。');

    console.log('\n✨ 所有特徵值與延伸資料表已提取至鑑識資料庫。');
}

generate()
    .then(() => db.close())
    .catch(console.error);
