// backend/config/database.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(); // Load .env variables

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error(
        "FATAL Error: MONGODB_URI is not defined in the .env file."
      );
      process.exit(1);
    }

    const conn = await mongoose.connect(mongoURI);
    console.log(`MongoDB Connected: ${conn.connection.host}`); // Keep this log

    mongoose.connection.on("error", (err) => {
      console.error("Mongoose connection error event:", err);
    });
    mongoose.connection.on("disconnected", () => {
      console.warn("Mongoose disconnected.");
    });
  } catch (error) {
    console.error(`FATAL Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;
