#!/usr/bin/env npx tsx
/**
 * 反思引擎 — 定期執行 L2 模式發現 + L3 策略調整
 *
 * Usage:
 *   npx tsx scripts/ml/reflect.ts
 *
 * 建議排程: 每週一次 (盤後)
 */
import { TradeMemory } from './trade-memory.js';
import { TRAIN_CONFIG } from './config.js';

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  TW-Stock Trade Memory — 反思引擎        ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const memory = new TradeMemory();

  // Step 1: Fill outcomes for mature predictions
  console.log('[1/3] Filling trade outcomes...');
  const { filled } = memory.fillOutcomes(TRAIN_CONFIG.forwardDays);
  console.log(`  ${filled} outcomes filled\n`);

  // Step 2: Run L2 pattern discovery
  console.log('[2/3] Running reflection (L2 pattern discovery)...');
  const patterns = memory.runReflection();
  if (patterns.length > 0) {
    console.log('\n  Discovered patterns:');
    for (const p of patterns) {
      const emoji = p.win_rate >= 0.5 ? '🟢' : p.win_rate >= 0.4 ? '🟡' : '🔴';
      console.log(
        `  ${emoji} ${p.pattern_name.padEnd(25)} ` +
        `WR=${(p.win_rate * 100).toFixed(1)}%  ` +
        `Avg=${(p.avg_return * 100).toFixed(2)}%  ` +
        `N=${p.sample_count}`,
      );
    }
  }

  // Step 3: Generate L3 adjustments
  console.log('\n[3/3] Generating strategy adjustments (L3)...');
  const adjCount = memory.generateAdjustments();

  // Summary
  const activeAdj = memory.getActiveAdjustments();
  console.log(`\n  Active adjustments: ${activeAdj.size}`);
  for (const [key, val] of activeAdj) {
    console.log(`    ${key}: scale=${val.scale.toFixed(2)} suppress=${val.suppress}`);
  }

  memory.close();

  console.log('\n✅ Reflection complete.');
  if (adjCount > 0) {
    console.log(`   ${adjCount} new adjustments proposed.`);
    console.log('   Review with: SELECT * FROM strategy_adjustments WHERE status = \'proposed\'');
    console.log('   Approve with: UPDATE strategy_adjustments SET status = \'applied\' WHERE id = <id>');
  }
}

main().catch(err => {
  console.error('Reflection failed:', err);
  process.exit(1);
});
