import express from 'express';
import invoices from './invoices';
import customers from './customers';
import companyProfiles from './companyProfiles';

const router = express.Router();

router.use('/invoices', invoices);
router.use('/customers', customers);
router.use('/company-profiles', companyProfiles);

export default router; 