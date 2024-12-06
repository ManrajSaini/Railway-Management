import { Router } from 'express';
import {
  createBooking,
  cancelBooking,
  getUserBookings,
  getBookingDetails
} from '../controllers/booking.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Create a new booking
router.post('/', createBooking);

// Cancel a booking
router.post('/:bookingId/cancel', cancelBooking);

// Get user's bookings
router.get('/', getUserBookings);

// Get specific booking details
router.get('/:bookingId', getBookingDetails);

export default router;
