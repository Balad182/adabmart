const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const Schema = mongoose.Schema;

const userSchema = Schema({
  username: {
    type: String,
    require: true,
    index: { 
      unique: true 
    }
  },
  email: {
    type: String,
    require: true,
    index: { 
      unique: true 
    }
  },
  password: {
    type: String,
    require: true,
  },
  role: {
    type: String,
    require: true,
    default: "Subscriber",    
  },
  userImagePath: {
    type: String,    
  },
  address: {
    type: String,    
  },
});

userSchema.methods.encryptPassword = (password) => {
    
  return bcrypt.hashSync(password, bcrypt.genSaltSync(5), null);
        
};
     
userSchema.methods.comparePassword = function(loginPassword) {
   if (this.password != null) {
    return bcrypt.compareSync(loginPassword, this.password);
  } else {
    return false;
  } 
};


module.exports = mongoose.model("User", userSchema);

