import mongoose from 'mongoose';

const { Schema } = mongoose;

/** One document per user — webhook config is loaded for the uploader's userId */
const agentTriggerConfigSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    apiUrl: { type: String, trim: true, default: '' },
    triggerToken: { type: String, default: '' },
    /** Sent as JSON payload `message` to the agent trigger webhook */
    triggerMessage: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

agentTriggerConfigSchema.index({ userId: 1 }, { unique: true });

export const AgentTriggerConfig = mongoose.model('AgentTriggerConfig', agentTriggerConfigSchema);
