import mysql, { OkPacket, RowDataPacket } from 'mysql2';
import PoolCluster from 'mysql2/typings/mysql/lib/PoolCluster';
import PoolConnection from 'mysql2/typings/mysql/lib/PoolConnection';
import { SQLStatement } from "sql-template-strings";

export type Type = "Writer" | "Reader";

export interface ConnectionOpts {
  connectionName?: string,
  host: string,
  writerHost?: string,
  readerHost?: string,
  user: string,
  password: string,
  database: string,
  port?: number,
  connectionLimit?: number,
  type?: Type,
  timeout?: number,
}

class ConnectionPool {
  private readonly poolCluster: PoolCluster;
  private readerList: Map<string, ConnectionOpts> = new Map();
  private writerList: Map<string, ConnectionOpts> = new Map();

  constructor(...opts: ConnectionOpts[]) {
    // @ts-ignore
    this.poolCluster = mysql.createPoolCluster({ defaultSelector: 'ORDER', multipleStatements: true });

    opts.forEach(opt => {
      if (opt.type) {
        if (opt.type == 'Writer') {
          this.writerList.set(String(opt.connectionName), { ...{ port: 3306, connectionLimit: 150, timeout: 90 * 1000 }, ...opt })
        } else {
          this.readerList.set(String(opt.connectionName), { ...{ port: 3306, connectionLimit: 150, timeout: 90 * 1000, type: 'Reader' }, ...opt })
        }
      } else {
        if (opt.writerHost) {
          this.writerList.set(String(opt.connectionName), { ...{ port: 3306, connectionLimit: 150, timeout: 90 * 1000 }, ...opt, ...{ host: opt.writerHost } })
        }
        if (opt.readerHost) {
          this.readerList.set(String(opt.connectionName), { ...{ port: 3306, connectionLimit: 150, timeout: 90 * 1000, type: 'Reader' }, ...opt, ...{ host: opt.readerHost } })
        } else {
          this.readerList.set(String(opt.connectionName), { ...{ port: 3306, connectionLimit: 150, timeout: 90 * 1000, type: 'Reader' }, ...opt })
        }
      }
    })

    Array.from(this.writerList.keys()).forEach(connectionName => {
      const opt = this.writerList.get(connectionName)
      if (opt) {
        this.poolCluster.add(`Writer:${connectionName}`, {
          // @ts-ignore
          host: opt.host,
          user: opt.user,
          password: opt.password,
          port: opt.port,
          database: opt.database,
          connectionLimit: opt.connectionLimit,
          multipleStatements: true
        });
      }
    })

    Array.from(this.readerList.keys()).forEach(connectionName => {
      const opt = this.readerList.get(connectionName)
      if (opt) {
        this.poolCluster.add(`Reader:${connectionName}`, {
          // @ts-ignore
          host: opt.host,
          user: opt.user,
          password: opt.password,
          port: opt.port,
          database: opt.database,
          connectionLimit: opt.connectionLimit,
          multipleStatements: true
        });
      }
    })
  }

  async getConnection(name?: string, type: Type = 'Reader'): Promise<PoolConnection> {
    return new Promise((resolve, reject) => {
      if (name == undefined) {
        const readerNameList = Array.from(this.readerList.keys());
        const writerNameList = Array.from(this.writerList.keys());
        name = readerNameList.length > 0 ? readerNameList[0] : (writerNameList.length > 0 ? writerNameList[0] : undefined)
      }
      if (name) {
        if (type == 'Reader') {
          if (this.readerList.get(name)) {
            this.poolCluster.getConnection(`Reader:${name}`, (err, con) => {
              if (err) {
                reject(err)
              } else {
                resolve(con)
              }
            })
          } else if (this.writerList.get(name)) {
            this.poolCluster.getConnection(`Writer:${name}`, (err, con) => {
              if (err) {
                reject(err)
              } else {
                resolve(con)
              }
            })
          } else {
            reject("Invalid Name")
          }
        } else if (type == 'Writer') {
          if (this.writerList.get(name)) {
            this.poolCluster.getConnection(`Writer:${name}`, (err, con) => {
              if (err) {
                reject(err)
              } else {
                resolve(con)
              }
            })
          } else {
            reject("Invalid Name")
          }
        }
      } else {
        reject("No Has Connection")
      }
    })
  }

