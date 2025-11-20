import mongoose, { Schema } from "mongoose";

const DataPointSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    value: {
      type: Number,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
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

DataPointSchema.index({ type: 1, timestamp: -1 });
DataPointSchema.index({ timestamp: -1 });

DataPointSchema.index({ type: 1, value: 1 });
DataPointSchema.index({ "metadata.sensor_id": 1, timestamp: -1 });

DataPointSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

export const DataPointModel = mongoose.model("DataPoint", DataPointSchema);
