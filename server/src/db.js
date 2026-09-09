import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable. Copy .env.example to .env and set it.");
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log(`[db] connected to MongoDB (${mongoose.connection.name})`);
}
