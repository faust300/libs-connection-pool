"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var mysql2_1 = __importDefault(require("mysql2"));
var sql_template_strings_1 = require("sql-template-strings");
var ConnectionPool = /** @class */ (function () {
    function ConnectionPool() {
        var opts = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            opts[_i] = arguments[_i];
        }
        var _this = this;
        this.readerList = new Map();
        this.writerList = new Map();
        // @ts-ignore
        this.poolCluster = mysql2_1.default.createPoolCluster({ defaultSelector: 'ORDER', multipleStatements: true });
        opts.forEach(function (opt) {
            if (opt.type) {
                if (opt.type == 'Writer') {
                    _this.writerList.set(String(opt.connectionName), __assign({ port: 3306, connectionLimit: 150, timeout: 90 * 1000 }, opt));
                }
                else {
                    _this.readerList.set(String(opt.connectionName), __assign({ port: 3306, connectionLimit: 150, timeout: 90 * 1000, type: 'Reader' }, opt));
                }
            }
            else {
                if (opt.writerHost) {
                    _this.writerList.set(String(opt.connectionName), __assign(__assign({ port: 3306, connectionLimit: 150, timeout: 90 * 1000 }, opt), { host: opt.writerHost }));
                }
                if (opt.readerHost) {
                    _this.readerList.set(String(opt.connectionName), __assign(__assign({ port: 3306, connectionLimit: 150, timeout: 90 * 1000, type: 'Reader' }, opt), { host: opt.readerHost }));
                }
                else {
                    _this.readerList.set(String(opt.connectionName), __assign({ port: 3306, connectionLimit: 150, timeout: 90 * 1000, type: 'Reader' }, opt));
                }
            }
        });
        Array.from(this.writerList.keys()).forEach(function (connectionName) {
            var opt = _this.writerList.get(connectionName);
            if (opt) {
                _this.poolCluster.add("Writer:".concat(connectionName), {
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
        });
        Array.from(this.readerList.keys()).forEach(function (connectionName) {
            var opt = _this.readerList.get(connectionName);
            if (opt) {
                _this.poolCluster.add("Reader:".concat(connectionName), {
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
        });
    }
    ConnectionPool.prototype.getConnection = function (name, type) {
        if (type === void 0) { type = 'Reader'; }
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        if (name == undefined) {
                            var readerNameList = Array.from(_this.readerList.keys());
                            var writerNameList = Array.from(_this.writerList.keys());
                            name = readerNameList.length > 0 ? readerNameList[0] : (writerNameList.length > 0 ? writerNameList[0] : undefined);
                        }
                        if (name) {
                            if (type == 'Reader') {
                                if (_this.readerList.get(name)) {
                                    _this.poolCluster.getConnection("Reader:".concat(name), function (err, con) {
                                        if (err) {
                                            reject(err);
                                        }
                                        else {
                                            resolve(con);
                                        }
                                    });
                                }
                                else if (_this.writerList.get(name)) {
                                    _this.poolCluster.getConnection("Writer:".concat(name), function (err, con) {
                                        if (err) {
                                            reject(err);
                                        }
                                        else {
                                            resolve(con);
                                        }
                                    });
                                }
                                else {
                                    reject("Invalid Name");
                                }
                            }
                            else if (type == 'Writer') {
                                if (_this.writerList.get(name)) {
                                    _this.poolCluster.getConnection("Writer:".concat(name), function (err, con) {
                                        if (err) {
                                            reject(err);
                                        }
                                        else {
                                            resolve(con);
                                        }
                                    });
                                }
                                else {
                                    reject("Invalid Name");
                                }
                            }
                        }
                        else {
                            reject("No Has Connection");
                        }
                    })];
            });
        });
    };
    ConnectionPool.prototype.getConnectionOpts = function (name, type) {
        if (type === void 0) { type = 'Reader'; }
        if (name == undefined) {
            var readerNameList = Array.from(this.readerList.keys());
            var writerNameList = Array.from(this.writerList.keys());
            name = readerNameList.length > 0 ? readerNameList[0] : (writerNameList.length > 0 ? writerNameList[0] : undefined);
        }
        if (name) {
            if (type == 'Reader') {
                if (this.readerList.get(name)) {
                    return this.readerList.get(name);
                }
                else if (this.writerList.get(name)) {
                    return this.writerList.get(name);
                }
                else {
                    return undefined;
                }
            }
            else if (type == 'Writer') {
                if (this.writerList.get(name)) {
                    return this.writerList.get(name);
                }
                else {
                    return undefined;
                }
            }
        }
        else {
            return undefined;
        }
    };
    ConnectionPool.prototype.readerQuerySingle = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.readerQuery.apply(this, args)];
                    case 1:
                        results = _a.sent();
                        if (results.length > 0) {
                            return [2 /*return*/, results[0]];
                        }
                        else {
                            return [2 /*return*/, undefined];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    ConnectionPool.prototype.readerQuery = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (typeof args[0] == 'string' && args[1] instanceof sql_template_strings_1.SQLStatement && args[2] === undefined) {
                    // Name, SQLStatement
                    return [2 /*return*/, this.readerQueryNameWithSQLStatement(args[0], args[1])];
                }
                else if (args[0] instanceof sql_template_strings_1.SQLStatement && args[1] === undefined && args[2] === undefined) {
                    // No Name (readerList[0]), SQLStatement
                    return [2 /*return*/, this.readerQueryNoNameWithSQLStatement(args[0])];
                }
                else if (typeof args[0] == 'string' && typeof args[1] == 'string' && args[2] instanceof Array) {
                    // Name, Sql, Values
                    return [2 /*return*/, this.readerQueryNameWithSqlAndValues(args[0], args[1], args[2])];
                }
                else if (typeof args[0] == 'string' && args[1] instanceof Array && args[2] === undefined) {
                    // No Name (readerList[0]), Sql, values
                    return [2 /*return*/, this.readerQueryNoNameWithSqlAndValues(args[0], args[1])];
                }
                else {
                    return [2 /*return*/, {}];
                }
                return [2 /*return*/];
            });
        });
    };
    ConnectionPool.prototype.readerQueryNameWithSQLStatement = function (name, query) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var opts;
                        return __generator(this, function (_a) {
                            this.getConnection(name, 'Reader').then(function (connection) {
                                connection.beginTransaction(function (beginTxError) {
                                    if (beginTxError) {
                                        connection.release();
                                        reject(beginTxError);
                                    }
                                    connection.query(query, function (queryError, result, field) {
                                        if (queryError) {
                                            connection.rollback(function () {
                                                connection.release();
                                                reject(queryError);
                                            });
                                        }
                                        else {
                                            connection.commit(function (err) {
                                                connection.release();
                                                if (err) {
                                                    reject(err);
                                                }
                                                resolve(result);
                                            });
                                        }
                                    });
                                });
                            }).catch(function (e) {
                                return reject(new Error("No has Connection"));
                            });
                            opts = this.getConnectionOpts(name, 'Reader');
                            setTimeout(function () {
                                reject(new Error('Query Timeout'));
                            }, (opts && opts.timeout ? opts.timeout : 90 * 1000));
                            return [2 /*return*/];
                        });
                    }); })];
            });
        });
    };
    ConnectionPool.prototype.readerQueryNoNameWithSQLStatement = function (query) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var opts;
                        return __generator(this, function (_a) {
                            this.getConnection(undefined, 'Reader').then(function (connection) {
                                connection.beginTransaction(function (beginTxError) {
                                    if (beginTxError) {
                                        connection.release();
                                        reject(beginTxError);
                                    }
                                    connection.query(query, function (queryError, result, field) {
                                        if (queryError) {
                                            connection.rollback(function () {
                                                connection.release();
                                                reject(queryError);
                                            });
                                        }
                                        else {
                                            connection.commit(function (err) {
                                                connection.release();
                                                if (err) {
                                                    reject(err);
                                                }
                                                resolve(result);
                                            });
                                        }
                                    });
                                });
                            }).catch(function (e) {
                                return reject(new Error("No has Connection"));
                            });
                            opts = this.getConnectionOpts(undefined, 'Reader');
                            setTimeout(function () {
                                reject(new Error('Query Timeout'));
                            }, (opts && opts.timeout ? opts.timeout : 90 * 1000));
                            return [2 /*return*/];
                        });
                    }); })];
            });
        });
    };
    ConnectionPool.prototype.readerQueryNameWithSqlAndValues = function (name, query, values) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var opts;
                        return __generator(this, function (_a) {
                            this.getConnection(name, 'Reader').then(function (connection) {
                                connection.beginTransaction(function (beginTxError) {
                                    if (beginTxError) {
                                        connection.release();
                                        reject(beginTxError);
                                    }
                                    connection.query(query, values, function (queryError, result, field) {
                                        if (queryError) {
                                            connection.rollback(function () {
                                                connection.release();
                                                reject(queryError);
                                            });
                                        }
                                        else {
                                            connection.commit(function (err) {
                                                connection.release();
                                                if (err) {
                                                    reject(err);
                                                }
                                                resolve(result);
                                            });
                                        }
                                    });
                                });
                            }).catch(function (e) {
                                return reject(new Error("No has Connection"));
                            });
                            opts = this.getConnectionOpts(name, 'Reader');
                            setTimeout(function () {
                                reject(new Error('Query Timeout'));
                            }, (opts && opts.timeout ? opts.timeout : 90 * 1000));
                            return [2 /*return*/];
                        });
                    }); })];
            });
        });
    };
    ConnectionPool.prototype.readerQueryNoNameWithSqlAndValues = function (query, values) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var opts;
                        return __generator(this, function (_a) {
                            this.getConnection(undefined, 'Reader').then(function (connection) {
                                connection.beginTransaction(function (beginTxError) {
                                    if (beginTxError) {
                                        connection.release();
                                        reject(beginTxError);
                                    }
                                    connection.query(query, values, function (queryError, result, field) {
                                        if (queryError) {
                                            connection.rollback(function () {
                                                connection.release();
                                                reject(queryError);
                                            });
                                        }
                                        else {
                                            connection.commit(function (err) {
                                                connection.release();
                                                if (err) {
                                                    reject(err);
                                                }
                                                resolve(result);
                                            });
                                        }
                                    });
                                });
                            }).catch(function (e) {
                                return reject(new Error("No has Connection"));
                            });
                            opts = this.getConnectionOpts(undefined, 'Reader');
                            setTimeout(function () {
                                reject(new Error('Query Timeout'));
                            }, (opts && opts.timeout ? opts.timeout : 90 * 1000));
                            return [2 /*return*/];
                        });
                    }); })];
            });
        });
    };
    ConnectionPool.prototype.writerQuery = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (typeof args[0] == 'string' && args[1] instanceof sql_template_strings_1.SQLStatement && args[2] === undefined) {
                    // Name, SQLStatement
                    return [2 /*return*/, this.writerQueryNameWithSQLStatement(args[0], args[1])];
                }
                else if (args[0] instanceof sql_template_strings_1.SQLStatement && args[1] === undefined && args[2] === undefined) {
                    // No Name (readerList[0]), SQLStatement
                    return [2 /*return*/, this.writerQueryNoNameWithSQLStatement(args[0])];
                }
                else if (typeof args[0] == 'string' && typeof args[1] == 'string' && args[2] instanceof Array) {
                    // Name, Sql, Values
                    return [2 /*return*/, this.writerQueryNameWithSqlAndValues(args[0], args[1], args[2])];
                }
                else if (typeof args[0] == 'string' && args[1] instanceof Array && args[2] === undefined) {
                    // No Name (readerList[0]), Sql, values
                    return [2 /*return*/, this.writerQueryNoNameWithSqlAndValues(args[0], args[1])];
                }
                else {
                    return [2 /*return*/, {}];
                }
                return [2 /*return*/];
            });
        });
    };
    ConnectionPool.prototype.writerQueryNameWithSQLStatement = function (name, query) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var opts;
                        return __generator(this, function (_a) {
                            this.getConnection(name, 'Writer').then(function (connection) {
                                connection.beginTransaction(function (beginTxError) {
                                    if (beginTxError) {
                                        connection.release();
                                        reject(beginTxError);
                                    }
                                    connection.query(query, function (queryError, result, field) {
                                        if (queryError) {
                                            connection.rollback(function () {
                                                connection.release();
                                                reject(queryError);
                                            });
                                        }
                                        else {
                                            connection.commit(function (err) {
                                                connection.release();
                                                if (err) {
                                                    reject(err);
                                                }
                                                resolve(result);
                                            });
                                        }
                                    });
                                });
                            }).catch(function (e) {
                                return reject(new Error("No has Connection"));
                            });
                            opts = this.getConnectionOpts(name, 'Writer');
                            setTimeout(function () {
                                reject(new Error('Query Timeout'));
                            }, (opts && opts.timeout ? opts.timeout : 90 * 1000));
                            return [2 /*return*/];
                        });
                    }); })];
            });
        });
    };
    ConnectionPool.prototype.writerQueryNoNameWithSQLStatement = function (query) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var opts;
                        return __generator(this, function (_a) {
                            this.getConnection(undefined, 'Writer').then(function (connection) {
                                connection.beginTransaction(function (beginTxError) {
                                    if (beginTxError) {
                                        connection.release();
                                        reject(beginTxError);
                                    }
                                    connection.query(query, function (queryError, result, field) {
                                        if (queryError) {
                                            connection.rollback(function () {
                                                connection.release();
                                                reject(queryError);
                                            });
                                        }
                                        else {
                                            connection.commit(function (err) {
                                                connection.release();
                                                if (err) {
                                                    reject(err);
                                                }
                                                resolve(result);
                                            });
                                        }
                                    });
                                });
                            }).catch(function (e) {
                                return reject(new Error("No has Connection"));
                            });
                            opts = this.getConnectionOpts(undefined, 'Writer');
                            setTimeout(function () {
                                reject(new Error('Query Timeout'));
                            }, (opts && opts.timeout ? opts.timeout : 90 * 1000));
                            return [2 /*return*/];
                        });
                    }); })];
            });
        });
    };
    ConnectionPool.prototype.writerQueryNameWithSqlAndValues = function (name, query, values) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var opts;
                        return __generator(this, function (_a) {
                            this.getConnection(name, 'Writer').then(function (connection) {
                                connection.beginTransaction(function (beginTxError) {
                                    if (beginTxError) {
                                        connection.release();
                                        reject(beginTxError);
                                    }
                                    connection.query(query, values, function (queryError, result, field) {
                                        if (queryError) {
                                            connection.rollback(function () {
                                                connection.release();
                                                reject(queryError);
                                            });
                                        }
                                        else {
                                            connection.commit(function (err) {
                                                connection.release();
                                                if (err) {
                                                    reject(err);
                                                }
                                                resolve(result);
                                            });
                                        }
                                    });
                                });
                            }).catch(function (e) {
                                return reject(new Error("No has Connection"));
                            });
                            opts = this.getConnectionOpts(name, 'Writer');
                            setTimeout(function () {
                                reject(new Error('Query Timeout'));
                            }, (opts && opts.timeout ? opts.timeout : 90 * 1000));
                            return [2 /*return*/];
                        });
                    }); })];
            });
        });
    };
    ConnectionPool.prototype.writerQueryNoNameWithSqlAndValues = function (query, values) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var opts;
                        return __generator(this, function (_a) {
                            this.getConnection(undefined, 'Writer').then(function (connection) {
                                connection.beginTransaction(function (beginTxError) {
                                    if (beginTxError) {
                                        connection.release();
                                        reject(beginTxError);
                                    }
                                    connection.query(query, values, function (queryError, result, field) {
                                        if (queryError) {
                                            connection.rollback(function () {
                                                connection.release();
                                                reject(queryError);
                                            });
                                        }
                                        else {
                                            connection.commit(function (err) {
                                                connection.release();
                                                if (err) {
                                                    reject(err);
                                                }
                                                resolve(result);
                                            });
                                        }
                                    });
                                });
                            }).catch(function (e) {
                                return reject(new Error("No has Connection"));
                            });
                            opts = this.getConnectionOpts(undefined, 'Writer');
                            setTimeout(function () {
                                reject(new Error('Query Timeout'));
                            }, (opts && opts.timeout ? opts.timeout : 90 * 1000));
                            return [2 /*return*/];
                        });
                    }); })];
            });
        });
    };
    ConnectionPool.prototype.beginTransaction = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.getConnection(name, 'Writer').then(function (connection) {
                            connection.beginTransaction(function (err) {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    resolve(connection);
                                }
                            });
                        }).catch(function (e) {
                            reject(e);
                        });
                    })];
            });
        });
    };
    ConnectionPool.prototype.commit = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        connection.commit(function (err) {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve(connection);
                            }
                        });
                    })];
            });
        });
    };
    ConnectionPool.prototype.query = function (connection) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        if (args[0] instanceof sql_template_strings_1.SQLStatement) {
                            connection.query(args[0], function (err, result) {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    resolve(result);
                                }
                            });
                        }
                        else if (typeof args[0] == 'string' && args[1] instanceof Array) {
                            connection.query(args[0], args[1], function (err, result) {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    resolve(result);
                                }
                            });
                        }
                    })];
            });
        });
    };
    return ConnectionPool;
}());
exports.default = ConnectionPool;
