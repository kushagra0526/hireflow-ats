import mongoose from 'mongoose';

export const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];
export const SOURCES = ['LinkedIn', 'Referral', 'Job Board', 'Website', 'Other'];

const candidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, 'Email is not valid'],
    },
    phone: { type: String, trim: true, maxlength: 30 },
    position: { type: String, required: [true, 'Position is required'], trim: true, maxlength: 100 },
    experience: { type: Number, min: 0, max: 50, default: 0 },
    skills: [{ type: String, trim: true, maxlength: 40 }],
    source: { type: String, enum: SOURCES, default: 'Other' },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    // http(s) only, so a stored link can never become a javascript: URL in the UI
    resumeUrl: { type: String, trim: true, maxlength: 500, match: [/^(https?:\/\/\S+)?$/, 'Resume link must start with http:// or https://'] },
    notes: { type: String, maxlength: 2000 },
    stage: { type: String, enum: STAGES, default: 'Applied' },
    appliedAt: { type: Date, default: Date.now },
    history: [{ _id: false, stage: { type: String, enum: STAGES, required: true }, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true },
);

export default mongoose.model('Candidate', candidateSchema);
