/**
 * 法人買賣超資料 — 讀取 public/data/chips/ 下的真實 JSON 資料
 */
import fs from 'node:fs';
import path from 'node:path';

export interface InstitutionalData {
    date: string;
    symbol: string;
    foreignBuy: number;
    foreignSell: number;
    foreignNet: number;
    investBuy: number;
    investSell: number;
    investNet: number;
    dealerBuy: number;
    dealerSell: number;
    dealerNet: number;
    totalNet: number;
}

// ── Raw chip JSON type ──
interface RawChipEntry {
    symbol: string;
    name?: string;
    foreign_inv: number;
    invest_trust: number;
    dealer: number;
}

// ── Lazy-loaded cache ──
let _chipData: Map<string, InstitutionalData[]> | null = null;

function loadChipData(): Map<string, InstitutionalData[]> {
    if (_chipData) return _chipData;
    _chipData = new Map();
    try {
        const chipsDir = path.join(process.cwd(), 'public', 'data', 'chips');
        if (!fs.existsSync(chipsDir)) return _chipData;

        const files = fs
            .readdirSync(chipsDir)
            .filter(f => f.endsWith('.json'))
            .sort()
            .reverse(); // newest first

        for (const file of files) {
            // filename: 20240216.json -> date 2024/02/16
            const dateStr = file.replace('.json', '');
            const formattedDate = `${dateStr.slice(0, 4)}/${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`;
            const raw: RawChipEntry[] = JSON.parse(
                fs.readFileSync(path.join(chipsDir, file), 'utf-8')
            );
            for (const r of raw) {
                const entry: InstitutionalData = {
                    date: formattedDate,
                    symbol: r.symbol,
                    foreignBuy: Math.max(r.foreign_inv, 0),
                    foreignSell: Math.abs(Math.min(r.foreign_inv, 0)),
                    foreignNet: r.foreign_inv,
                    investBuy: Math.max(r.invest_trust, 0),
                    investSell: Math.abs(Math.min(r.invest_trust, 0)),
                    investNet: r.invest_trust,
                    dealerBuy: Math.max(r.dealer, 0),
                    dealerSell: Math.abs(Math.min(r.dealer, 0)),
                    dealerNet: r.dealer,
                    totalNet: r.foreign_inv + r.invest_trust + r.dealer,
                };
                const list = _chipData.get(r.symbol) || [];
                list.push(entry);
                _chipData.set(r.symbol, list);
            }
        }
        // Each symbol's data is already newest-first since files are sorted desc
    } catch {
        // graceful fallback
    }
    return _chipData;
}

export function getInstitutionalData(symbol: string): InstitutionalData[] {
    return loadChipData().get(symbol) || [];
}

export function getLatestInstitutional(symbol: string): InstitutionalData | null {
    const data = getInstitutionalData(symbol);
    return data[0] || null;
}

export function getConsecutiveDays(
    symbol: string,
    type: 'foreign' | 'invest' | 'dealer' | 'total'
): number {
    const data = getInstitutionalData(symbol);
    if (data.length === 0) return 0;

    const getNet = (d: InstitutionalData) => {
        switch (type) {
            case 'foreign':
                return d.foreignNet;
            case 'invest':
                return d.investNet;
            case 'dealer':
                return d.dealerNet;
            case 'total':
                return d.totalNet;
        }
    };

    const firstNet = getNet(data[0]);
    if (firstNet === 0) return 0;

    const isPositive = firstNet > 0;
    let count = 0;

    for (const d of data) {
        const net = getNet(d);
        if ((isPositive && net > 0) || (!isPositive && net < 0)) {
            count++;
        } else {
            break;
        }
    }

    return isPositive ? count : -count;
}
