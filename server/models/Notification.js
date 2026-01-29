const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['supplier_due', 'customer_due'],
  },
  link: {
    type: String,
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  dueDate: {
    type: Date,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // required: true, // Decide if notifications are user-specific or general
  },
}, {
  timestamps: true,
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
