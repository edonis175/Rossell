import mongoose from "mongoose";

const metricSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true, trim: true },
    label: { type: String, required: true },
    shortLabel: { type: String, default: "" },
    format: { type: String, enum: ["currency", "number", "percent", "compact", "decimal"], default: "number" },
    value: { type: Number, required: true },
    delta: { type: Number, default: 0 },
    series: { type: [Number], default: [] },
    timeframe: { type: String, default: "Last 12 weeks" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false }
);

metricSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export default mongoose.model("Metric", metricSchema);
