// Validation utilities and helper functions

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => ValidationResult;
}

// Email validation
export const validateEmail = (email: string): ValidationResult => {
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
export const validatePassword = (password: string): ValidationResult => {
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
export const validateName = (name: string): ValidationResult => {
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
export const validatePhone = (phone: string): ValidationResult => {
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
export const validatePAN = (pan: string): ValidationResult => {
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
export const validateGST = (gst: string): ValidationResult => {
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
export const validateDate = (date: string, isFuture: boolean = false): ValidationResult => {
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
export const validateNumber = (value: string, min?: number, max?: number): ValidationResult => {
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
export const validateRole = (role: string, userRole: string): ValidationResult => {
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
  
  if (userRole && !roleHierarchy[userRole as keyof typeof roleHierarchy]?.includes(role)) {
    return { isValid: false, error: `You cannot create users with ${role} role` };
  }
  
  return { isValid: true };
};

// Generic field validation
export const validateField = (value: any, rules: ValidationRule): ValidationResult => {
  // Required validation
  if (rules.required && (!value || value.toString().trim() === '')) {
    return { isValid: false, error: 'This field is required' };
  }
  
  // Skip other validations if field is empty and not required
  if (!value || value.toString().trim() === '') {
    return { isValid: true };
  }
  
  const stringValue = value.toString();
  
  // Length validations
  if (rules.minLength && stringValue.length < rules.minLength) {
    return { isValid: false, error: `Must be at least ${rules.minLength} characters long` };
  }
  
  if (rules.maxLength && stringValue.length > rules.maxLength) {
    return { isValid: false, error: `Must be less than ${rules.maxLength} characters long` };
  }
  
  // Pattern validation
  if (rules.pattern && !rules.pattern.test(stringValue)) {
    return { isValid: false, error: 'Invalid format' };
  }
  
  // Custom validation
  if (rules.custom) {
    return rules.custom(value);
  }
  
  return { isValid: true };
};

// Form validation
export const validateForm = (data: Record<string, any>, rules: Record<string, ValidationRule>): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  for (const [field, rule] of Object.entries(rules)) {
    const result = validateField(data[field], rule);
    if (!result.isValid && result.error) {
      errors[field] = result.error;
    }
  }
  
  return errors;
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

// Format phone number for display
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    return `+91-${cleanPhone.slice(0, 5)}-${cleanPhone.slice(5)}`;
  }
  
  return phone;
};

// Format PAN number for display
export const formatPAN = (pan: string): string => {
  if (!pan) return '';
  
  const cleanPAN = pan.replace(/\s/g, '').toUpperCase();
  if (cleanPAN.length === 10) {
    return `${cleanPAN.slice(0, 5)}${cleanPAN.slice(5, 9)}${cleanPAN.slice(9)}`;
  }
  
  return cleanPAN;
};

// Format GST number for display
export const formatGST = (gst: string): string => {
  if (!gst) return '';
  
  const cleanGST = gst.replace(/\s/g, '').toUpperCase();
  if (cleanGST.length === 15) {
    return `${cleanGST.slice(0, 2)}${cleanGST.slice(2, 7)}${cleanGST.slice(7, 11)}${cleanGST.slice(11, 12)}${cleanGST.slice(12, 13)}${cleanGST.slice(13)}`;
  }
  
  return cleanGST;
};
