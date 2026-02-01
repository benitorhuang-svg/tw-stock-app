// sql.js 類型定義
declare module 'sql.js' {
    export interface Database {
        run(sql: string, params?: any[]): void;
        exec(sql: string, params?: any[]): QueryExecResult[];
        prepare(sql: string): Statement;
        export(): Uint8Array;
        close(): void;
        getRowsModified(): number;
    }

    export interface Statement {
        run(params?: any[]): void;
        free(): void;
    }

    export interface QueryExecResult {
        columns: string[];
        values: any[][];
    }

    export interface SqlJsStatic {
        Database: new (data?: ArrayLike<number>) => Database;
    }

    export interface InitSqlJsOptions {
        locateFile?: (file: string) => string;
    }

    export default function initSqlJs(options?: InitSqlJsOptions): Promise<SqlJsStatic>;
}
