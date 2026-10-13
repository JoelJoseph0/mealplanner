import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE_MB } from './constants';

export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return 'Please enter a valid email address';
  }
  return null;
};

export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters long';
  return null;
};

export const validatePasswordMatch = (password, confirmPassword) => {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return null;
};

export const validateImageFile = (file) => {
  if (!file) return 'Please select an image file';
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Invalid file format. Only JPG, JPEG, PNG, and WEBP are supported.';
  }
  const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File size exceeds the ${MAX_FILE_SIZE_MB}MB limit.`;
  }
  return null;
};

export const validatePositiveNumber = (val, fieldName = 'Value') => {
  if (val === undefined || val === null || val === '') return null; // allow empty if optional
  const num = Number(val);
  if (isNaN(num) || num <= 0) {
    return `${fieldName} must be a positive number`;
  }
  return null;
};
