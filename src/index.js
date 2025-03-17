import connectDB from "./db/index.js"
import app from "./app.js"
import dotenv from 'dotenv'

dotenv.config({
    path: '.env'
})



connectDB()
.then(()=> {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on ${process.env.PORT || 8000}`)
    })
})
.catch((err)=>{
    console.log("MongoDB connection failed!!", err );
})























// console.log('MONGODB_URI:', process.env.MONGODB_URI);

// ( async () => {
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error", (error)=>{
//             console.log("ERR: ", error);
//             throw error
//         })
//         app.listen(process.env.PORT, ()=> {
//             console.log(`app is listening on port ${process.env.PORT}`)
//         })
//     } catch(error){
//         console.error("error: ",error)
//         throw error
//     };
    
// } )()
