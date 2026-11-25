import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    category: { type: String, required: true, index: true, enum: ["Product", "Design", "Engineering", "Company"] },
    excerpt: { type: String, required: true, trim: true },
    publishedAt: { type: Date, required: true, index: true },
    readTime: { type: Number, default: 5, min: 1 },
    image: {
      src: { type: String, required: true },
      alt: { type: String, default: "" },
    },
    author: {
      name: { type: String, required: true },
      role: { type: String, default: "" },
    },
    body: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

postSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export default mongoose.model("Post", postSchema);
