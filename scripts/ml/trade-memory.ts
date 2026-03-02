/**
 * 交易記憶系統 — 借鏡 TradeMemory Protocol 的三層記憶架構
 *
 * L1 (Hot)  : trade_journal      — 記錄每次模型預測 + 實際結果
 * L2 (Warm) : trade_patterns     — 反思引擎發現的統計模式
 * L3 (Cold) : strategy_adjustments — 基於模式的策略調整規則
 *
 * 概念來源: https://github.com/mnemox-ai/tradememory-protocol
 * 但以 TypeScript + SQLite 原生實作，無需 Python/FastAPI
 */
import Database from 'better-sqlite3';
import { resolve } from 'path';
import { MEMORY_CONFIG, TRAIN_CONFIG, SIGNAL_LABELS, type Signal } from './config.js';

const DB_PATH = resolve(process.cwd(), 'stocks.db');

// ─── Schema ─────────────────────────────────────────────────────

const INIT_SQL = `
-- L1: 交易日誌 (Hot Memory)
CREATE TABLE IF NOT EXISTS trade_journal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    signal_date TEXT NOT NULL,
    signal TEXT NOT NULL CHECK (signal IN ('BUY','HOLD','SELL')),
    confidence REAL NOT NULL,
    features_json TEXT,
    reasoning TEXT,
    outcome_return REAL,
    outcome_date TEXT,
    is_correct INTEGER
);
CREATE INDEX IF NOT EXISTS idx_journal_model ON trade_journal(model_id);
CREATE INDEX IF NOT EXISTS idx_journal_date ON trade_journal(signal_date DESC);

-- L2: 交易模式 (Warm Memory)
CREATE TABLE IF NOT EXISTS trade_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_name TEXT NOT NULL UNIQUE,
    condition_json TEXT NOT NULL,
    signal_type TEXT,
    win_rate REAL,
    avg_return REAL,
    sample_count INTEGER DEFAULT 0,
    discovered_at TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active','deprecated'))
);

-- L3: 策略調整 (Cold Memory)
CREATE TABLE IF NOT EXISTS strategy_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_id INTEGER,
    adjustment_type TEXT NOT NULL,
    adjustment_json TEXT NOT NULL,
    reason TEXT,
    applied_at TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed','approved','applied','rejected')),
    FOREIGN KEY (pattern_id) REFERENCES trade_patterns(id)
);
CREATE INDEX IF NOT EXISTS idx_adj_status ON strategy_adjustments(status);

-- ML 模型後設資料
CREATE TABLE IF NOT EXISTS ml_models (
    model_id TEXT PRIMARY KEY,
    model_name TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    config_json TEXT,
    metrics_json TEXT,
    norm_stats_json TEXT,
    weights_path TEXT
);
`;

// ─── Types ──────────────────────────────────────────────────────

export interface JournalEntry {
  model_id: string;
  symbol: string;
  signal_date: string;
  signal: Signal;
  confidence: number;
  features_json?: string;
  reasoning?: string;
}

export interface DiscoveredPattern {
  pattern_name: string;
  condition_json: string;
  signal_type: string;
  win_rate: number;
  avg_return: number;
  sample_count: number;
}

// ─── Trade Memory Class ─────────────────────────────────────────

export class TradeMemory {
  private db: Database.Database;

