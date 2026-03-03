import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import bookingReducer from './slices/bookingSlice';
import notificationReducer from './slices/notificationSlice';

export default configureStore({
  reducer: {
    auth: authReducer,
    booking: bookingReducer,
    notification: notificationReducer,
  },
});
