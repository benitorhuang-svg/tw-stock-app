#!/usr/bin/env npx tsx
/**
 * Transformer 選股模型 — 訓練腳本
 *
 * Usage:
 *   npx tsx scripts/ml/train.ts
 *   npx tsx scripts/ml/train.ts --start 2024-01-01 --end 2026-01-31
 */
import { resolve } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { buildTrainingDataset } from './feature-engineer.js';
import { loadTF, buildModel, compileModel, saveModel } from './transformer.js';
import { TradeMemory } from './trade-memory.js';
import { MODEL_CONFIG, TRAIN_CONFIG } from './config.js';

// ─── CLI Args ───────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let startDate = '2024-01-01';
  let endDate   = '2026-01-31';
  let modelId   = 'transformer_v1';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start' && args[i + 1])  startDate = args[++i];
    if (args[i] === '--end'   && args[i + 1])  endDate   = args[++i];
    if (args[i] === '--model' && args[i + 1])  modelId   = args[++i];
  }
  return { startDate, endDate, modelId };
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  const { startDate, endDate, modelId } = parseArgs();
  const modelDir = resolve(process.cwd(), 'models', modelId);

  console.log('╔══════════════════════════════════════════╗');
  console.log('║  TW-Stock Transformer 選股模型 — 訓練    ║');
  console.log('╚══════════════════════════════════════════╝\n');
  console.log(`  Period : ${startDate} → ${endDate}`);
  console.log(`  Model  : ${modelId}`);
  console.log(`  Config : seqLen=${MODEL_CONFIG.seqLen}, d=${MODEL_CONFIG.dModel}, heads=${MODEL_CONFIG.nHeads}, layers=${MODEL_CONFIG.nLayers}\n`);

  // 1. Load TensorFlow
  const tf = await loadTF();

  // 2. Build dataset
  console.log('[1/5] Extracting features from stocks.db...');
  const data = buildTrainingDataset(startDate, endDate);
  if (data.X.length === 0) {
    console.error('No training data found. Run ETL first: npm run build-db');
    process.exit(1);
  }

  // 3. Convert to tensors
  console.log('[2/5] Creating tensors...');
  const xAll = tf.tensor3d(data.X);
  const yAll = tf.oneHot(tf.tensor1d(data.y, 'int32'), MODEL_CONFIG.numClasses);
  console.log(`  X: [${xAll.shape.join(', ')}]  y: [${yAll.shape.join(', ')}]`);

  // 4. Build & compile model
  console.log('[3/5] Building Transformer model...');
  const model = buildModel(MODEL_CONFIG);
  compileModel(model, TRAIN_CONFIG.learningRate);
  model.summary();

  // 5. Train
  console.log('[4/5] Training...');
  const history = await model.fit(xAll, yAll, {
    epochs: TRAIN_CONFIG.epochs,
    batchSize: TRAIN_CONFIG.batchSize,
    validationSplit: TRAIN_CONFIG.validationSplit,
    shuffle: true,
    callbacks: [
      tf.callbacks.earlyStopping({
        monitor: 'val_loss',
        patience: TRAIN_CONFIG.earlyStoppingPatience,
      }),
      {
        onEpochEnd: (epoch: number, logs: any) => {
          if (epoch % 5 === 0 || epoch === TRAIN_CONFIG.epochs - 1) {
            console.log(
              `  Epoch ${String(epoch + 1).padStart(3)}: ` +
              `loss=${logs.loss.toFixed(4)} acc=${(logs.acc * 100).toFixed(1)}% ` +
              `val_loss=${logs.val_loss.toFixed(4)} val_acc=${(logs.val_acc * 100).toFixed(1)}%`
            );
          }
        },
      },
    ],
  });

  // 6. Save
  console.log('[5/5] Saving model...');
  mkdirSync(modelDir, { recursive: true });
  await saveModel(model, modelDir);

  // Save norm stats
  writeFileSync(
    resolve(modelDir, 'norm_stats.json'),
    JSON.stringify(data.stats, null, 2),
  );

  // Save training config
  writeFileSync(
    resolve(modelDir, 'train_config.json'),
    JSON.stringify({
      modelConfig: MODEL_CONFIG,
      trainConfig: TRAIN_CONFIG,
      dataRange: { startDate, endDate },
      samples: data.X.length,
      labelDistribution: {
        SELL: data.y.filter(l => l === 0).length,
        HOLD: data.y.filter(l => l === 1).length,
        BUY:  data.y.filter(l => l === 2).length,
      },
    }, null, 2),
  );

  // Register in trade memory
  const finalAcc    = history.history.acc?.slice(-1)[0] as number;
  const finalValAcc = history.history.val_acc?.slice(-1)[0] as number;
  const finalLoss   = history.history.loss?.slice(-1)[0] as number;

  const memory = new TradeMemory();
  memory.registerModel(
    modelId,
    'Transformer Stock Selection',
    MODEL_CONFIG,
    { accuracy: finalAcc, val_accuracy: finalValAcc, loss: finalLoss, epochs: history.epoch.length },
    data.stats,
    modelDir,
  );
  memory.close();

  // Cleanup
  xAll.dispose();
  yAll.dispose();

  console.log('\n╔══════════════════════════════════════════╗');
  console.log(`║  ✅ Training complete                     ║`);
  console.log(`║  Accuracy    : ${(finalAcc * 100).toFixed(1)}%`.padEnd(44) + '║');
  console.log(`║  Val Accuracy: ${(finalValAcc * 100).toFixed(1)}%`.padEnd(44) + '║');
  console.log(`║  Epochs      : ${history.epoch.length}`.padEnd(44) + '║');
  console.log(`║  Saved to    : models/${modelId}/`.padEnd(44) + '║');
  console.log('╚══════════════════════════════════════════╝');
}

main().catch(err => {
  console.error('Training failed:', err);
  process.exit(1);
});
