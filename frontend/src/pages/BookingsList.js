import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper, List, ListItem, ListItemText } from '@mui/material';
import api from '../services/api';

const BookingsList = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await api.get('/bookings');
      setBookings(response.data.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Container>Loading...</Container>;
  }

  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          My Bookings
        </Typography>
        <Paper>
          <List>
            {bookings.length === 0 ? (
              <ListItem>
                <ListItemText primary="No bookings found" />
              </ListItem>
            ) : (
              bookings.map((booking) => (
                <ListItem key={booking._id}>
                  <ListItemText
                    primary={`${booking.pickupLocation.address} → ${booking.dropoffLocation.address}`}
                    secondary={`Status: ${booking.status} | Fare: ${booking.fare.total} VND`}
                  />
                </ListItem>
              ))
            )}
          </List>
        </Paper>
      </Box>
    </Container>
  );
};

export default BookingsList;