  getConnectionOpts(name?: string, type: Type = 'Reader'): ConnectionOpts | undefined {
    if (name == undefined) {
      const readerNameList = Array.from(this.readerList.keys());
      const writerNameList = Array.from(this.writerList.keys());
      name = readerNameList.length > 0 ? readerNameList[0] : (writerNameList.length > 0 ? writerNameList[0] : undefined)
    }
    if (name) {
      if (type == 'Reader') {
        if (this.readerList.get(name)) {
          return this.readerList.get(name);
        } else if (this.writerList.get(name)) {
          return this.writerList.get(name);
        } else {
          return undefined;
        }
      } else if (type == 'Writer') {
        if (this.writerList.get(name)) {
          return this.writerList.get(name);
        } else {
          return undefined;
        }
      }
    } else {
      return undefined;
    }
  }

  async readerQuerySingle<T extends object>(...args: any[]): Promise<T | undefined> {
    const results = await this.readerQuery<object[]>(...args)
    if (results.length > 0) {
      return (results[0] as T)
    } else {
      return undefined
    }
  }

  async readerQuery<T extends RowDataPacket[] | object[]>(...args: any[]): Promise<T> {
    if (typeof args[0] == 'string' && args[1] instanceof SQLStatement && args[2] === undefined) {
      // Name, SQLStatement
      return this.readerQueryNameWithSQLStatement<T>(args[0], args[1]);
    } else if (args[0] instanceof SQLStatement && args[1] === undefined && args[2] === undefined) {
      // No Name (readerList[0]), SQLStatement
      return this.readerQueryNoNameWithSQLStatement<T>(args[0]);
    } else if (typeof args[0] == 'string' && typeof args[1] == 'string' && args[2] instanceof Array) {
      // Name, Sql, Values
      return this.readerQueryNameWithSqlAndValues<T>(args[0], args[1], args[2]);
    } else if (typeof args[0] == 'string' && args[1] instanceof Array && args[2] === undefined) {
      // No Name (readerList[0]), Sql, values
      return this.readerQueryNoNameWithSqlAndValues<T>(args[0], args[1]);
    } else {
      return {} as T;
    }
  }

  private async readerQueryNameWithSQLStatement<T extends RowDataPacket[] | object[]>(name: string, query: SQLStatement): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.getConnection(name, 'Reader').then(connection => {
        connection.beginTransaction((beginTxError) => {
          if (beginTxError) {
            connection.release();
            reject(beginTxError);
          }
          connection.query(query, (queryError, result, field) => {
            if (queryError) {
              connection.rollback(() => {
                connection.release();
                reject(queryError);
              });
            } else {
              connection.commit((err) => {
                connection.release();
                if (err) {
                  reject(err)
                }
                resolve(result as T);
              });
            }
          });
        });

      }).catch((e) => {
        return reject(new Error("No has Connection"))
      });

