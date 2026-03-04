import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const dbURI = process.env.MONGODB_URI_PRODUCTION; // 👈 SOLO Atlas

console.log("🔍 dbURI =>", dbURI);

export const connectDB = async () => {
  try {
    await mongoose.connect(dbURI);
    console.log("✅ Conectado a MongoDB");
  } catch (error) {
    console.error("❌ Error conectando a MongoDB:", error.message);
    process.exit(1);
  }
};
