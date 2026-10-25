const mongoose=require('mongoose');
const bcrypt=require('bcryptjs');
const userSchema=new mongoose.Schema(
    {
        name: {type: String, required: true, trim: true, maxlength: 80},
        email: {type: String, required: true, unique: true, lowercase: true, trim: true},
        password: {type: String, required: true, minlength: 8, select: false},
        isPremium: {type: Boolean, default:false},
        premiumUntil: {type: Date, default: null}
    },
    {timestamps:true}
);

userSchema.pre('save', async function(){
    if(!this. isModified('password')){
        return;
    }
    this.password=await bcrypt.hash(this.password, 10);
    
});


userSchema.methods.comparePassword=function(password){
    return bcrypt.compare(password, this.password)
}


userSchema.methods.hasPremium=function(){
    return this.isPremium && (!this.premiumUntil || this.premiumUntil > new Date());

};

userSchema.methods.toSafe=function(){
    return{
        id: this._id,
        name: this.name,
        email: this.email,
        isPremium: this.hasPremium(),
        premiumUntil: this.premiumUntil
    }
}
module.exports=mongoose.model('User', userSchema)