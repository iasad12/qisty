import db from '../database/db';
import { Customer, Item, InstallmentPlan, Collection, PlanWithDetails, CollectionWithDetails, AnalyticsData, AnalyticsCollection } from '../types';

export const dbService = {
  // Customers
  getCustomers: async (): Promise<Customer[]> => {
    return await db.getAllAsync<Customer>(`
      SELECT c.*, (SELECT COUNT(*) FROM installment_plans p WHERE p.customer_id = c.id) as plan_count
      FROM customers c 
      ORDER BY name ASC
    `);
  },
  addCustomer: async (customer: Customer): Promise<number> => {
    const result = await db.runAsync(
      'INSERT INTO customers (name, phone, image_uri) VALUES (?, ?, ?)',
      [customer.name, customer.phone, customer.image_uri || null]
    );
    return result.lastInsertRowId;
  },
  updateCustomer: async (customer: Customer): Promise<void> => {
    await db.runAsync(
      'UPDATE customers SET name = ?, phone = ?, image_uri = ? WHERE id = ?',
      [customer.name, customer.phone, customer.image_uri || null, customer.id!]
    );
  },
  deleteCustomer: async (id: number): Promise<void> => {
    await db.runAsync('DELETE FROM customers WHERE id = ?', [id]);
  },

  // Items
  getItems: async (): Promise<Item[]> => {
    return await db.getAllAsync<Item>('SELECT * FROM items ORDER BY name ASC');
  },
  addItem: async (item: Item): Promise<number> => {
    const result = await db.runAsync(
      'INSERT INTO items (name, base_price, profit_percentage, image_uri) VALUES (?, ?, ?, ?)',
      [item.name, item.base_price, item.profit_percentage, item.image_uri || null]
    );
    return result.lastInsertRowId;
  },
  updateItem: async (item: Item): Promise<void> => {
    await db.runAsync(
      'UPDATE items SET name = ?, base_price = ?, profit_percentage = ?, image_uri = ? WHERE id = ?',
      [item.name, item.base_price, item.profit_percentage, item.image_uri || null, item.id!]
    );
  },
  deleteItem: async (id: number): Promise<void> => {
    await db.runAsync('DELETE FROM items WHERE id = ?', [id]);
  },

  // Installment Plans
  getPlans: async (): Promise<PlanWithDetails[]> => {
    return await db.getAllAsync<PlanWithDetails>(`
      SELECT p.*, 
             c.name as customer_name, 
             c.phone as customer_phone, 
             c.image_uri as customer_image_uri, 
             (SELECT COUNT(*) FROM installment_plans p2 WHERE p2.customer_id = c.id) as customer_plan_count,
             i.name as item_name, 
             i.profit_percentage as item_profit_percentage
      FROM installment_plans p
      JOIN customers c ON p.customer_id = c.id
      JOIN items i ON p.item_id = i.id
      ORDER BY p.start_date DESC
    `);
  },
  getPlansByCustomer: async (customerId: number): Promise<PlanWithDetails[]> => {
    return await db.getAllAsync<PlanWithDetails>(`
      SELECT p.*, 
             c.name as customer_name, 
             c.phone as customer_phone, 
             c.image_uri as customer_image_uri, 
             (SELECT COUNT(*) FROM installment_plans p2 WHERE p2.customer_id = c.id) as customer_plan_count,
             i.name as item_name, 
             i.profit_percentage as item_profit_percentage
      FROM installment_plans p
      JOIN customers c ON p.customer_id = c.id
      JOIN items i ON p.item_id = i.id
      WHERE p.customer_id = ?
      ORDER BY p.start_date DESC
    `, [customerId]);
  },
  getPlansByItem: async (itemId: number): Promise<PlanWithDetails[]> => {
    return await db.getAllAsync<PlanWithDetails>(`
      SELECT p.*, 
             c.name as customer_name, 
             c.phone as customer_phone, 
             c.image_uri as customer_image_uri, 
             (SELECT COUNT(*) FROM installment_plans p2 WHERE p2.customer_id = c.id) as customer_plan_count,
             i.name as item_name, 
             i.profit_percentage as item_profit_percentage
      FROM installment_plans p
      JOIN customers c ON p.customer_id = c.id
      JOIN items i ON p.item_id = i.id
      WHERE p.item_id = ?
      ORDER BY p.start_date DESC
    `, [itemId]);
  },
  addPlan: async (plan: InstallmentPlan): Promise<number> => {
    const result = await db.runAsync(
      'INSERT INTO installment_plans (customer_id, item_id, total_price, deposit, monthly_installment_amount, total_months, months_paid, start_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [plan.customer_id, plan.item_id, plan.total_price, plan.deposit, plan.monthly_installment_amount, plan.total_months, plan.months_paid, plan.start_date, plan.status || 'active']
    );
    return result.lastInsertRowId;
  },
  updatePlan: async (plan: InstallmentPlan): Promise<void> => {
    await db.runAsync(
      'UPDATE installment_plans SET customer_id = ?, item_id = ?, total_price = ?, deposit = ?, monthly_installment_amount = ?, total_months = ?, months_paid = ?, start_date = ?, status = ? WHERE id = ?',
      [plan.customer_id, plan.item_id, plan.total_price, plan.deposit, plan.monthly_installment_amount, plan.total_months, plan.months_paid, plan.start_date, plan.status, plan.id!]
    );
  },
  deletePlan: async (id: number): Promise<void> => {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM collections WHERE plan_id = ?', [id]);
      await db.runAsync('DELETE FROM installment_plans WHERE id = ?', [id]);
    });
  },
  markPlanAsCompleted: async (planId: number): Promise<void> => {
    await db.runAsync('UPDATE installment_plans SET status = "completed" WHERE id = ?', [planId]);
  },
  updatePlanProgress: async (planId: number, monthsPaid: number): Promise<void> => {
    const plan = await db.getFirstAsync<InstallmentPlan>('SELECT * FROM installment_plans WHERE id = ?', [planId]);
    if (plan) {
      const collected = plan.deposit + (monthsPaid * plan.monthly_installment_amount);
      // Use a small epsilon for floating point comparison
      const isFinished = (collected >= plan.total_price - 0.01) || monthsPaid >= plan.total_months;
      const status = isFinished ? 'completed' : 'active';
      console.log(`Updating plan ${planId}: monthsPaid=${monthsPaid}, status=${status}, collected=${collected}, total=${plan.total_price}`);
      await db.runAsync(
        'UPDATE installment_plans SET months_paid = ?, status = ? WHERE id = ?',
        [monthsPaid, status, planId]
      );
    }
  },

  // Collections
  getCollections: async (): Promise<Collection[]> => {
    return await db.getAllAsync<Collection>('SELECT * FROM collections ORDER BY collection_date DESC');
  },
  getCollectionsByPlan: async (planId: number): Promise<Collection[]> => {
    return await db.getAllAsync<Collection>(
      'SELECT * FROM collections WHERE plan_id = ? ORDER BY collection_date DESC',
      [planId]
    );
  },
  addCollection: async (collection: Collection): Promise<number> => {
    let lastId = 0;
    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        'INSERT INTO collections (plan_id, amount_collected, collection_date, receipt_uri) VALUES (?, ?, ?, ?)',
        [collection.plan_id, collection.amount_collected, collection.collection_date, collection.receipt_uri || null]
      );
      lastId = result.lastInsertRowId;
      
      // Update plan progress
      const plan = await db.getFirstAsync<InstallmentPlan>('SELECT * FROM installment_plans WHERE id = ?', [collection.plan_id]);
      if (plan) {
        await dbService.updatePlanProgress(collection.plan_id, plan.months_paid + 1);
      }
    });
    
    return lastId;
  },
  deleteCollection: async (collectionId: number): Promise<void> => {
    await db.withTransactionAsync(async () => {
      const collection = await db.getFirstAsync<Collection>('SELECT * FROM collections WHERE id = ?', [collectionId]);
      if (collection) {
        await db.runAsync('DELETE FROM collections WHERE id = ?', [collectionId]);
        
        // Update plan progress
        const plan = await db.getFirstAsync<InstallmentPlan>('SELECT * FROM installment_plans WHERE id = ?', [collection.plan_id]);
        if (plan) {
          await dbService.updatePlanProgress(collection.plan_id, Math.max(0, plan.months_paid - 1));
        }
      }
    });
  },
  getCollectionsThisMonth: async (): Promise<CollectionWithDetails[]> => {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    return await db.getAllAsync<CollectionWithDetails>(`
      SELECT col.*, cust.name as customer_name, item.name as item_name
      FROM collections col
      JOIN installment_plans plan ON col.plan_id = plan.id
      JOIN customers cust ON plan.customer_id = cust.id
      JOIN items item ON plan.item_id = item.id
      WHERE strftime("%Y-%m", col.collection_date) = ?
      ORDER BY col.collection_date DESC
      `, [currentMonth]);
      },
      getPendingCollectionsThisMonth: async (): Promise<PlanWithDetails[]> => {
      const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
      return await db.getAllAsync<PlanWithDetails>(`
      SELECT p.*, 
             c.name as customer_name, 
             c.phone as customer_phone, 
             c.image_uri as customer_image_uri, 
             (SELECT COUNT(*) FROM installment_plans p2 WHERE p2.customer_id = c.id) as customer_plan_count,
             i.name as item_name, 
             i.profit_percentage as item_profit_percentage
      FROM installment_plans p
      JOIN customers c ON p.customer_id = c.id
      JOIN items i ON p.item_id = i.id
      WHERE p.status = 'active'
      AND p.id NOT IN (
        SELECT plan_id FROM collections WHERE strftime("%Y-%m", collection_date) = ?
      )
      ORDER BY c.name ASC
      `, [currentMonth]);
      },

  // Dashboard Stats
  getDashboardStats: async () => {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

    const totalCollectedMonth = await db.getFirstAsync<{ total: number }>(
      'SELECT SUM(amount_collected) as total FROM collections WHERE strftime("%Y-%m", collection_date) = ?',
      [currentMonth]
    );

    const totalRemaining = await db.getFirstAsync<{ total: number }>(
      'SELECT SUM(total_price - deposit - (months_paid * monthly_installment_amount)) as total FROM installment_plans WHERE status = "active"'
    );
    
    // Total needed this month (sum of monthly installments for active plans that haven't paid this month)
    const pendingDueThisMonth = await db.getFirstAsync<{ total: number }>(`
      SELECT SUM(monthly_installment_amount) as total 
      FROM installment_plans 
      WHERE status = 'active'
      AND id NOT IN (
        SELECT plan_id FROM collections WHERE strftime("%Y-%m", collection_date) = ?
      )
    `, [currentMonth]);

    const collectedThisMonth = totalCollectedMonth?.total || 0;
    const stillNeeded = pendingDueThisMonth?.total || 0;
    
    return {
      totalCollected: collectedThisMonth,
      totalRemaining: totalRemaining?.total || 0,
      neededThisMonth: stillNeeded,
    };
  },

  getUrgentPlans: async (): Promise<PlanWithDetails[]> => {
    // Plans that haven't been paid this month (simplified logic)
    // In a real app, we'd check the last collection date for each plan
    return await db.getAllAsync<PlanWithDetails>(`
      SELECT p.*, 
             c.name as customer_name, 
             c.phone as customer_phone, 
             c.image_uri as customer_image_uri, 
             (SELECT COUNT(*) FROM installment_plans p2 WHERE p2.customer_id = c.id) as customer_plan_count,
             i.name as item_name, 
             i.profit_percentage as item_profit_percentage
      FROM installment_plans p
      JOIN customers c ON p.customer_id = c.id
      JOIN items i ON p.item_id = i.id
      WHERE p.status = 'active'
      ORDER BY p.months_paid ASC
      LIMIT 10
    `);
  },

  getAnalyticsData: async (period: 'daily' | 'weekly' | 'monthly' | 'yearly', limit: number = 30, offset: number = 0): Promise<AnalyticsData> => {
    let dateFilter = '';
    
    if (period === 'daily') {
      dateFilter = "date(col.collection_date) = date('now')";
    } else if (period === 'weekly') {
      dateFilter = "date(col.collection_date) >= date('now', '-6 days')";
    } else if (period === 'monthly') {
      dateFilter = "strftime('%Y-%m', col.collection_date) = strftime('%Y-%m', 'now')";
    } else if (period === 'yearly') {
      dateFilter = "strftime('%Y', col.collection_date) = strftime('%Y', 'now')";
    }

    // We need totals for the WHOLE period, but collections only for the page
    const allRows = await db.getAllAsync<any>(`
      SELECT 
        col.id,
        col.plan_id,
        col.amount_collected,
        col.collection_date,
        cust.name as customer_name,
        item.name as item_name,
        item.profit_percentage
      FROM collections col
      JOIN installment_plans plan ON col.plan_id = plan.id
      JOIN customers cust ON plan.customer_id = cust.id
      JOIN items item ON plan.item_id = item.id
      WHERE ${dateFilter}
      ORDER BY col.collection_date DESC
    `);

    let totalReceived = 0;
    let totalProfit = 0;

    const allCollections: AnalyticsCollection[] = allRows.map(row => {
      const amount = row.amount_collected;
      const profitPercentage = row.profit_percentage;
      const profit = amount * (profitPercentage / (100 + profitPercentage));
      
      totalReceived += amount;
      totalProfit += profit;

      return {
        id: row.id,
        plan_id: row.plan_id,
        amount_collected: amount,
        collection_date: row.collection_date,
        customer_name: row.customer_name,
        item_name: row.item_name,
        profit: profit
      };
    });

    return {
      totalReceived,
      totalProfit,
      collections: allCollections.slice(offset, offset + limit)
    };
  }
};
