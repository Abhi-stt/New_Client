const { validateEmail, validatePassword, validateName, validatePhone, validatePAN, validateGST, validateDate, validateNumber, validateRole } = require('../utils/validations');

// Validation middleware factory
const createValidationMiddleware = (rules) => {
  return (req, res, next) => {
    const errors = {};
    
    // Validate each field
    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body[field];
      const result = validateField(value, rule);
      
      if (!result.isValid) {
        errors[field] = result.error;
      }
    }
    
    // If there are validation errors, return them
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    
    next();
  };
};

// Role-based access validation
const validateRoleAccess = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }
      
      const User = require('../schemas/User');
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      req.user = user;
      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        req.body[key] = sanitizeString(value);
      }
    }
  }
  next();
};

// Sanitize string input
const sanitizeString = (input) => {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
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

// Validation rules for different entities
const validationRules = {
  user: {
    name: { 
      required: true, 
      minLength: 2, 
      maxLength: 50,
      custom: (value) => validateName(value)
    },
    email: { 
      required: true, 
      custom: (value) => validateEmail(value)
    },
    password: { 
      required: true, 
      custom: (value) => validatePassword(value)
    },
    phone: { 
      required: false, 
      custom: (value) => validatePhone(value)
    },
    role: { 
      required: true, 
      custom: (value) => validateRole(value)
    }
  },
  
  client: {
    name: { 
      required: true, 
      minLength: 2, 
      maxLength: 100,
      custom: (value) => validateName(value)
    },
    email: { 
      required: true, 
      custom: (value) => validateEmail(value)
    },
    phone: { 
      required: false, 
      custom: (value) => validatePhone(value)
    },
    type: { 
      required: true,
      pattern: /^(individual|company|partnership|llp)$/
    },
    status: { 
      required: true,
      pattern: /^(active|inactive|pending|suspended)$/
    },
    registrationNumber: { 
      required: false, 
      maxLength: 20,
      pattern: /^[A-Za-z0-9]+$/
    },
    panNumber: { 
      required: false, 
      custom: (value) => validatePAN(value)
    },
    gstNumber: { 
      required: false, 
      custom: (value) => validateGST(value)
    }
  },
  
  compliance: {
    name: { 
      required: true, 
      minLength: 2, 
      maxLength: 100
    },
    description: { 
      required: false, 
      maxLength: 500
    },
    category: { 
      required: true,
      pattern: /^(tax|gst|tds|pf|esi|audit|legal|other)$/
    },
    type: { 
      required: true,
      pattern: /^(recurring|one-time|annual|quarterly|monthly|weekly)$/
    },
    frequency: { 
      required: true,
      pattern: /^(daily|weekly|monthly|quarterly|semi-annually|annually)$/
    },
    dueDate: { 
      required: true, 
      custom: (value) => validateDate(value, true)
    },
    priority: { 
      required: true,
      pattern: /^(low|medium|high|critical)$/
    },
    penaltyAmount: { 
      required: false, 
      custom: (value) => validateNumber(value, 0)
    },
    lateFeeAmount: { 
      required: false, 
      custom: (value) => validateNumber(value, 0)
    }
  }
};

// Predefined validation middlewares
const validateUser = createValidationMiddleware(validationRules.user);
const validateClient = createValidationMiddleware(validationRules.client);
const validateCompliance = createValidationMiddleware(validationRules.compliance);

// Role-based validation middlewares
const requireSuperAdmin = validateRoleAccess(['super_admin']);
const requireAdmin = validateRoleAccess(['super_admin', 'admin']);
const requireManager = validateRoleAccess(['super_admin', 'admin', 'manager']);

module.exports = {
  createValidationMiddleware,
  validateRoleAccess,
  sanitizeInput,
  validateUser,
  validateClient,
  validateCompliance,
  requireSuperAdmin,
  requireAdmin,
  requireManager,
  validationRules
};
