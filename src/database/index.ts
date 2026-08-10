import mongoose from 'mongoose';

const DEFAULT_URI = 'mongodb+srv://leminhduykhang_db_user:23052004@datamanage.ziefw8j.mongodb.net/DashboardManage?retryWrites=true&w=majority&appName=DataManage';

export const connectDB = async () => {
  // Read the URI at call time so a .env value injected during startup is honored
  // (a module-load-time const can be evaluated before dotenv finishes injecting).
  const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_URI;
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    } as any);
    console.log('MongoDB Connected...');
  } catch (err: any) {
    console.error('Error connecting to MongoDB:', err.message);
    console.error('If you see SSL alert 80, please whitelist your IP address in MongoDB Atlas.');
    // Do not exit process, allow frontend to serve even if DB fails
  }
};
