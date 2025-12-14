const mongoose = require("mongoose");

const userBookingsSchema=new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    stylistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StylistProfile",
        required: true,
    },
    user_Booking_Type:{
        type:String,
        enum:['consultation','styling_session','makeover','custom'],
        required: true,
    },
    user_Booking_Title:{
        type:String,
        required: true,
    },
    user_Booking_Description:{
        type:String,
        required: true,
    },
    user_Booking_Scheduled_Date:{
        type:Date,
        required: true,
    },
    user_Booking_Scheduled_Time:{
        type:String,
        required: true,
    },
    user_Booking_Duration:{
        type:Number,
        required: true,
    },
    user_Booking_Status:{
        type:String,
        enum:['pending','confirmed','cancelled','completed'],
        required: true,
    },
    user_Booking_Payment_Status:{
        type:String,
        enum:['pending','processing','completed','failed','refunded','partially_refunded'],
        required: true,
    },
    user_Booking_Payment_Amount:{
        type:Number,
        required: true,
    },
    user_Booking_Payment_Currency:{
        type:String,
        required: true,
    },
});