      const opts = this.getConnectionOpts(name, 'Reader');
      setTimeout(() => {
        reject(new Error('Query Timeout'));
      }, (opts && opts.timeout ? opts.timeout : 90 * 1000));
    });
  }

  private async readerQueryNoNameWithSQLStatement<T extends RowDataPacket[] | object[]>(query: SQLStatement): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.getConnection(undefined, 'Reader').then(connection => {
        connection.beginTransaction((beginTxError) => {
          if (beginTxError) {
            connection.release();
            reject(beginTxError);
          }
          connection.query(query, (queryError, result, field) => {
            if (queryError) {
              connection.rollback(() => {
                connection.release();
                reject(queryError);
              });
            } else {
              connection.commit((err) => {
                connection.release();
                if (err) {
                  reject(err)
                }
                resolve(result as T);
              });
            }
          });
        });
      }).catch((e) => {
        return reject(new Error("No has Connection"))
      });

      const opts = this.getConnectionOpts(undefined, 'Reader');
      setTimeout(() => {
        reject(new Error('Query Timeout'));
      }, (opts && opts.timeout ? opts.timeout : 90 * 1000));
    });
  }

  private async readerQueryNameWithSqlAndValues<T extends RowDataPacket[] | object[]>(name: string, query: string, values: any[]): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.getConnection(name, 'Reader').then(connection => {
        connection.beginTransaction((beginTxError) => {
          if (beginTxError) {
            connection.release();
            reject(beginTxError);
          }
          connection.query(query, values, (queryError, result, field) => {
            if (queryError) {
              connection.rollback(() => {
                connection.release();
                reject(queryError);
              });
            } else {
              connection.commit((err) => {
                connection.release();
                if (err) {
                  reject(err)
                }
                resolve(result as T);
              });
            }
          });
        });
      }).catch((e) => {
        return reject(new Error("No has Connection"))
      });

      const opts = this.getConnectionOpts(name, 'Reader');
      setTimeout(() => {
        reject(new Error('Query Timeout'));
      }, (opts && opts.timeout ? opts.timeout : 90 * 1000));
    });
  }

  private async readerQueryNoNameWithSqlAndValues<T extends RowDataPacket[] | object[]>(query: string, values: any[]): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.getConnection(undefined, 'Reader').then(connection => {
        connection.beginTransaction((beginTxError) => {
          if (beginTxError) {
            connection.release();
            reject(beginTxError);
          }
          connection.query(query, values, (queryError, result, field) => {
            if (queryError) {
              connection.rollback(() => {
                connection.release();
                reject(queryError);
              });
            } else {
              connection.commit((err) => {
                connection.release();
                if (err) {
                  reject(err)
                }
                resolve(result as T);
              });
            }
          });
        });
      }).catch((e) => {
        return reject(new Error("No has Connection"))
      });

      const opts = this.getConnectionOpts(undefined, 'Reader');
      setTimeout(() => {
        reject(new Error('Query Timeout'));
      }, (opts && opts.timeout ? opts.timeout : 90 * 1000));
    });
  }

  async writerQuery<T extends RowDataPacket[] | OkPacket[] | OkPacket | object[]>(...args: any[]): Promise<T> {
    if (typeof args[0] == 'string' && args[1] instanceof SQLStatement && args[2] === undefined) {
      // Name, SQLStatement
      return this.writerQueryNameWithSQLStatement<T>(args[0], args[1]);
    } else if (args[0] instanceof SQLStatement && args[1] === undefined && args[2] === undefined) {
      // No Name (readerList[0]), SQLStatement
      return this.writerQueryNoNameWithSQLStatement<T>(args[0]);
    } else if (typeof args[0] == 'string' && typeof args[1] == 'string' && args[2] instanceof Array) {
      // Name, Sql, Values
      return this.writerQueryNameWithSqlAndValues<T>(args[0], args[1], args[2]);
    } else if (typeof args[0] == 'string' && args[1] instanceof Array && args[2] === undefined) {
      // No Name (readerList[0]), Sql, values
      return this.writerQueryNoNameWithSqlAndValues<T>(args[0], args[1]);
    } else {
      return {} as T;
    }
  }

  private async writerQueryNameWithSQLStatement<T extends RowDataPacket[] | OkPacket[] | OkPacket | object[]>(name: string, query: SQLStatement): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.getConnection(name, 'Writer').then(connection => {
        connection.beginTransaction((beginTxError) => {
          if (beginTxError) {
            connection.release();
            reject(beginTxError);
          }
          connection.query(query, (queryError, result, field) => {
            if (queryError) {
              connection.rollback(() => {
                connection.release();
                reject(queryError);
              });
            } else {
              connection.commit((err) => {
                connection.release();
                if (err) {
                  reject(err)
                }
                resolve(result as T);
              });
            }
          });
        });
      }).catch((e) => {
        return reject(new Error("No has Connection"))
      });

      const opts = this.getConnectionOpts(name, 'Writer');
      setTimeout(() => {
        reject(new Error('Query Timeout'));
      }, (opts && opts.timeout ? opts.timeout : 90 * 1000));
    });
  }

  private async writerQueryNoNameWithSQLStatement<T extends RowDataPacket[] | OkPacket[] | OkPacket | object[]>(query: SQLStatement): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.getConnection(undefined, 'Writer').then(connection => {
        connection.beginTransaction((beginTxError) => {
          if (beginTxError) {
            connection.release();
            reject(beginTxError);
          }
          connection.query(query, (queryError, result, field) => {
            if (queryError) {
              connection.rollback(() => {
                connection.release();
                reject(queryError);
              });
            } else {
              connection.commit((err) => {
                connection.release();
                if (err) {
                  reject(err)
                }
                resolve(result as T);
              });
            }
          });
        });
      }).catch((e) => {
        return reject(new Error("No has Connection"))
      });

      const opts = this.getConnectionOpts(undefined, 'Writer');
      setTimeout(() => {
        reject(new Error('Query Timeout'));
      }, (opts && opts.timeout ? opts.timeout : 90 * 1000));
    });
  }

  private async writerQueryNameWithSqlAndValues<T extends RowDataPacket[] | OkPacket[] | OkPacket | object[]>(name: string, query: string, values: any[]): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.getConnection(name, 'Writer').then(connection => {
        connection.beginTransaction((beginTxError) => {
          if (beginTxError) {
            connection.release();
            reject(beginTxError);
          }
          connection.query(query, values, (queryError, result, field) => {
            if (queryError) {
              connection.rollback(() => {
                connection.release();
                reject(queryError);
              });
            } else {
              connection.commit((err) => {
                connection.release();
                if (err) {
                  reject(err)
                }
                resolve(result as T);
              });
            }
          });
        });
      }).catch((e) => {
        return reject(new Error("No has Connection"))
      });

      const opts = this.getConnectionOpts(name, 'Writer');
      setTimeout(() => {
        reject(new Error('Query Timeout'));
      }, (opts && opts.timeout ? opts.timeout : 90 * 1000));
    });
  }

  private async writerQueryNoNameWithSqlAndValues<T extends RowDataPacket[] | OkPacket[] | OkPacket | object[]>(query: string, values: any[]): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.getConnection(undefined, 'Writer').then(connection => {
        connection.beginTransaction((beginTxError) => {
          if (beginTxError) {
            connection.release();
            reject(beginTxError);
          }
          connection.query(query, values, (queryError, result, field) => {
            if (queryError) {
              connection.rollback(() => {
                connection.release();
                reject(queryError);
              });
            } else {
              connection.commit((err) => {
                connection.release();
                if (err) {
                  reject(err)
                }
                resolve(result as T);
              });
            }
          });
        });
      }).catch((e) => {
        return reject(new Error("No has Connection"))
      });

      const opts = this.getConnectionOpts(undefined, 'Writer');
      setTimeout(() => {
        reject(new Error('Query Timeout'));
      }, (opts && opts.timeout ? opts.timeout : 90 * 1000));
    });
  }

  async beginTransaction(name?: string): Promise<PoolConnection> {
    return new Promise((resolve, reject) => {
      this.getConnection(name, 'Writer').then(connection => {
        connection.beginTransaction((err) => {
          if (err) {
            reject(err)
          } else {
            resolve(connection)
          }
        })
      }).catch((e) => {
        reject(e);
      })
    })
  }

  async commit(connection: PoolConnection): Promise<PoolConnection> {
    return new Promise((resolve, reject) => {
      connection.commit((err) => {
        if (err) {
          reject(err)
        } else {
          resolve(connection)
        }
      })
    })
  }

  async query<T extends RowDataPacket[] | OkPacket[] | OkPacket | object[]>(connection: PoolConnection, ...args: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
      if (args[0] instanceof SQLStatement) {
        connection.query(args[0], (err, result) => {
          if (err) {
            reject(err)
          } else {
            resolve(result as T)
          }
        })
      } else if (typeof args[0] == 'string' && args[1] instanceof Array) {
        connection.query(args[0], args[1], (err, result) => {
          if (err) {
            reject(err)
          } else {
            resolve(result as T)
          }
        })
      }
    })
  }

}
export default ConnectionPool;