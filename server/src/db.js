import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

const basePoolOptions = {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000
};

const poolConfig = databaseUrl
    ? {
        ...parseDatabaseUrl(databaseUrl),
        ...basePoolOptions
    }
    : {
        host: process.env.DB_HOST || "127.0.0.1",
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "uniplace_db",
        ...basePoolOptions
    };

export const pool = mysql.createPool(poolConfig);

function parseDatabaseUrl(value) {
    const url = new URL(value);

    return {
        host: url.hostname,
        port: Number(url.port) || 3306,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.replace(/^\//, "")
    };
}
