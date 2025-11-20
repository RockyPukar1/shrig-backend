export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  product_name: string;
  quantity: number;
  price: number;
  total_amount: number;
  status: OrderStatus;
  created_at: Date;
  updated_at: Date;
}

export enum OrderStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

export interface OrderStats {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  orders_by_status: Record<OrderStatus, number>;
  daily_orders: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
}

export interface CreateOrderDto {
  customer_name: string;
  customer_email: string;
  product_name: string;
  quantity: number;
  price: number;
}
