import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 180 },
    company: { type: String, trim: true, default: "", maxlength: 120 },
    topic: {
      type: String,
      enum: ["product-demo", "pricing", "partnership", "support", "other"],
      default: "other",
    },
    message: { type: String, required: true, trim: true, minlength: 10, maxlength: 4000 },
    status: { type: String, enum: ["new", "read", "replied"], default: "new" },
  },
  { timestamps: true, versionKey: false }
);

contactSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export default mongoose.model("ContactMessage", contactSchema);
