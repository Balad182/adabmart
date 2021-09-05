const mongoose = require("mongoose");
const localUri = process.env.LOCAL_URI;
const mongoUri = process.env.MONGO_URI;
const connectDB = async () => {
    try {
        //  
        const uri = mongoUri || localUri;
        await mongoose.connect(uri, 
        {
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true,
            useFindAndModify: false
        })
        .catch((error) => console.log(error));
        const connection = mongoose.connection;
        console.log("MONGODB SUCCESSFULLY CONNECTED!");
    } catch (error) {
        console.log(error);
        return error;
    }
};

module.exports = connectDB;
