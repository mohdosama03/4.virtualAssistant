import mongoose from "mongoose"

let isConnected = false

const connectDb = async () => {
    if (isConnected && mongoose.connection.readyState === 1) {
        return mongoose.connection
    }

    const mongoUrl = process.env.MONGODB_URL
    if (!mongoUrl) {
        const errorMsg = "MONGODB_URL is not defined in backend/.env file."
        console.error(errorMsg)
        throw new Error(errorMsg)
    }

    if (mongoose.connection.listeners("connected").length === 0) {
        mongoose.connection.on("connected", () => {
            isConnected = true
            console.log("Database connected successfully.")
        })

        mongoose.connection.on("error", (err) => {
            isConnected = false
            console.error("MongoDB connection error:", err.message)
        })

        mongoose.connection.on("disconnected", () => {
            isConnected = false
            console.warn("MongoDB disconnected.")
        })
    }

    try {
        await mongoose.connect(mongoUrl, {
            serverSelectionTimeoutMS: 15000,
        })
        isConnected = true
        return mongoose.connection
    } catch (error) {
        isConnected = false
        console.error("Failed to connect to MongoDB:", error.message)
        console.error("Troubleshooting tips:")
        console.error("1. Ensure your IP address is whitelisted in MongoDB Atlas Network Access (or set to 0.0.0.0/0).")
        console.error("2. Verify that MONGODB_URL in backend/.env has the correct username, password, and cluster host.")
        console.error("3. Check your network or DNS settings if connecting to mongodb+srv://.")
        throw error
    }
}

export default connectDb