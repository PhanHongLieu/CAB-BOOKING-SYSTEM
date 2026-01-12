import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import api from '../services/api';

const Booking = () => {
  const [pickup, setPickup] = useState({ address: '', lat: 0, lng: 0 });
  const [dropoff, setDropoff] = useState({ address: '', lat: 0, lng: 0 });
  const [vehicleType, setVehicleType] = useState('economy');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // In production, use Google Maps API to get coordinates
      // For now, using placeholder coordinates
      const bookingData = {
        pickupLocation: {
          address: pickup.address,
          coordinates: { lat: pickup.lat || 10.762622, lng: pickup.lng || 106.660172 }
        },
        dropoffLocation: {
          address: dropoff.address,
          coordinates: { lat: dropoff.lat || 10.7769, lng: dropoff.lng || 106.7009 }
        },
        vehicleType
      };

      const response = await api.post('/bookings', bookingData);
      setSuccess(true);
      console.log('Booking created:', response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            Book a Ride
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Booking created successfully! Waiting for driver...
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Pickup Location"
              value={pickup.address}
              onChange={(e) => setPickup({ ...pickup, address: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Dropoff Location"
              value={dropoff.address}
              onChange={(e) => setDropoff({ ...dropoff, address: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              select
              label="Vehicle Type"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              margin="normal"
              SelectProps={{ native: true }}
            >
              <option value="economy">Economy</option>
              <option value="comfort">Comfort</option>
              <option value="premium">Premium</option>
              <option value="luxury">Luxury</option>
            </TextField>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3 }}
              disabled={loading}
            >
              {loading ? 'Creating Booking...' : 'Book Ride'}
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default Booking;
