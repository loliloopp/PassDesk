import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/errorHandler.js';

// TODO: Import User model when created
// import User from '../models/User.js';

export const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // TODO: Implement user registration
    // Check if user exists
    // Hash password
    // Create user
    // Generate tokens

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        // user data
        // tokens
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // TODO: Implement login logic
    // Find user by email
    // Verify password
    // Generate tokens

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        // user data
        // tokens
      }
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    // TODO: Implement logout logic
    // Invalidate refresh token if stored in DB

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // TODO: Implement token refresh logic
    // Verify refresh token
    // Generate new access token

    res.json({
      success: true,
      data: {
        // new tokens
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    // TODO: Get user from database
    const userId = req.user.id;

    res.json({
      success: true,
      data: {
        // user data
      }
    });
  } catch (error) {
    next(error);
  }
};

