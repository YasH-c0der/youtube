import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
    {
        sunbscriber: {
            type: Schema.Types.ObjectId, // one who is subscribing
            ref: "User"
        },
        channel: {
            type: Schema.Types.ObjectId, // one to whom subscriber is subscribing
            ref: "User"
        }
        
    },
    { timestamps }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
