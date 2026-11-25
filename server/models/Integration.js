import mongoose from "mongoose";

const INTEGRATION_CATEGORIES = ["Communication", "Development", "Design", "Knowledge", "Finance", "Analytics"];

const integrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    mark: { type: String, required: true, trim: true, maxlength: 3 },
    category: { type: String, required: true, enum: INTEGRATION_CATEGORIES, index: true },
    description: { type: String, required: true, trim: true },
    connected: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false }
);

integrationSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export { INTEGRATION_CATEGORIES };
export default mongoose.model("Integration", integrationSchema);
