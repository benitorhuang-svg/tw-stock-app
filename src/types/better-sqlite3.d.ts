// Type declarations for better-sqlite3
// This file provides TypeScript typings for the better-sqlite3 module

declare module 'better-sqlite3' {
    interface Database {
        prepare(sql: string): Statement;
        exec(sql: string): void;
        pragma(pragma: string, options?: { simple?: boolean }): Record<string, unknown>;
        close(): void;
        readonly open: boolean;
        readonly name: string;
        readonly memory: boolean;
        readonly readonly: boolean;
        readonly inTransaction: boolean;
        transaction<T extends (...args: unknown[]) => unknown>(fn: T): T;
    }

    interface Statement {
        run(...params: unknown[]): RunResult;
        get<T = Record<string, unknown>>(...params: unknown[]): T | undefined;
        all<T = Record<string, unknown>>(...params: unknown[]): T[];
        iterate<T = Record<string, unknown>>(...params: unknown[]): IterableIterator<T>;
        bind(...params: unknown[]): Statement;
        readonly source: string;
        readonly reader: boolean;
    }

    interface RunResult {
        changes: number;
        lastInsertRowid: number | bigint;
    }

    interface DatabaseConstructor {
        new (filename: string, options?: DatabaseOptions): Database;
        (filename: string, options?: DatabaseOptions): Database;
    }

    interface DatabaseOptions {
        readonly?: boolean;
        fileMustExist?: boolean;
        timeout?: number;
        verbose?: (message?: unknown) => void;
        nativeBinding?: string;
    }

    const Database: DatabaseConstructor;
    export = Database;
}