  constructor(dbPath = DB_PATH) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(INIT_SQL);
  }

  // ═══════ L1: Trade Journal (Record) ═══════

  recordDecision(entry: JournalEntry): void {
    this.db.prepare(`
      INSERT INTO trade_journal
        (model_id, symbol, signal_date, signal, confidence, features_json, reasoning)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.model_id, entry.symbol, entry.signal_date,
      entry.signal, entry.confidence,
      entry.features_json ?? null, entry.reasoning ?? null,
    );
  }

  /**
   * 回填已過期預測的實際結果
   */
  fillOutcomes(forwardDays: number): { filled: number } {
    const cutoff = `-${forwardDays} days`;
    const pending = this.db.prepare(`
      SELECT j.id, j.symbol, j.signal_date, j.signal
      FROM trade_journal j
      WHERE j.outcome_return IS NULL
        AND j.signal_date <= date('now', ?)
    `).all(cutoff) as any[];

    let filled = 0;
    const update = this.db.prepare(`
      UPDATE trade_journal
      SET outcome_return = ?, outcome_date = ?, is_correct = ?
      WHERE id = ?
    `);

    const getEntry = this.db.prepare(`
      SELECT close FROM price_history
      WHERE symbol = ? AND date >= ? ORDER BY date ASC LIMIT 1
    `);
    const getOutcome = this.db.prepare(`
      SELECT date, close FROM price_history
      WHERE symbol = ? AND date > ?
      ORDER BY date ASC LIMIT 1 OFFSET ?
    `);

    const tx = this.db.transaction(() => {
      for (const entry of pending) {
        const entryRow = getEntry.get(entry.symbol, entry.signal_date) as any;
        const outcomeRow = getOutcome.get(entry.symbol, entry.signal_date, forwardDays - 1) as any;

        if (!entryRow?.close || !outcomeRow?.close) continue;

        const ret = (outcomeRow.close - entryRow.close) / entryRow.close;
        const isCorrect =
          (entry.signal === 'BUY'  && ret > 0) ||
          (entry.signal === 'SELL' && ret < 0) ||
          (entry.signal === 'HOLD' && Math.abs(ret) < 0.03) ? 1 : 0;

        update.run(ret, outcomeRow.date, isCorrect, entry.id);
        filled++;
      }
    });
    tx();
    return { filled };
  }

  // ═══════ L2: Pattern Discovery (Reflect) ═══════

  /**
   * 反思引擎 — 分析已完成的交易日誌，發現統計模式
   */
  runReflection(): DiscoveredPattern[] {
    const trades = this.db.prepare(`
      SELECT signal, confidence, outcome_return, is_correct, features_json
      FROM trade_journal
      WHERE outcome_return IS NOT NULL
      ORDER BY signal_date DESC
      LIMIT 2000
    `).all() as any[];

    if (trades.length < MEMORY_CONFIG.minSamplesForPattern) {
      console.log(`[Reflect] Only ${trades.length} completed trades, need >= ${MEMORY_CONFIG.minSamplesForPattern}`);
      return [];
    }

    const patterns: DiscoveredPattern[] = [];

    // ── Pattern 1: 各信號類型的整體表現 ──
    for (const sig of ['BUY', 'SELL'] as Signal[]) {
      const subset = trades.filter(t => t.signal === sig);
      if (subset.length < MEMORY_CONFIG.minSamplesForPattern) continue;

      const correct = subset.filter(t => t.is_correct === 1).length;
      const winRate = correct / subset.length;
      const avgReturn = subset.reduce((s: number, t: any) => s + t.outcome_return, 0) / subset.length;

      patterns.push({
        pattern_name: `${sig}_baseline`,
        condition_json: JSON.stringify({ signal: sig }),
        signal_type: sig,
        win_rate: winRate,
        avg_return: avgReturn,
        sample_count: subset.length,
      });
    }

    // ── Pattern 2: 高信心 vs 低信心預測表現 ──
    for (const sig of ['BUY', 'SELL'] as Signal[]) {
      const subset = trades.filter(t => t.signal === sig);

      const hiConf = subset.filter(t => t.confidence >= 0.7);
      const loConf = subset.filter(t => t.confidence < 0.5);

      if (hiConf.length >= MEMORY_CONFIG.minSamplesForPattern) {
        const wr = hiConf.filter((t: any) => t.is_correct === 1).length / hiConf.length;
        patterns.push({
          pattern_name: `${sig}_high_confidence`,
          condition_json: JSON.stringify({ signal: sig, confidence_min: 0.7 }),
          signal_type: sig,
          win_rate: wr,
          avg_return: hiConf.reduce((s: number, t: any) => s + t.outcome_return, 0) / hiConf.length,
          sample_count: hiConf.length,
        });
      }

      if (loConf.length >= MEMORY_CONFIG.minSamplesForPattern) {
        const wr = loConf.filter((t: any) => t.is_correct === 1).length / loConf.length;
        patterns.push({
          pattern_name: `${sig}_low_confidence`,
          condition_json: JSON.stringify({ signal: sig, confidence_max: 0.5 }),
          signal_type: sig,
          win_rate: wr,
          avg_return: loConf.reduce((s: number, t: any) => s + t.outcome_return, 0) / loConf.length,
          sample_count: loConf.length,
        });
      }
    }

    // ── Pattern 3: 特徵條件下的表現 ──
    for (const sig of ['BUY'] as Signal[]) {
      const withFeats = trades.filter(t => t.signal === sig && t.features_json);

      // RSI 過熱時 BUY 表現
      const rsiHigh = withFeats.filter(t => {
        try {
          const f = JSON.parse(t.features_json);
          return (f.rsi14 ?? 0) > 0.7;
        } catch { return false; }
      });

      if (rsiHigh.length >= MEMORY_CONFIG.minSamplesForPattern) {
        const wr = rsiHigh.filter((t: any) => t.is_correct === 1).length / rsiHigh.length;
        patterns.push({
          pattern_name: `${sig}_rsi_overbought`,
          condition_json: JSON.stringify({ signal: sig, rsi14_min: 0.7 }),
          signal_type: sig,
          win_rate: wr,
          avg_return: rsiHigh.reduce((s: number, t: any) => s + t.outcome_return, 0) / rsiHigh.length,
          sample_count: rsiHigh.length,
        });
      }
    }

    // ── 寫入 L2 ──
    const upsert = this.db.prepare(`
      INSERT INTO trade_patterns
        (pattern_name, condition_json, signal_type, win_rate, avg_return, sample_count, discovered_at, status)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 'active')
      ON CONFLICT(pattern_name) DO UPDATE SET
        win_rate = excluded.win_rate,
        avg_return = excluded.avg_return,
        sample_count = excluded.sample_count,
        discovered_at = excluded.discovered_at
    `);
    const tx = this.db.transaction(() => {
      for (const p of patterns) {
        upsert.run(p.pattern_name, p.condition_json, p.signal_type,
                    p.win_rate, p.avg_return, p.sample_count);
      }
    });
    tx();

    console.log(`[Reflect] Discovered ${patterns.length} patterns`);
    return patterns;
  }

  // ═══════ L3: Strategy Adjustments (Learn) ═══════

  /**
   * 基於 L2 模式自動產生策略調整建議
   */
  generateAdjustments(): number {
    const patterns = this.db.prepare(`
      SELECT * FROM trade_patterns WHERE status = 'active'
    `).all() as any[];

    const insert = this.db.prepare(`
      INSERT INTO strategy_adjustments
        (pattern_id, adjustment_type, adjustment_json, reason, status)
      VALUES (?, ?, ?, ?, 'proposed')
    `);

    let count = 0;
    const tx = this.db.transaction(() => {
      for (const p of patterns) {
        // 低勝率 → 降低信心
        if (p.win_rate < MEMORY_CONFIG.patternWinRateThreshold &&
            p.sample_count >= MEMORY_CONFIG.minSamplesForPattern) {
          const scale = Math.max(MEMORY_CONFIG.confidenceScaleMin,
                                  p.win_rate / MEMORY_CONFIG.patternWinRateThreshold);
          insert.run(
            p.id,
            'confidence_scale',
            JSON.stringify({ scale: +scale.toFixed(2) }),
            `Pattern '${p.pattern_name}' win rate ${(p.win_rate * 100).toFixed(1)}% < ${MEMORY_CONFIG.patternWinRateThreshold * 100}% threshold`,
          );
          count++;
        }

        // 高負期望值 → 建議停用信號
        if (p.avg_return < -0.02 &&
            p.sample_count >= MEMORY_CONFIG.minSamplesForPattern * 2) {
          insert.run(
            p.id,
            'signal_suppress',
            JSON.stringify({ suppress: true }),
            `Pattern '${p.pattern_name}' avg return ${(p.avg_return * 100).toFixed(2)}% is strongly negative`,
          );
          count++;
        }
      }
    });
    tx();
    console.log(`[L3] Generated ${count} adjustment proposals`);
    return count;
  }

  /**
   * 取得所有已生效的調整 (用於預測時即時套用)
   */
  getActiveAdjustments(): Map<string, { scale: number; suppress: boolean }> {
    const rows = this.db.prepare(`
      SELECT p.pattern_name, p.condition_json, a.adjustment_type, a.adjustment_json
      FROM strategy_adjustments a
      JOIN trade_patterns p ON a.pattern_id = p.id
      WHERE a.status = 'applied'
    `).all() as any[];

    const map = new Map<string, { scale: number; suppress: boolean }>();
    for (const r of rows) {
      try {
        const cond = JSON.parse(r.condition_json);
        const adj  = JSON.parse(r.adjustment_json);
        const key  = cond.signal || 'all';

        const existing = map.get(key) || { scale: 1.0, suppress: false };
        if (r.adjustment_type === 'confidence_scale') {
          existing.scale = Math.min(existing.scale, adj.scale ?? 1.0);
        }
        if (r.adjustment_type === 'signal_suppress') {
          existing.suppress = adj.suppress ?? false;
        }
        map.set(key, existing);
      } catch { /* skip malformed */ }
    }
    return map;
  }

  // ═══════ Model Registry ═══════

  registerModel(
    modelId: string,
    modelName: string,
    config: object,
    metrics: object,
    normStats: object,
    weightsPath: string,
  ): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO ml_models
        (model_id, model_name, version, created_at, config_json, metrics_json, norm_stats_json, weights_path)
      VALUES (?, ?, COALESCE((SELECT version FROM ml_models WHERE model_id = ?), 0) + 1,
              datetime('now'), ?, ?, ?, ?)
    `).run(
      modelId, modelName, modelId,
      JSON.stringify(config), JSON.stringify(metrics),
      JSON.stringify(normStats), weightsPath,
    );
  }

  getModelMeta(modelId: string): { norm_stats_json: string; weights_path: string } | null {
    return this.db.prepare(`
      SELECT norm_stats_json, weights_path FROM ml_models WHERE model_id = ?
    `).get(modelId) as any ?? null;
  }

  // ═══════ Lifecycle ═══════

  close(): void {
    this.db.close();
  }
}
