import { GET } from '../pages/api/ai-report/[symbol].ts';

describe('AI report API route', () => {
    it('should return JSON containing reportSections and suggestedAlerts', async () => {
        const res = await GET({ params: { symbol: '2330' } } as any);
        expect(res).toBeInstanceOf(Response);
        const data = await res.json();
        expect(data).toHaveProperty('reportSections');
        expect(Array.isArray(data.reportSections)).toBe(true);
        expect(data).toHaveProperty('suggestedAlerts');
        expect(Array.isArray(data.suggestedAlerts)).toBe(true);
    });
});