import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://leminhduykhang_db_user:Fa9Cehk50nW6aZSJ@datamanage.ziefw8j.mongodb.net/DashboardManage?retryWrites=true&w=majority&appName=DataManage';

export const connectDB = async () => {
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
