import { Router } from 'express';
import {
  addStation,
  addTrain,
  updateTrainSeats,
  getAllStations,
  searchTrains,
  getSeatAvailability
} from '../controllers/train.controller.js';
import { authenticateToken, authorizeAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.get('/stations', getAllStations);
router.get('/search', searchTrains);
router.get('/availability', getSeatAvailability);

// Admin routes (protected)
router.post('/stations', authenticateToken, authorizeAdmin, addStation);
router.post('/trains', authenticateToken, authorizeAdmin, addTrain);
router.post('/seats', authenticateToken, authorizeAdmin, updateTrainSeats);

export default router;
