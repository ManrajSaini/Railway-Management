import supabase from '../config/supabase.js';

// Create a new booking
export const createBooking = async (req, res) => {
  try {
    const { trainId, travelDate, numSeats } = req.body;
    const userId = req.user.id;

    // Calculate total amount (you can modify this based on your pricing logic)
    const totalAmount = numSeats * 100; // Example: $100 per seat

    // Call the create_booking function
    const { data, error } = await supabase
      .rpc('create_booking', {
        p_user_id: userId,
        p_train_id: trainId,
        p_travel_date: travelDate,
        p_num_seats: numSeats,
        p_total_amount: totalAmount
      });

    if (error) throw error;

    const [result] = data;
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    // Fetch the complete booking details
    const { data: bookingDetails, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        train:trains (
          name,
          departure_time,
          arrival_time,
          source_station:stations!trains_source_station_id_fkey(name, city),
          destination_station:stations!trains_destination_station_id_fkey(name, city)
        )
      `)
      .eq('id', result.booking_id)
      .single();

    if (bookingError) throw bookingError;

    res.status(201).json(bookingDetails);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Error creating booking' });
  }
};

// Cancel a booking
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const { data, error } = await supabase
      .rpc('cancel_booking', {
        p_booking_id: bookingId,
        p_user_id: userId
      });

    if (error) throw error;

    const [result] = data;
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ message: result.message });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Error cancelling booking' });
  }
};

// Get user's bookings
export const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        train:trains (
          name,
          departure_time,
          arrival_time,
          source_station:stations!trains_source_station_id_fkey(name, city),
          destination_station:stations!trains_destination_station_id_fkey(name, city)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Error fetching bookings' });
  }
};

// Get specific booking details
export const getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        train:trains (
          name,
          departure_time,
          arrival_time,
          source_station:stations!trains_source_station_id_fkey(name, city),
          destination_station:stations!trains_destination_station_id_fkey(name, city)
        )
      `)
      .eq('id', bookingId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Booking not found' });
      }
      throw error;
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({ error: 'Error fetching booking details' });
  }
};
