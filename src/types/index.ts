export interface Customer {
  id?: number;
  name: string;
  phone: string;
  image_uri?: string;
}

export interface Item {
  id?: number;
  name: string;
  base_price: number;
  profit_percentage: number;
  image_uri?: string;
}

export interface InstallmentPlan {
  id?: number;
  customer_id: number;
  item_id: number;
  total_price: number;
  deposit: number;
  monthly_installment_amount: number;
  total_months: number;
  months_paid: number;
  start_date: string;
  status: 'active' | 'completed';
}

export interface Collection {
  id?: number;
  plan_id: number;
  amount_collected: number;
  collection_date: string;
  receipt_uri?: string;
}

export interface CollectionWithDetails extends Collection {
  customer_name: string;
  item_name: string;
}

export interface PlanWithDetails extends InstallmentPlan {
  customer_name: string;
  customer_phone: string;
  customer_image_uri?: string;
  item_name: string;
  item_profit_percentage: number;
}

export interface AnalyticsCollection {
  id: number;
  plan_id: number;
  amount_collected: number;
  collection_date: string;
  customer_name: string;
  item_name: string;
  profit: number;
}

export interface AnalyticsData {
  totalReceived: number;
  totalProfit: number;
  collections: AnalyticsCollection[];
}
