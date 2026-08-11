import mongoose from 'mongoose';

// Không hardcode chuỗi kết nối thật. Đặt MONGODB_URI ở .env (local) hoặc biến
// môi trường (Render). Mặc định trỏ localhost để không lộ thông tin nhạy cảm.
const DEFAULT_URI = 'mongodb://localhost:27017/DashboardManage';

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
