/**
 * M2: LLM Client
 * 封裝對 AI API (如 Gemini / OpenAI) 的呼叫
 */
export class LlmClient {
    private apiKey: string;

    constructor() {
        // 從環境變數讀取
        this.apiKey = process.env.AI_API_KEY || '';
    }

    /**
     * T007: 送出請求並獲取分析結果
     */
    public async getCompletion(prompt: string): Promise<string> {
        if (!this.apiKey) {
            console.warn('[LlmClient] No API key found, returning mock response.');
            return '目前尚未配置 AI API Key，無法產生即時分析。請在環境變數中設定 AI_API_KEY。';
        }

        try {
            // 範例使用 fetch 呼叫通用介面
            const response = await fetch('https://api.example.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [{ role: 'user', content: prompt }],
                }),
            });

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (err: any) {
            throw new Error(`AI Request Failed: ${err.message}`);
        }
    }
}

export const llmClient = new LlmClient();
