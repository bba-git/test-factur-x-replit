import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Stepper, Step, StepLabel, StepContent, Typography, Paper, CircularProgress, Alert, Button } from '@mui/material';
import { CheckCircle, Error, Pending } from '@mui/icons-material';

interface ValidationResponse {
  isValid: boolean;
  checks: {
    profileId: boolean;
    basicData: boolean;
    currencyCode: boolean;
    xsdValidation: boolean;
    schematronValidation: boolean;
  };
  errors: string[];
}

interface ValidationStep {
  label: string;
  description: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  error?: string;
}

interface ValidationWorkflowProps {
  invoiceId: string;
  onValidationComplete?: (results: any) => void;
}

interface ValidationError {
  error: string;
}

export default function ValidationWorkflow({ invoiceId, onValidationComplete }: ValidationWorkflowProps) {
  const router = useRouter();
  const { id } = router.query;
  const [activeStep, setActiveStep] = useState(0);
  const [steps, setSteps] = useState<ValidationStep[]>([
    {
      label: 'Profile ID Validation',
      description: 'Validating Factur-X profile identifier',
      status: 'pending'
    },
    {
      label: 'Basic Data Validation',
      description: 'Checking required invoice fields',
      status: 'pending'
    },
    {
      label: 'Currency Code Validation',
      description: 'Verifying currency code format',
      status: 'pending'
    },
    {
      label: 'XSD Schema Validation',
      description: 'Validating XML structure',
      status: 'pending'
    },
    {
      label: 'Schematron Validation',
      description: 'Checking business rules',
      status: 'pending'
    }
  ]);

  useEffect(() => {
    if (id) {
      validateInvoice();
    }
  }, [id]);

  const validateInvoice = async () => {
    try {
      // Set all steps to loading
      setSteps(steps.map(step => ({ ...step, status: 'loading' })));

      const response = await fetch(`/api/invoices/${id}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json() as ValidationResponse | { error: string };

      if (!response.ok) {
        const errorMessage = 'error' in data ? data.error : 'Validation request failed';
        throw new Error(errorMessage);
      }

      // Update steps based on validation results
      setSteps(steps.map((step, index) => {
        const checkKey = Object.keys(data.checks)[index];
        const isValid = data.checks[checkKey as keyof typeof data.checks];
        return {
          ...step,
          status: isValid ? 'success' : 'error',
          error: isValid ? undefined : data.errors.find((e: string) => e.toLowerCase().includes(step.label.toLowerCase()))
        };
      }));

      if (onValidationComplete) {
        onValidationComplete(data);
      }
    } catch (error: unknown) {
      console.error('Validation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to validate invoice';
      setSteps(steps.map(step => ({
        ...step,
        status: 'error',
        error: errorMessage
      })));
    }
  };

  const getStepIcon = (status: ValidationStep['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      case 'loading':
        return <CircularProgress size={24} />;
      default:
        return <Pending />;
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Invoice Validation
      </Typography>
      
      <Stepper orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label} active={true} completed={step.status === 'success'}>
            <StepLabel icon={getStepIcon(step.status)}>
              {step.label}
            </StepLabel>
            <StepContent>
              <Typography>{step.description}</Typography>
              {step.status === 'error' && step.error && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {step.error}
                </Alert>
              )}
            </StepContent>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          onClick={validateInvoice}
          disabled={steps.some(step => step.status === 'loading')}
        >
          Revalidate
        </Button>
      </Box>
    </Box>
  );
} 