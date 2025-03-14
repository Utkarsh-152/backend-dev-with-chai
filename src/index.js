import connectDB from "./db/index.js"
import 'dotenv/config';



connectDB()























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
