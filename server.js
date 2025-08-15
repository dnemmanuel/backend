import "dotenv/config";
import express from "express";
import cors from "cors";
import compression from "compression";
import { connectDB } from "./database/connect.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import securityRequestRoutes from "./routes/securityRequestRoutes.js"; // Ensure this is imported
import permissionRoutes from "./routes/permissionRoutes.js";
import { createUser } from "./controllers/userController.js";
import { Env } from "./helpers/env.js";
import { authorise, verifyToken } from "./middlewares/authMiddleware.js";
import { seedSuperAdminUser } from "./database/seeders/s_adminSeeder.js";

// --- ADD THIS LINE FOR DEBUGGING ---
console.log(
  "Server.js startup: process.env.JWT_SECRET =",
  process.env.JWT_SECRET
);
// --- END DEBUGGING ---

connectDB()
  .then(() => {
    console.log("Connected to MongoDB");

    // Run the seeder functions
    seedSuperAdminUser();

    const app = express();

    // built in middlewares
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(compression());

    // custom middlewares

    // Register ALL specific API routes FIRST.
    // Requests for /auth, /api, /users, /roles, /permissions will be handled here.
    app.use("/auth", authRoutes);
    app.post("/users/create", createUser); // Specific user creation route
    app.use("/users", verifyToken, authorise(["s-admin"]), userRoutes);
    app.use("/roles", verifyToken, authorise(["s-admin"]), roleRoutes);
    app.use(
      "/permissions",
      verifyToken,
      authorise(["s-admin"]),
      permissionRoutes
    );
    // CRITICAL FIX: Add the missing securityRequestRoutes here!
    app.use(
      "/api",
      verifyToken,
      authorise(["admin", "s-admin"]),
      securityRequestRoutes
    );

    // This catch-all route MUST be the ABSOLUTE LAST route defined
    // before the app.listen() call. It will only be hit if no
    // other specific API routes above it have matched the request.
    app.use("/", (req, res) => {
      res.json("🚀🚀");
    });

    const PORT = Env.get("PORT", 3000);
    app.listen(PORT, () => {
      console.log("Server listening on port " + PORT);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
