import React, { useState, useCallback } from 'react';
import { 
  validateEmail, 
  validatePassword, 
  validateName, 
  validatePhone, 
  validatePAN, 
  validateGST, 
  validateDate, 
  validateNumber, 
  validateRole,
  validateField as runValidation,
  ValidationRule,
  ValidationResult 
} from '@/lib/validations';

export interface FormField {
  value: any;
  error?: string;
  touched: boolean;
}

export interface FormState {
  [key: string]: FormField;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface UseFormValidationReturn {
  formState: FormState;
  errors: Record<string, string>;
  isValid: boolean;
  setFieldValue: (field: string, value: any) => void;
  setFieldTouched: (field: string, touched?: boolean) => void;
  validateField: (field: string) => ValidationResult;
  validateForm: () => boolean;
  resetForm: () => void;
  getFieldProps: (field: string) => {
    value: any;
    error?: string;
    onChange: (value: any) => void;
    onBlur: () => void;
  };
}

export const useFormValidation = (
  initialValues: Record<string, any>,
  validationRules: ValidationRules
): UseFormValidationReturn => {
  // Initialize form state
  const [formState, setFormState] = useState<FormState>(() => {
    const state: FormState = {};
    Object.keys(initialValues).forEach(key => {
      state[key] = {
        value: initialValues[key] || '',
        error: undefined,
        touched: false
      };
    });
    return state;
  });

  // Update field value
  const setFieldValue = useCallback((field: string, value: any) => {
    setFormState(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        value,
        error: undefined // Clear error when user starts typing
      }
    }));
  }, []);

  // Update field touched state
  const setFieldTouched = useCallback((field: string, touched: boolean = true) => {
    setFormState(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        touched
      }
    }));
  }, []);

  // Validate a single field
  const validateFormField = useCallback((field: string): ValidationResult => {
    const fieldState = formState[field];
    const rule = validationRules[field];
    
    if (!rule) {
      return { isValid: true };
    }

    const result = runValidation(fieldState.value, rule);
    
    // Update form state with validation result
    setFormState(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        error: result.isValid ? undefined : result.error
      }
    }));

    return result;
  }, [formState, validationRules]);

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    let isFormValid = true;
    const newFormState = { ...formState };

    Object.keys(validationRules).forEach(field => {
      const rule = validationRules[field];
      const fieldState = formState[field];
      
      const result = runValidation(fieldState.value, rule);
      
      if (!result.isValid) {
        isFormValid = false;
        newFormState[field] = {
          ...fieldState,
          error: result.error,
          touched: true
        };
      } else {
        newFormState[field] = {
          ...fieldState,
          error: undefined,
          touched: true
        };
      }
    });

    setFormState(newFormState);
    return isFormValid;
  }, [formState, validationRules]);

  // Reset form to initial values
  const resetForm = useCallback(() => {
    const state: FormState = {};
    Object.keys(initialValues).forEach(key => {
      state[key] = {
        value: initialValues[key] || '',
        error: undefined,
        touched: false
      };
    });
    setFormState(state);
  }, [initialValues]);

  // Get field props for easy integration with form components
  const getFieldProps = useCallback((field: string) => {
    const fieldState = formState[field];
    
    return {
      value: fieldState.value,
      error: fieldState.touched ? fieldState.error : undefined,
      onChange: (value: any) => setFieldValue(field, value),
      onBlur: () => {
        setFieldTouched(field, true);
        validateFormField(field);
      }
    };
  }, [formState, setFieldValue, setFieldTouched, validateFormField]);

  // Calculate form errors and validity
  const errors: Record<string, string> = {};
  let isValid = true;

  Object.keys(formState).forEach(field => {
    const fieldState = formState[field];
    if (fieldState.error) {
      errors[field] = fieldState.error;
      isValid = false;
    }
  });

  return {
    formState,
    errors,
    isValid,
    setFieldValue,
    setFieldTouched,
    validateField: validateFormField,
    validateForm,
    resetForm,
    getFieldProps
  };
};

// Predefined validation rules for common forms
export const validationRules = {
  user: {
    name: { 
      required: true, 
      minLength: 2, 
      maxLength: 50,
      custom: (value: string) => validateName(value)
    },
    email: { 
      required: true, 
      custom: (value: string) => validateEmail(value)
    },
    password: { 
      required: true, 
      custom: (value: string) => validatePassword(value)
    },
    phone: { 
      required: false, 
      custom: (value: string) => validatePhone(value)
    },
    role: { 
      required: true, 
      custom: (value: string) => validateRole(value)
    }
  },
  
  client: {
    name: { 
      required: true, 
      minLength: 2, 
      maxLength: 100,
      custom: (value: string) => validateName(value)
    },
    email: { 
      required: true, 
      custom: (value: string) => validateEmail(value)
    },
    phone: { 
      required: false, 
      custom: (value: string) => validatePhone(value)
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
      custom: (value: string) => validatePAN(value)
    },
    gstNumber: { 
      required: false, 
      custom: (value: string) => validateGST(value)
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
      custom: (value: string) => validateDate(value, true)
    },
    priority: { 
      required: true,
      pattern: /^(low|medium|high|critical)$/
    },
    penaltyAmount: { 
      required: false, 
      custom: (value: string) => validateNumber(value, 0)
    },
    lateFeeAmount: { 
      required: false, 
      custom: (value: string) => validateNumber(value, 0)
    }
  }
};

// Hook for real-time validation
export const useRealTimeValidation = (
  field: string,
  value: any,
  rule: ValidationRule,
  delay: number = 300
) => {
  const [error, setError] = useState<string | undefined>();
  const [isValidating, setIsValidating] = useState(false);

  // Debounced validation
  const debouncedValidate = useCallback(
    debounce((val: any, validationRule: ValidationRule) => {
      setIsValidating(true);
      const result = validateField(val, validationRule);
      setError(result.isValid ? undefined : result.error);
      setIsValidating(false);
    }, delay),
    [delay]
  );

  // Validate when value changes
  React.useEffect(() => {
    if (value !== undefined && value !== null) {
      debouncedValidate(value, rule);
    }
  }, [value, rule, debouncedValidate]);

  return { error, isValidating };
};

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
