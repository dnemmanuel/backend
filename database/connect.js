import mongoose from "mongoose";
import { Env } from "../helpers/env.js";

export async function connectDB() {
  await mongoose.connect(
    Env.get("MONGO_URI", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
  );
}
