/**
 * TWSE API 服務
 * 從證交所 API 取得台股資料
 */

// API 基礎 URL
const TWSE_BASE = 'https://www.twse.com.tw';

// 設定
const REQUEST_TIMEOUT = 5000; // 5 秒超時
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 首次重試等待 1 秒

export interface TwsePeRatioResponse {
    stat: string;
    date: string;
    title: string;
    fields: string[];
    data: string[][];
    notes: string[];
}

export interface TwseStockDayResponse {
    stat: string;
    date: string;
    title: string;
    fields: string[];
    data: string[][];
    notes: string[];
}

export interface TwseDailyQuoteResponse {
    stat: string;
    date: string;
    title: string;
    fields8?: string[];
    data8?: string[][];
    tables?: {
        title: string;
        fields: string[];
        data: string[][];
    }[];
}


// 延遲函式 (避免請求過於頻繁)
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 帶超時與重試的 fetch
 * - AbortController 控制超時
 * - 指數退避重試 (1s → 2s → 4s)
 */
async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
    for (let attempt = 0; attempt < retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) return response;

            // 429 Too Many Requests — 等待後重試
            if (response.status === 429 && attempt < retries - 1) {
                clearTimeout(timeoutId);
                await delay(BASE_DELAY * Math.pow(2, attempt));
                continue;
            }

            return response; // 其他 HTTP 錯誤直接回傳
        } catch (error: unknown) {
            clearTimeout(timeoutId);

            // 最後一次嘗試仍失敗 → 拋出
            if (attempt === retries - 1) throw error;

            // 超時或網路錯誤 → 等待後重試
            await delay(BASE_DELAY * Math.pow(2, attempt));
        }
    }
    throw new Error('Max retries exceeded');
}

/**
 * 取得個股本益比、殖利率、股價淨值比
 * @param date 日期 (YYYYMMDD)
 * @param stockNo 股票代號
 */
export async function getPERatio(date: string, stockNo: string) {
    const url = `${TWSE_BASE}/exchangeReport/BWIBBU_d?response=json&date=${date}&stockNo=${stockNo}`;

    try {
        const res = await fetchWithRetry(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = (await res.json()) as TwsePeRatioResponse;

        if (data.stat !== 'OK' || !data.data || data.data.length === 0) {
            return null;
        }

        // 資料欄位: 日期, 殖利率(%), 股利年度, 本益比, 股價淨值比, 財報年/季
        const latest = data.data[data.data.length - 1];
        return {
            date: latest[0],
            yield: parseFloat(latest[1]) || 0,
            dividendYear: latest[2],
            pe: parseFloat(latest[3]) || 0,
            pb: parseFloat(latest[4]) || 0,
            fiscalPeriod: latest[5],
        };
    } catch (error) {
        console.error(`getPERatio error for ${stockNo}:`, error);
        return null;
    }
}

/**
 * 取得個股月成交資訊 (K線資料)
 * @param date 年月 (YYYYMM)
 * @param stockNo 股票代號
 */
export async function getStockDay(date: string, stockNo: string) {
    const url = `${TWSE_BASE}/exchangeReport/STOCK_DAY?response=json&date=${date}01&stockNo=${stockNo}`;

    try {
        const res = await fetchWithRetry(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = (await res.json()) as TwseStockDayResponse;

        if (data.stat !== 'OK' || !data.data) {
            return null;
        }

        // 資料欄位: 日期, 成交股數, 成交金額, 開盤價, 最高價, 最低價, 收盤價, 漲跌價差, 成交筆數
        return data.data.map((row: string[]) => ({
            date: row[0],
            volume: parseInt(row[1].replace(/,/g, '')) || 0,
            turnover: parseInt(row[2].replace(/,/g, '')) || 0,
            open: parseFloat(row[3].replace(/,/g, '')) || 0,
            high: parseFloat(row[4].replace(/,/g, '')) || 0,
            low: parseFloat(row[5].replace(/,/g, '')) || 0,
            close: parseFloat(row[6].replace(/,/g, '')) || 0,
            change: parseFloat(row[7].replace(/,/g, '')) || 0,
            transactions: parseInt(row[8].replace(/,/g, '')) || 0,
        }));
    } catch (error) {
        console.error(`getStockDay error for ${stockNo}:`, error);
        return null;
    }
}

/**
 * 取得當日全部股票本益比、殖利率、股價淨值比
 * @param date 日期 (YYYYMMDD)
 */
export async function getAllPERatios(date: string) {
    const url = `${TWSE_BASE}/exchangeReport/BWIBBU_ALL?response=json&date=${date}`;

    try {
        const res = await fetchWithRetry(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = (await res.json()) as TwsePeRatioResponse;

        if (data.stat !== 'OK' || !data.data) {
            return [];
        }

        // 資料欄位: 證券代號, 證券名稱, 殖利率(%), 股利年度, 本益比, 股價淨值比, 財報年/季
        return data.data.map((row: string[]) => ({
            symbol: row[0],
            name: row[1],
            yield: parseFloat(row[2]) || 0,
            dividendYear: row[3],
            pe: parseFloat(row[4]) || 0,
            pb: parseFloat(row[5]) || 0,
            fiscalPeriod: row[6],
        }));
    } catch (error) {
        console.error('getAllPERatios error:', error);
        return [];
    }
}

/**
 * 取得當日收盤行情
 */
export async function getDailyQuotes(date: string) {
    const url = `${TWSE_BASE}/exchangeReport/MI_INDEX?response=json&date=${date}&type=ALLBUT0999`;

    try {
        const res = await fetchWithRetry(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = (await res.json()) as TwseDailyQuoteResponse;

        if (data.stat !== 'OK') {
            return [];
        }

        // tables[8] 通常是個股行情
        const table = data.tables?.find(t => t.title?.includes('個股'));
        if (!table?.data) return [];

        return table.data.map((row: string[]) => ({
            symbol: row[0],
            name: row[1],
            volume: parseInt(row[2]?.replace(/,/g, '')) || 0,
            transactions: parseInt(row[3]?.replace(/,/g, '')) || 0,
            turnover: parseInt(row[4]?.replace(/,/g, '')) || 0,
            open: parseFloat(row[5]?.replace(/,/g, '')) || 0,
            high: parseFloat(row[6]?.replace(/,/g, '')) || 0,
            low: parseFloat(row[7]?.replace(/,/g, '')) || 0,
            close: parseFloat(row[8]?.replace(/,/g, '')) || 0,
            change: row[9],
            changePrice: parseFloat(row[10]?.replace(/,/g, '')) || 0,
        }));
    } catch (error) {
        console.error('getDailyQuotes error:', error);
        return [];
    }
}

// 格式化日期為 YYYYMMDD
export function formatDateForAPI(date: Date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
}

// 格式化日期為 YYYYMM
export function formatMonthForAPI(date: Date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}${m}`;
}
