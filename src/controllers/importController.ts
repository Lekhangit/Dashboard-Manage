import { Request, Response } from 'express';
import { importTemplate } from '../services/templateImportService';

export const importExcel = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, path } = req.file;
    const user = req.body.user || 'Admin';

    const stats = await importTemplate(path, originalname, user);

    res.json({
      message: 'Import completed successfully',
      stats
    });
  } catch (error: any) {
    console.error('Excel import error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
