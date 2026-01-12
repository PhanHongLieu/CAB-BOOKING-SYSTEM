import React from 'react';
import { useSelector } from 'react-redux';
import { Container, Typography, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome, {user?.name}!
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Role: {user?.role}
        </Typography>
        {user?.role === 'customer' && (
          <Button
            variant="contained"
            size="large"
            sx={{ mt: 3 }}
            onClick={() => navigate('/booking')}
          >
            Book a Ride
          </Button>
        )}
        {user?.role === 'driver' && (
          <Button
            variant="contained"
            size="large"
            sx={{ mt: 3 }}
            onClick={() => navigate('/driver')}
          >
            Go to Driver Dashboard
          </Button>
        )}
      </Box>
    </Container>
  );
};

export default Dashboard;
