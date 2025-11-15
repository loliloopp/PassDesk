import express from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import employeeRoutes from './employee.routes.js';
import passRoutes from './pass.routes.js';
import fileRoutes from './file.routes.js';
import counterpartyRoutes from './counterparty.routes.js';
import constructionSiteRoutes from './constructionSite.routes.js';
import contractRoutes from './contract.routes.js';

const router = express.Router();

// Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/employees', employeeRoutes);
router.use('/passes', passRoutes);
router.use('/files', fileRoutes);
router.use('/counterparties', counterpartyRoutes);
router.use('/construction-sites', constructionSiteRoutes);
router.use('/contracts', contractRoutes);

export default router;

