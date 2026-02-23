// Type declarations for better-sqlite3
// This file provides TypeScript typings for the better-sqlite3 module

declare module 'better-sqlite3' {
    interface Database {
        prepare(sql: string): Statement;
        exec(sql: string): void;
        pragma(pragma: string, options?: { simple?: boolean }): any;
        close(): void;
        readonly open: boolean;
        readonly name: string;
        readonly memory: boolean;
        readonly readonly: boolean;
        readonly inTransaction: boolean;
        transaction<T extends (...args: any[]) => any>(fn: T): T;
    }

    interface Statement {
        run(...params: any[]): RunResult;
        get(...params: any[]): any;
        all(...params: any[]): any[];
        iterate(...params: any[]): IterableIterator<any>;
        bind(...params: any[]): Statement;
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
        verbose?: (message?: any) => void;
        nativeBinding?: string;
    }

    const Database: DatabaseConstructor;
    export = Database;
}
