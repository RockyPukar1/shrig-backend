import { OrderStatus } from "@/types/order.types";
import mongoose, { Schema } from "mongoose";

const OrderSchema = new Schema(
  {
    customer_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    customer_email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 255,
      index: true,
    },
    product_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    total_amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    toJSON: {
      transform: (doc: any, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

OrderSchema.index({ status: 1, created_at: -1 }); // Get recent orders by status
OrderSchema.index({ customer_email: 1, created_at: -1 }); // Get recent orders by customer email
OrderSchema.index({ created_at: -1 }); // Get recent orders
OrderSchema.index({ total_amount: -1 }); // Get orders by total amount

OrderSchema.index(
  {
    customer_name: "text",
    customer_email: "text",
    product_name: "text",
  },
  {
    weights: {
      product_name: 10,
      customer_name: 5,
      customer_email: 1,
    },
    name: "order_text_search",
  }
);

OrderSchema.index({ status: 1, total_amount: 1 }); // Get orders by status and total amount
OrderSchema.index({ created_at: 1, status: 1 }); // Get orders by created date and status

OrderSchema.pre("save", function (next) {
  if (this.isModified("quantity") || this.isModified("price")) {
    this.total_amount = this.quantity * this.price;
  }
  next();
});

OrderSchema.statics.getPerformanceStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total_orders: { $sum: 1 },
        total_revenue: { $sum: "$total_amount" },
        avg_order_value: { $avg: "$total_amount" },
        max_order_value: { $max: "$total_amount" },
        min_order_value: { $min: "$total_amount" },
      },
    },
  ]);
};

export const OrderModel = mongoose.model("Order", OrderSchema);
