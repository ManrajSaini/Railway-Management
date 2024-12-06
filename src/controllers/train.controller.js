import supabase from '../config/supabase.js';

// Admin: Add a new station
export const addStation = async (req, res) => {
  try {
    const { name, city } = req.body;

    const { data: station, error } = await supabase
      .from('stations')
      .insert([{ name, city }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(station);
  } catch (error) {
    console.error('Error adding station:', error);
    res.status(500).json({ error: 'Error adding station' });
  }
};

// Admin: Add a new train
export const addTrain = async (req, res) => {
  try {
    const {
      name,
      sourceStationId,
      destinationStationId,
      departureTime,
      arrivalTime,
      totalSeats
    } = req.body;

    const { data: train, error } = await supabase
      .from('trains')
      .insert([{
        name,
        source_station_id: sourceStationId,
        destination_station_id: destinationStationId,
        departure_time: departureTime,
        arrival_time: arrivalTime,
        total_seats: totalSeats
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(train);
  } catch (error) {
    console.error('Error adding train:', error);
    res.status(500).json({ error: 'Error adding train' });
  }
};

// Admin: Update train seats for a specific date
export const updateTrainSeats = async (req, res) => {
  try {
    const { trainId, travelDate, availableSeats } = req.body;

    const { data: existingSeats } = await supabase
      .from('train_seats')
      .select('id')
      .eq('train_id', trainId)
      .eq('travel_date', travelDate)
      .single();

    let result;
    if (existingSeats) {
      // Update existing record
      result = await supabase
        .from('train_seats')
        .update({ available_seats: availableSeats })
        .eq('id', existingSeats.id)
        .select()
        .single();
    } else {
      // Create new record
      result = await supabase
        .from('train_seats')
        .insert([{
          train_id: trainId,
          travel_date: travelDate,
          available_seats: availableSeats
        }])
        .select()
        .single();
    }

    if (result.error) throw result.error;

    res.json(result.data);
  } catch (error) {
    console.error('Error updating train seats:', error);
    res.status(500).json({ error: 'Error updating train seats' });
  }
};

// Public: Get all stations
export const getAllStations = async (req, res) => {
  try {
    const { data: stations, error } = await supabase
      .from('stations')
      .select('*')
      .order('name');

    if (error) throw error;

    res.json(stations);
  } catch (error) {
    console.error('Error fetching stations:', error);
    res.status(500).json({ error: 'Error fetching stations' });
  }
};

// Public: Search trains between stations
export const searchTrains = async (req, res) => {
  try {
    const { sourceStationId, destinationStationId, travelDate } = req.query;

    // Get trains between stations
    const { data: trains, error: trainError } = await supabase
      .from('trains')
      .select(`
        *,
        source_station:stations!trains_source_station_id_fkey(name, city),
        destination_station:stations!trains_destination_station_id_fkey(name, city),
        train_seats!inner(available_seats)
      `)
      .eq('source_station_id', sourceStationId)
      .eq('destination_station_id', destinationStationId)
      .eq('train_seats.travel_date', travelDate);

    if (trainError) throw trainError;

    res.json(trains);
  } catch (error) {
    console.error('Error searching trains:', error);
    res.status(500).json({ error: 'Error searching trains' });
  }
};

// Public: Get seat availability
export const getSeatAvailability = async (req, res) => {
  try {
    const { trainId, travelDate } = req.query;

    const { data: seatInfo, error } = await supabase
      .from('train_seats')
      .select('available_seats')
      .eq('train_id', trainId)
      .eq('travel_date', travelDate)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No seats info found for this date
        const { data: train } = await supabase
          .from('trains')
          .select('total_seats')
          .eq('id', trainId)
          .single();

        return res.json({ available_seats: train.total_seats });
      }
      throw error;
    }

    res.json(seatInfo);
  } catch (error) {
    console.error('Error getting seat availability:', error);
    res.status(500).json({ error: 'Error getting seat availability' });
  }
};
