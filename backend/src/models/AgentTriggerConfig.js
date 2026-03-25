import mongoose from 'mongoose';

const { Schema } = mongoose;

/** Singleton id — one app-wide Temporal / agent trigger configuration */
const ID = 'default';

const agentTriggerConfigSchema = new Schema(
  {
    _id: { type: String, default: ID },
    apiUrl: { type: String, trim: true, default: '' },
    triggerToken: { type: String, default: '' },
    /** Sent as JSON payload `message` to the agent trigger webhook */
    triggerMessage: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

export const AgentTriggerConfig = mongoose.model('AgentTriggerConfig', agentTriggerConfigSchema);
export const AGENT_TRIGGER_CONFIG_ID = ID;
