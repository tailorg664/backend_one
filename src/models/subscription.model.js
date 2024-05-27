import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
   {
      subscriber: {
         type: Schema.Types.ObjectId, //one who is subscribing to this subscription
         ref: "User", //
      },
      channel: {
         type: Schema.Types.ObjectId, //the one whom the subscriber is subscribed to
         ref: "User",
      },
   },
   {
      timestamps: true,
   }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
