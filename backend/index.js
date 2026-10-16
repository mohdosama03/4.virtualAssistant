import express from "express"
import dotenv from "dotenv"
import path from "node:path"
import { fileURLToPath } from "node:url"
import cors from "cors"
import cookieParser from "cookie-parser"
import mongoose from "mongoose"

const backendDirectory = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(backendDirectory, ".env") })

import connectDb from "./config/db.js"
import authRouter from "./routes/auth.routes.js"
import userRouter from "./routes/user.routes.js"

const app = express()

const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(null, true)
        }
    },
    credentials: true
}))

const port = process.env.PORT || 8000
app.use(express.json())
app.use(cookieParser())

// Health check endpoint to monitor backend and database status
app.get("/api/health", (req, res) => {
    const readyState = mongoose.connection.readyState
    const states = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting"
    }
    const isDbConnected = readyState === 1
    return res.status(isDbConnected ? 200 : 503).json({
        status: isDbConnected ? "ok" : "degraded",
        database: {
            state: states[readyState] || "unknown",
            connected: isDbConnected
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    })
})

app.use("/api/auth", authRouter)
app.use("/api/user", userRouter)

const startServer = async () => {
    try {
        await connectDb()
        app.listen(port, () => {
            console.log(`Server started running on port ${port}`)
        })
    } catch (error) {
        console.error("Starting server in degraded mode due to database error:", error.message)
        app.listen(port, () => {
            console.log(`Server started in degraded mode on port ${port} (DB disconnected)`)
        })
    }
}

startServer()


