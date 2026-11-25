import mongoose from "mongoose";

const subscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 180 },
    source: { type: String, default: "footer", maxlength: 60 },
  },
  { timestamps: true, versionKey: false }
);

subscriberSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export default mongoose.model("Subscriber", subscriberSchema);
