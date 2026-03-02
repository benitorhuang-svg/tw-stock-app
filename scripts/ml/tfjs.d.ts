/**
 * Ambient module declarations for TensorFlow.js
 *
 * @tensorflow/tfjs-node is a heavy native dependency — these shims
 * let TypeScript resolve the imports without requiring the package
 * to be installed locally. The actual modules are loaded dynamically
 * at runtime via loadTF() in transformer.ts.
 */
declare module '@tensorflow/tfjs-node' {
  export interface Tensor<R extends Rank = Rank> {
    shape: number[];
    dtype: string;
    rank: number;
    array(): Promise<any>;
    data(): Promise<Float32Array>;
    dataSync(): Float32Array;
    dispose(): void;
    print(): void;
  }

  export type Rank = 'R0' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6';
  export type Shape = (number | null)[];

  export interface LayersModel {
    predict(inputs: Tensor | Tensor[], config?: any): Tensor | Tensor[];
    fit(x: Tensor, y: Tensor, config?: any): Promise<any>;
    compile(config: any): void;
    save(pathOrIOHandler: string): Promise<any>;
    summary(): void;
    getWeights(): Tensor[];
    inputs: any[];
    outputs: any[];
  }

  export namespace serialization {
    function registerClass(cls: any): void;
  }

  // Tensor creation
  export function tensor(values: any, shape?: number[], dtype?: string): Tensor;
  export function tensor1d(values: any, dtype?: string): Tensor;
  export function tensor2d(values: any, shape?: number[], dtype?: string): Tensor;
  export function tensor3d(values: any, shape?: number[], dtype?: string): Tensor;
  export function scalar(value: number, dtype?: string): Tensor;
  export function oneHot(indices: Tensor, depth: number): Tensor;
  export function fill(shape: number[], value: number, dtype?: string): Tensor;
  export function zeros(shape: number[], dtype?: string): Tensor;
  export function ones(shape: number[], dtype?: string): Tensor;
  export function expandDims(x: Tensor, axis?: number): Tensor;
  export function reshape(x: Tensor, shape: number[]): Tensor;
  export function concat(tensors: Tensor[], axis?: number): Tensor;
  export function split(x: Tensor, numOrSizeSplits: number | number[], axis?: number): Tensor[];
  export function stack(tensors: Tensor[], axis?: number): Tensor;

  // Math ops
  export function mul(a: Tensor, b: Tensor): Tensor;
  export function add(a: Tensor, b: Tensor): Tensor;
  export function sub(a: Tensor, b: Tensor): Tensor;
  export function div(a: Tensor, b: Tensor): Tensor;
  export function matMul(a: Tensor, b: Tensor, transposeA?: boolean, transposeB?: boolean): Tensor;
  export function softmax(x: Tensor, axis?: number): Tensor;
  export function sqrt(x: Tensor): Tensor;

  // Utility
  export function tidy<T>(fn: () => T): T;
  export function dispose(tensors: any): void;
  export function ready(): Promise<void>;
  export function input(config: { shape: number[]; name?: string; dtype?: string }): any;
  export function model(config: { inputs: any; outputs: any }): LayersModel;
  export function loadLayersModel(pathOrIOHandler: string): Promise<LayersModel>;

  export const layers: {
    dense(config: any): any;
    dropout(config: any): any;
    globalAveragePooling1d(config?: any): any;
    layerNormalization(config?: any): any;
    add(config?: any): any;
    reshape(config: any): any;
    softmax(config?: any): any;
    [key: string]: (...args: any[]) => any;
  };

  export const train: {
    adam(lr: number): any;
    sgd(lr: number): any;
    [key: string]: (...args: any[]) => any;
  };

  export const callbacks: {
    earlyStopping(config: any): any;
  };
}

declare module '@tensorflow/tfjs' {
  export * from '@tensorflow/tfjs-node';
}
