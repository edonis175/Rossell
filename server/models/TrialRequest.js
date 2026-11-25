import mongoose from "mongoose";

const trialRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 180 },
    company: { type: String, required: true, trim: true, maxlength: 120 },
    teamSize: { type: String, enum: ["1-10", "11-50", "51-200", "201+"], default: "11-50" },
    status: { type: String, enum: ["pending", "contacted", "activated"], default: "pending" },
  },
  { timestamps: true, versionKey: false }
);

trialRequestSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export default mongoose.model("TrialRequest", trialRequestSchema);
