/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { connectDB } from './src/database';
import apiRoutes from './src/routes/api';
import { seedAdmin } from './src/services/authService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB, then seed a default admin if there are no users yet
connectDB();
seedAdmin();

// JSON parser
app.use(express.json());

// Serve uploaded assets (logo, images, ...) e.g. /uploads/images/logo1-....png
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Lazy-initialize Gemini SDK to fail gracefully if key is missing on startup
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiClient;
}

// 1. API: Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', apiRoutes);

// 2. API: AI Suggest Solution and KPI
app.post('/api/ai/suggest-solution', async (req, res) => {
  const { riskText, projectName } = req.body;
  if (!riskText) {
    return res.status(400).json({ error: 'riskText is required' });
  }

  const ai = getAiClient();
  if (!ai) {
    console.warn('GEMINI_API_KEY is not configured. Returning premium fallback suggestions.');
    return res.json({
      solution: `[Tư vấn PMO] Tổ chức ngay cuộc họp khẩn cấp 3 bên (Chủ đầu tư, Ban điều hành PMO và Chỉ huy trưởng dự án ${projectName || ''}) để rà soát nguyên nhân gốc rễ. Thiết lập phương án xử lý song song kỹ thuật và pháp lý.`,
      kpi: `Bàn giao hồ sơ khắc phục và ký biên bản thống nhất phương án trước ngày 30/08/2026. Đảm bảo tỷ lệ chấp thuận đạt 100%.`
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Dự án: ${projectName || 'Chung'}\nKhó khăn - Vướng mắc - Rủi ro: ${riskText}\n\nHãy phân tích và đưa ra giải pháp giải quyết cụ thể cùng với các chỉ số đánh giá hiệu quả (KPI) đo lường được kèm thời hạn hoàn thành.`,
      config: {
        systemInstruction: "Bạn là Senior UX Architect và Chuyên gia PMO Quản lý Dự án Xây dựng với hơn 15 năm kinh nghiệm điều hành các dự án lớn tại Vinacon, Autodesk và Procore. Hãy cung cấp lời khuyên giải quyết khó khăn quyết liệt, thực tế, đúng văn phong quản lý xây dựng bằng tiếng Việt.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            solution: {
              type: Type.STRING,
              description: "Giải pháp, kế hoạch hành động và đề xuất khắc phục cụ thể, chuyên sâu bằng tiếng Việt."
            },
            kpi: {
              type: Type.STRING,
              description: "Các chỉ số đánh giá hiệu quả (KPI) kèm thời hạn hoàn thành cụ thể bằng tiếng Việt."
            }
          },
          required: ["solution", "kpi"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error('Gemini response did not contain text.');
    }

    const parsed = JSON.parse(textOutput.trim());
    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating AI suggestion:', error);
    res.json({
      solution: `[PMO Fallback] Chỉ đạo nhà thầu phụ tăng cường quân số bám công trường 2 ca/ngày. Ban chỉ huy dự án lập báo cáo tiến độ tuần gửi trực tiếp CEO Minh Khang duyệt phương án bù tiến độ.`,
      kpi: `Hoàn tất bù đắp khối lượng chậm trễ trước 31/08/2026. Đạt chất lượng nghiệm thu mác bê tông thiết kế 100%.`
    });
  }
});

// 3. Vite Middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (Express + Vite)`);
  });
}

startServer();
