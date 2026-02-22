import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getPERatio,
    getStockDay,
    getAllPERatios,
    getDailyQuotes,
    formatDateForAPI,
    formatMonthForAPI
} from './twse-api';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
    mockFetch.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => { });
});

describe('TWSE API Service', () => {

    // ========================================
    // formatDateForAPI / formatMonthForAPI
    // ========================================

    describe('formatDateForAPI', () => {
        it('應格式化日期為 YYYYMMDD', () => {
            const date = new Date(2025, 0, 15); // Jan 15, 2025
            expect(formatDateForAPI(date)).toBe('20250115');
        });

        it('月和日應補零', () => {
            const date = new Date(2025, 2, 5); // Mar 5, 2025
            expect(formatDateForAPI(date)).toBe('20250305');
        });

        it('無參數應使用當前日期', () => {
            const result = formatDateForAPI();
            expect(result).toMatch(/^\d{8}$/);
        });
    });

    describe('formatMonthForAPI', () => {
        it('應格式化日期為 YYYYMM', () => {
            const date = new Date(2025, 11, 1); // Dec 2025
            expect(formatMonthForAPI(date)).toBe('202512');
        });

        it('月份應補零', () => {
            const date = new Date(2025, 0, 1); // Jan 2025
            expect(formatMonthForAPI(date)).toBe('202501');
        });
    });

    // ========================================
    // getPERatio
    // ========================================

    describe('getPERatio', () => {
        it('成功回應應正確解析資料', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    stat: 'OK',
                    data: [
                        ['114/01/02', '3.50', '112', '28.50', '6.20', '112/Q4'],
                        ['114/01/03', '3.60', '112', '27.80', '6.10', '112/Q4']
                    ]
                })
            });

            const result = await getPERatio('20250103', '2330');

            expect(result).not.toBeNull();
            expect(result!.date).toBe('114/01/03');
            expect(result!.yield).toBe(3.6);
            expect(result!.pe).toBe(27.8);
            expect(result!.pb).toBe(6.1);
            expect(result!.dividendYear).toBe('112');
            expect(result!.fiscalPeriod).toBe('112/Q4');
        });

        it('取最後一筆資料（最新日期）', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    stat: 'OK',
                    data: [
                        ['114/01/02', '3.50', '112', '28.50', '6.20', '112/Q4'],
                        ['114/01/03', '3.60', '112', '27.80', '6.10', '112/Q4'],
                        ['114/01/06', '3.70', '112', '26.50', '5.90', '112/Q4']
                    ]
                })
            });

            const result = await getPERatio('20250106', '2330');
            expect(result!.date).toBe('114/01/06');
            expect(result!.pe).toBe(26.5);
        });

        it('stat 非 OK 應回傳 null', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ stat: 'FAIL', data: null })
            });

            const result = await getPERatio('20250101', '9999');
            expect(result).toBeNull();
        });

        it('data 為空陣列應回傳 null', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ stat: 'OK', data: [] })
            });

            const result = await getPERatio('20250101', '2330');
            expect(result).toBeNull();
        });

        it('HTTP 錯誤應回傳 null', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

            const result = await getPERatio('20250101', '2330');
            expect(result).toBeNull();
        });

        it('網路錯誤應回傳 null', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await getPERatio('20250101', '2330');
            expect(result).toBeNull();
        });

        it('非數字欄位應回傳 0', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    stat: 'OK',
                    data: [['114/01/02', '-', '112', '-', '-', '112/Q4']]
                })
            });

            const result = await getPERatio('20250102', '2330');
            expect(result!.yield).toBe(0);
            expect(result!.pe).toBe(0);
            expect(result!.pb).toBe(0);
        });
    });

    // ========================================
    // getStockDay
    // ========================================

    describe('getStockDay', () => {
        it('成功回應應正確解析並移除千分位逗號', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    stat: 'OK',
                    data: [
                        ['114/01/02', '25,330,456', '15,200,000,000', '598.0', '605.0', '595.0', '600.0', '+5.00', '32,456']
                    ]
                })
            });

            const result = await getStockDay('202501', '2330');

            expect(result).toHaveLength(1);
            expect(result![0].date).toBe('114/01/02');
            expect(result![0].volume).toBe(25330456);
            expect(result![0].turnover).toBe(15200000000);
            expect(result![0].open).toBe(598.0);
            expect(result![0].high).toBe(605.0);
            expect(result![0].low).toBe(595.0);
            expect(result![0].close).toBe(600.0);
            expect(result![0].change).toBe(5.0);
            expect(result![0].transactions).toBe(32456);
        });

        it('多筆資料應全部轉換', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    stat: 'OK',
                    data: [
                        ['114/01/02', '1,000', '500,000', '100', '105', '99', '103', '+3', '200'],
                        ['114/01/03', '2,000', '600,000', '103', '108', '102', '107', '+4', '300'],
                        ['114/01/06', '1,500', '550,000', '107', '110', '106', '109', '+2', '250']
                    ]
                })
            });

            const result = await getStockDay('202501', '2330');
            expect(result).toHaveLength(3);
            expect(result![2].close).toBe(109);
        });

        it('stat 非 OK 應回傳 null', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ stat: 'FAIL' })
            });

            const result = await getStockDay('202501', '9999');
            expect(result).toBeNull();
        });

        it('HTTP 500 應回傳 null', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

            const result = await getStockDay('202501', '2330');
            expect(result).toBeNull();
        });

        it('fetch 拋出異常應回傳 null', async () => {
            mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

            const result = await getStockDay('202501', '2330');
            expect(result).toBeNull();
        });
    });

    // ========================================
    // getAllPERatios
    // ========================================

    describe('getAllPERatios', () => {
        it('成功回應應正確解析全部股票', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    stat: 'OK',
                    data: [
                        ['2330', '台積電', '3.60', '112', '27.80', '6.10', '112/Q4'],
                        ['2317', '鴻海', '5.20', '112', '12.50', '1.40', '112/Q4']
                    ]
                })
            });

            const result = await getAllPERatios('20250103');

            expect(result).toHaveLength(2);
            expect(result[0].symbol).toBe('2330');
            expect(result[0].name).toBe('台積電');
            expect(result[0].yield).toBe(3.6);
            expect(result[0].pe).toBe(27.8);
            expect(result[0].pb).toBe(6.1);
            expect(result[1].symbol).toBe('2317');
            expect(result[1].pe).toBe(12.5);
        });

        it('stat 非 OK 應回傳空陣列', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ stat: 'FAIL' })
            });

            const result = await getAllPERatios('20250101');
            expect(result).toEqual([]);
        });

        it('HTTP 錯誤應回傳空陣列', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

            const result = await getAllPERatios('20250101');
            expect(result).toEqual([]);
        });

        it('網路斷線應回傳空陣列', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await getAllPERatios('20250101');
            expect(result).toEqual([]);
        });
    });

    // ========================================
    // getDailyQuotes
    // ========================================

    describe('getDailyQuotes', () => {
        it('成功回應應從 tables 中找到個股行情', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    stat: 'OK',
                    tables: [
                        { title: '大盤指數', data: [] },
                        {
                            title: '個股日成交資訊',
                            data: [
                                ['2330', '台積電', '25,330,456', '32,456', '15,200,000,000', '598', '605', '595', '600', '+', '5.00']
                            ]
                        }
                    ]
                })
            });

            const result = await getDailyQuotes('20250103');

            expect(result).toHaveLength(1);
            expect(result[0].symbol).toBe('2330');
            expect(result[0].name).toBe('台積電');
            expect(result[0].volume).toBe(25330456);
            expect(result[0].close).toBe(600);
            expect(result[0].change).toBe('+');
            expect(result[0].changePrice).toBe(5.0);
        });

        it('找不到個股 table 應回傳空陣列', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    stat: 'OK',
                    tables: [{ title: '大盤指數', data: [] }]
                })
            });

            const result = await getDailyQuotes('20250103');
            expect(result).toEqual([]);
        });

        it('stat 非 OK 應回傳空陣列', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ stat: 'FAIL' })
            });

            const result = await getDailyQuotes('20250101');
            expect(result).toEqual([]);
        });

        it('HTTP 錯誤應回傳空陣列', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });

            const result = await getDailyQuotes('20250101');
            expect(result).toEqual([]);
        });

        it('網路錯誤應回傳空陣列', async () => {
            mockFetch.mockRejectedValueOnce(new Error('timeout'));

            const result = await getDailyQuotes('20250101');
            expect(result).toEqual([]);
        });
    });
});
