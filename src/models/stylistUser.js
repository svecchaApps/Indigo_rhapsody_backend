const mongoose = require("mongoose");

const userStylistSchema=new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    style_Preference:[
        {
        type:String,
}],
fashion_goals:[
    {
        type:String,
    }
],
body_type:[
    {
        type:String
    }
],
size_Information:[
    {
        type:String
    }
],
user_Pictures:[
    {
        image_url:String,
    }
],
color_Preference:[
    {
        type:String
    }
],
budget_Range:{
    type:Number
},
budget_Currency:{
    type:String
},
experimental:[
    {
        type:String
    }
],
go_to_outfit:{
    type:String
},
fashion_vibe:{
    type:String
},

});

module.exports=mongoose.model("userStylist",userStylistSchema);