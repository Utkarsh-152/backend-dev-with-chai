import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const subscriptionSchema = new Schema(
    {
        subscriber: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        channel: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        isSubscribed: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
)


subscriptionSchema.plugin(mongooseAggregatePaginate)

export const subscription = mongoose.model("subscriptions", subscriptionSchema)