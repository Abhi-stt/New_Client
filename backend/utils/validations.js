// Backend validation utilities

// Email validation
const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
};

// Password validation
const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character (@$!%*?&)' };
  }
  
  return { isValid: true };
};

// Name validation
const validateName = (name) => {
  if (!name) {
    return { isValid: false, error: 'Name is required' };
  }
  
  if (name.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters long' };
  }
  
  if (name.length > 50) {
    return { isValid: false, error: 'Name must be less than 50 characters' };
  }
  
  // Allow letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(name)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }
  
  return { isValid: true };
};

// Phone number validation (Indian format)
const validatePhone = (phone) => {
  if (!phone) {
    return { isValid: true }; // Phone is optional
  }
  
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Check if it's a valid Indian mobile number
  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (!indianMobileRegex.test(cleanPhone)) {
    return { isValid: false, error: 'Please enter a valid 10-digit Indian mobile number' };
  }
  
  return { isValid: true };
};

// PAN number validation
const validatePAN = (pan) => {
  if (!pan) {
    return { isValid: true }; // PAN is optional
  }
  
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(pan.toUpperCase())) {
    return { isValid: false, error: 'Please enter a valid PAN number (e.g., ABCDE1234F)' };
  }
  
  return { isValid: true };
};

// GST number validation
const validateGST = (gst) => {
  if (!gst) {
    return { isValid: true }; // GST is optional
  }
  
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstRegex.test(gst.toUpperCase())) {
    return { isValid: false, error: 'Please enter a valid GST number (e.g., 27ABCDE1234F1Z5)' };
  }
  
  return { isValid: true };
};

// Date validation
const validateDate = (date, isFuture = false) => {
  if (!date) {
    return { isValid: false, error: 'Date is required' };
  }
  
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (isNaN(inputDate.getTime())) {
    return { isValid: false, error: 'Please enter a valid date' };
  }
  
  if (isFuture && inputDate <= today) {
    return { isValid: false, error: 'Date must be in the future' };
  }
  
  return { isValid: true };
};

// Number validation
const validateNumber = (value, min, max) => {
  if (!value) {
    return { isValid: true }; // Optional field
  }
  
  const num = parseFloat(value);
  if (isNaN(num)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }
  
  if (min !== undefined && num < min) {
    return { isValid: false, error: `Value must be at least ${min}` };
  }
  
  if (max !== undefined && num > max) {
    return { isValid: false, error: `Value must be at most ${max}` };
  }
  
  return { isValid: true };
};

// Role validation
const validateRole = (role, userRole = null) => {
  if (!role) {
    return { isValid: false, error: 'Role is required' };
  }
  
  const validRoles = ['super_admin', 'admin', 'manager', 'team_member', 'client'];
  if (!validRoles.includes(role)) {
    return { isValid: false, error: 'Please select a valid role' };
  }
  
  // Role hierarchy validation
  const roleHierarchy = {
    super_admin: ['admin', 'manager', 'team_member', 'client'],
    admin: ['manager', 'team_member', 'client'],
    manager: ['team_member', 'client'],
    team_member: [],
    client: []
  };
  
  if (userRole && !roleHierarchy[userRole]?.includes(role)) {
    return { isValid: false, error: `You cannot create users with ${role} role` };
  }
  
  return { isValid: true };
};

// Generic field validation
const validateField = (value, rule) => {
  // Required validation
  if (rule.required && (!value || value.toString().trim() === '')) {
    return { isValid: false, error: 'This field is required' };
  }
  
  // Skip other validations if field is empty and not required
  if (!value || value.toString().trim() === '') {
    return { isValid: true };
  }
  
  const stringValue = value.toString();
  
  // Length validations
  if (rule.minLength && stringValue.length < rule.minLength) {
    return { isValid: false, error: `Must be at least ${rule.minLength} characters long` };
  }
  
  if (rule.maxLength && stringValue.length > rule.maxLength) {
    return { isValid: false, error: `Must be less than ${rule.maxLength} characters long` };
  }
  
  // Pattern validation
  if (rule.pattern && !rule.pattern.test(stringValue)) {
    return { isValid: false, error: 'Invalid format' };
  }
  
  // Custom validation
  if (rule.custom) {
    return rule.custom(value);
  }
  
  return { isValid: true };
};

// Form validation
const validateForm = (data, rules) => {
  const errors = {};
  
  for (const [field, rule] of Object.entries(rules)) {
    const result = validateField(data[field], rule);
    if (!result.isValid && result.error) {
      errors[field] = result.error;
    }
  }
  
  return errors;
};

// Input sanitization
const sanitizeInput = (input) => {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

// Check if email is unique
const checkEmailUnique = async (email, excludeId = null) => {
  const User = require('../schemas/User');
  const Client = require('../schemas/Client');
  
  try {
    // Check in users collection
    const userQuery = { email: email.toLowerCase() };
    if (excludeId) userQuery._id = { $ne: excludeId };
    
    const existingUser = await User.findOne(userQuery);
    if (existingUser) {
      return { isValid: false, error: 'Email already exists in users' };
    }
    
    // Check in clients collection
    const clientQuery = { email: email.toLowerCase() };
    if (excludeId) clientQuery._id = { $ne: excludeId };
    
    const existingClient = await Client.findOne(clientQuery);
    if (existingClient) {
      return { isValid: false, error: 'Email already exists in clients' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Error checking email uniqueness' };
  }
};

module.exports = {
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  validatePAN,
  validateGST,
  validateDate,
  validateNumber,
  validateRole,
  validateField,
  validateForm,
  sanitizeInput,
  checkEmailUnique
};
