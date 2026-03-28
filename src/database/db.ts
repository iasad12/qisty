import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('qisty.db');

export const initDatabase = async () => {
  try {
    await db.execAsync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        image_uri TEXT
      );

      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        base_price REAL NOT NULL,
        profit_percentage REAL NOT NULL,
        image_uri TEXT
      );

      CREATE TABLE IF NOT EXISTS installment_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        total_price REAL NOT NULL,
        deposit REAL NOT NULL,
        monthly_installment_amount REAL NOT NULL,
        total_months INTEGER NOT NULL,
        months_paid INTEGER DEFAULT 0,
        start_date TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (item_id) REFERENCES items (id)
      );

      CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER NOT NULL,
        amount_collected REAL NOT NULL,
        collection_date TEXT NOT NULL,
        receipt_uri TEXT,
        FOREIGN KEY (plan_id) REFERENCES installment_plans (id)
      );
    `);
    
    // Migration: Add image_uri to customers if it doesn't exist
    try {
      await db.execAsync('ALTER TABLE customers ADD COLUMN image_uri TEXT;');
    } catch (e) {
      // Column might already exist, ignore
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

export default db;
