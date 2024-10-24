import { OkPacket, RowDataPacket } from 'mysql2';
import PoolConnection from 'mysql2/typings/mysql/lib/PoolConnection';
import { SQLStatement } from 'sql-template-strings';

declare type Type = "Writer" | "Reader";

declare interface ConnectionOpts {
  host: string,
  writerHost?: string,
  readerHost?: string,
  user: string,
  password: string,
  database: string,
  port?: number,
  connectionLimit?: number,
  connectionName?: string,
  type?: Type,
  timeout?: number,
}

declare class ConnectionPool {
  constructor(...opts: ConnectionOpts[])

  beginTransaction(name?: string): Promise<PoolConnection>
  query<T extends RowDataPacket[] | OkPacket[] | OkPacket | object[]>(connection: PoolConnection, sql: SQLStatement): Promise<T>;
  query<T extends RowDataPacket[] | OkPacket[] | OkPacket | object[]>(connection: PoolConnection, sql: string, values: any[]): Promise<T>;
  commit(connection: PoolConnection): Promise<PoolConnection>

  writerQuery<T extends RowDataPacket[] | OkPacket[] | OkPacket | object[]>(sqlStatement: SQLStatement): Promise<T>;
  writerQuery<T extends RowDataPacket[] | OkPacket[] | OkPacket | object[]>(name: string, query: SQLStatement): Promise<T>;
  writerQuery<T extends RowDataPacket[] | OkPacket[] | OkPacket | object[]>(sql: string, values: any[]): Promise<T>;
  writerQuery<T extends RowDataPacket[] | OkPacket[] | OkPacket | object[]>(name: string, sql: string, values: any[]): Promise<T>;

  readerQuerySingle<T>(...args: any[]): Promise<T | undefined>;
  readerQuery<T extends RowDataPacket[] | object[]>(sqlStatement: SQLStatement): Promise<T>;
  readerQuery<T extends RowDataPacket[] | object[]>(name: string, query: SQLStatement): Promise<T>;
  readerQuery<T extends RowDataPacket[] | object[]>(sql: string, values: any[]): Promise<T>;
  readerQuery<T extends RowDataPacket[] | object[]>(name: string, sql: string, values: any[]): Promise<T>;

}

export default ConnectionPool;