const express = require('express');
const User = require('../models/User');
const UserWeb = require('../models/UserWeb');
const { authenticateToken } = require('./auth');

const migrationRouter = express.Router();

// Migration endpoint to transfer old ID-based data to new user account
migrationRouter.post('/migrate-data', authenticateToken, async (req, res) => {
  try {
    const { oldId } = req.body;
    const userId = req.user.userId;

    if (!oldId) {
      return res.status(400).json({ 
        message: 'Old ID is required for migration' 
      });
    }

    // Find all UserWeb records with the old ID
    const oldRecords = await UserWeb.find({ id: oldId });

    if (oldRecords.length === 0) {
      return res.status(404).json({ 
        message: 'No data found for the provided ID' 
      });
    }

    // Update records to use the new userId
    const updatePromises = oldRecords.map(record => {
      // Create new record with userId instead of id
      return UserWeb.create({
        userId: userId,
        website: record.website,
        email: record.email,
        createdAt: record.createdAt
      });
    });

    await Promise.all(updatePromises);

    // Delete old records
    await UserWeb.deleteMany({ id: oldId });

    res.json({
      message: 'Data migration completed successfully',
      migratedRecords: oldRecords.length
    });

  } catch (err) {
    console.error('Migration error:', err);
    
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: 'Some data already exists for this user' 
      });
    }

    res.status(500).json({
      message: 'Internal server error during migration',
      error: err.message
    });
  }
});

module.exports = { migrationRouter };