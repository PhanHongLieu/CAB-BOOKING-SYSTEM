import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import api from '../services/api';

const DriverDashboard = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await api.get('/bookings?status=pending');
      setBookings(response.data.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleStatusChange = async (field, value) => {
    try {
      await api.patch('/drivers/status', { [field]: value });
      if (field === 'isOnline') setIsOnline(value);
      if (field === 'isAvailable') setIsAvailable(value);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const acceptBooking = async (bookingId) => {
    try {
      await api.post(`/bookings/${bookingId}/accept`);
      fetchBookings();
    } catch (error) {
      console.error('Error accepting booking:', error);
    }
  };

  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Driver Dashboard
        </Typography>
        <Paper sx={{ p: 3, mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isOnline}
                onChange={(e) => handleStatusChange('isOnline', e.target.checked)}
              />
            }
            label="Go Online"
          />
          <FormControlLabel
            control={
              <Switch
                checked={isAvailable}
                onChange={(e) => handleStatusChange('isAvailable', e.target.checked)}
                disabled={!isOnline}
              />
            }
            label="Available for Rides"
          />
        </Paper>
        <Typography variant="h6" gutterBottom>
          Available Bookings
        </Typography>
        {bookings.length === 0 ? (
          <Alert severity="info">No pending bookings</Alert>
        ) : (
          bookings.map((booking) => (
            <Paper key={booking._id} sx={{ p: 2, mb: 2 }}>
              <Typography variant="body1">
                {booking.pickupLocation.address} → {booking.dropoffLocation.address}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fare: {booking.fare.total} VND
              </Typography>
              <Button
                variant="contained"
                size="small"
                sx={{ mt: 1 }}
                onClick={() => acceptBooking(booking._id)}
              >
                Accept
              </Button>
            </Paper>
          ))
        )}
      </Box>
    </Container>
  );
};

export default DriverDashboard;
