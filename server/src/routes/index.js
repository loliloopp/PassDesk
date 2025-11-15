import express from 'express';
import authRoutes from './auth.routes.js';
import employeeRoutes from './employee.routes.js';
import passRoutes from './pass.routes.js';
import fileRoutes from './file.routes.js';

const router = express.Router();

// Routes
router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/passes', passRoutes);
router.use('/files', fileRoutes);

export default router;

