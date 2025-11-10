import { useState, useEffect } from 'react';
import { ExtractedVehicleData, ErrorType } from '../../types';
import { useAppStore } from '../store';
import { ValidatedInput } from './ValidatedInput';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import {
  validateVIN,
  validateYear,
  validateMileage,
  validatePrice,
  validateLocation,
  validateMakeModel,
  ValidationResult
} from '../utils/formValidation';
import { announceToScreenReader } from '../utils/accessibility';

interface EditAppraisalDialogProps {
  isOpen: boolean;
  appraisalId: string;
  initialData: ExtractedVehicleData;
  onSave: (data: ExtractedVehicleData) => void;
  onCancel: () => void;
}

interface FormValidations {
  vin?: ValidationResult;
  year?: ValidationResult;
  make?: ValidationResult;
  model?: ValidationResult;
  mileage?: ValidationResult;
  location?: ValidationResult;
  marketValue?: ValidationResult;
  settlementValue?: ValidationResult;
}

export function EditAppraisalDialog({
  isOpen,
  appraisalId,
  initialData,
  onSave,
  onCancel
}: EditAppraisalDialogProps) {
  const { createError, updateAppraisalData } = useAppStore();
  const [formData, setFormData] = useState<ExtractedVehicleData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [validations, setValidations] = useState<FormValidations>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
      setDuplicateWarning(null);
      setValidations({});
      setTouched(new Set());
    }
  }, [isOpen, initialData]);

  // Real-time validation
  useEffect(() => {
    const newValidations: FormValidations = {};

    if (touched.has('vin')) {
      newValidations.vin = validateVIN(formData.vin);
    }

    if (touched.has('year')) {
      newValidations.year = validateYear(formData.year);
    }

    if (touched.has('make')) {
      newValidations.make = validateMakeModel(formData.make, 'Make');
    }

    if (touched.has('model')) {
      newValidations.model = validateMakeModel(formData.model, 'Model');
    }

    if (touched.has('mileage')) {
      newValidations.mileage = validateMileage(formData.mileage, { year: formData.year });
    }

    if (touched.has('location')) {
      newValidations.location = validateLocation(formData.location);
    }

    if (touched.has('marketValue') && formData.marketValue) {
      newValidations.marketValue = validatePrice(formData.marketValue, { fieldName: 'Market Value' });
    }

    if (touched.has('settlementValue') && formData.settlementValue) {
      newValidations.settlementValue = validatePrice(formData.settlementValue, { fieldName: 'Settlement Value' });
    }

    setValidations(newValidations);
  }, [formData, touched]);

  // Check for duplicates when VIN changes
  useEffect(() => {
    const checkDuplicates = async () => {
      if (formData.vin && formData.vin !== initialData.vin) {
        try {
          const hasDuplicate = await window.electron.hasDuplicate(formData.vin, appraisalId);
          if (hasDuplicate) {
            setDuplicateWarning('Warning: Another appraisal with this VIN already exists');
          } else {
            setDuplicateWarning(null);
          }
        } catch (error) {
          console.error('Error checking duplicates:', error);
        }
      } else {
        setDuplicateWarning(null);
      }
    };

    const timeoutId = setTimeout(checkDuplicates, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.vin, initialData.vin, appraisalId]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  const handleFieldChange = (field: keyof ExtractedVehicleData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => new Set(prev).add(field));
  };

  const handleBlur = (field: string) => {
    setTouched(prev => new Set(prev).add(field));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all required fields as touched
    const requiredFields = ['vin', 'year', 'make', 'model', 'mileage', 'location'];
    setTouched(new Set(requiredFields));

    // Validate all required fields
    const allValidations: FormValidations = {
      vin: validateVIN(formData.vin),
      year: validateYear(formData.year),
      make: validateMakeModel(formData.make, 'Make'),
      model: validateMakeModel(formData.model, 'Model'),
      mileage: validateMileage(formData.mileage, { year: formData.year }),
      location: validateLocation(formData.location)
    };

    if (formData.marketValue) {
      allValidations.marketValue = validatePrice(formData.marketValue, { fieldName: 'Market Value' });
    }

    if (formData.settlementValue) {
      allValidations.settlementValue = validatePrice(formData.settlementValue, { fieldName: 'Settlement Value' });
    }

    setValidations(allValidations);

    // Check for validation errors
    const hasErrors = Object.values(allValidations).some(v => !v.valid);
    if (hasErrors) {
      const errorCount = Object.values(allValidations).filter(v => !v.valid).length;
      announceToScreenReader(
        `Form has ${errorCount} validation ${errorCount === 1 ? 'error' : 'errors'}. Please fix them before submitting.`,
        'assertive'
      );
      createError(
        ErrorType.PROCESSING_FAILED,
        `Please fix ${errorCount} validation ${errorCount === 1 ? 'error' : 'errors'}`,
        undefined,
        true,
        'Review the highlighted fields and correct the errors'
      );
      return;
    }

    setIsSaving(true);
    try {
      await window.electron.updateAppraisal(appraisalId, formData);
      
      // Update the store with the new data and trigger recalculation if condition changed
      await updateAppraisalData(formData);
      
      announceToScreenReader('Appraisal updated successfully', 'polite');
      onSave(formData);
    } catch (error) {
      createError(
        ErrorType.STORAGE_ERROR,
        'Failed to update appraisal',
        error,
        true,
        'Please try again or contact support if the problem persists'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 my-8">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Edit Appraisal
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* VIN */}
            <ValidatedInput
              id="edit-vin"
              label="VIN"
              value={formData.vin}
              onChange={(value) => handleFieldChange('vin', value.toUpperCase())}
              onBlur={() => handleBlur('vin')}
              validation={validations.vin}
              required
              maxLength={17}
              placeholder="17-character VIN"
              tooltip="Vehicle Identification Number - must be exactly 17 characters"
              showValidIcon
              autoFocusOnError={!validations.vin?.valid}
            />
            {duplicateWarning && (
              <div className="flex items-start gap-1.5 -mt-2">
                <ExclamationCircleIcon className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-700">{duplicateWarning}</p>
              </div>
            )}

            {/* Year, Make, Model */}
            <div className="grid grid-cols-3 gap-4">
              <ValidatedInput
                id="edit-year"
                label="Year"
                type="number"
                value={formData.year?.toString() || ''}
                onChange={(value) => handleFieldChange('year', value ? parseInt(value) : 0)}
                onBlur={() => handleBlur('year')}
                validation={validations.year}
                required
                min={1900}
                max={new Date().getFullYear() + 1}
                placeholder="2020"
                tooltip="Model year of the vehicle"
                showValidIcon
              />
              <ValidatedInput
                id="edit-make"
                label="Make"
                value={formData.make}
                onChange={(value) => handleFieldChange('make', value)}
                onBlur={() => handleBlur('make')}
                validation={validations.make}
                required
                placeholder="Toyota"
                tooltip="Vehicle manufacturer"
                showValidIcon
              />
              <ValidatedInput
                id="edit-model"
                label="Model"
                value={formData.model}
                onChange={(value) => handleFieldChange('model', value)}
                onBlur={() => handleBlur('model')}
                validation={validations.model}
                required
                placeholder="Camry"
                tooltip="Vehicle model name"
                showValidIcon
              />
            </div>

            {/* Trim */}
            <ValidatedInput
              id="edit-trim"
              label="Trim"
              value={formData.trim || ''}
              onChange={(value) => handleFieldChange('trim', value)}
              placeholder="SE, XLE, Limited, etc."
              helpText="Optional: Trim level or package"
            />

            {/* Condition */}
            <div>
              <label htmlFor="edit-condition" className="block text-sm font-medium text-gray-700 mb-1">
                Condition
              </label>
              <select
                id="edit-condition"
                value={formData.condition || 'Good'}
                onChange={(e) => handleFieldChange('condition', e.target.value as 'Excellent' | 'Good' | 'Fair' | 'Poor')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Vehicle condition affects market value calculations
              </p>
            </div>

            {/* Mileage and Location */}
            <div className="grid grid-cols-2 gap-4">
              <ValidatedInput
                id="edit-mileage"
                label="Mileage"
                type="number"
                value={formData.mileage?.toString() || ''}
                onChange={(value) => handleFieldChange('mileage', value ? parseInt(value) : 0)}
                onBlur={() => handleBlur('mileage')}
                validation={validations.mileage}
                required
                min={0}
                placeholder="50000"
                tooltip="Current odometer reading"
                showValidIcon
              />
              <ValidatedInput
                id="edit-location"
                label="Location"
                value={formData.location}
                onChange={(value) => handleFieldChange('location', value)}
                onBlur={() => handleBlur('location')}
                validation={validations.location}
                required
                placeholder="Los Angeles, CA"
                tooltip="Vehicle location in City, ST format"
                helpText="Format: City, ST (e.g., Los Angeles, CA)"
                showValidIcon
              />
            </div>

            {/* Market Value and Settlement Value */}
            <div className="grid grid-cols-2 gap-4">
              <ValidatedInput
                id="edit-market-value"
                label="Market Value"
                type="number"
                value={formData.marketValue?.toString() || ''}
                onChange={(value) => handleFieldChange('marketValue', value ? parseFloat(value) : undefined)}
                onBlur={() => handleBlur('marketValue')}
                validation={validations.marketValue}
                min={0}
                step={0.01}
                placeholder="25000"
                tooltip="Estimated market value from the report"
                helpText="Optional: From valuation report"
              />
              <ValidatedInput
                id="edit-settlement-value"
                label="Settlement Value"
                type="number"
                value={formData.settlementValue?.toString() || ''}
                onChange={(value) => handleFieldChange('settlementValue', value ? parseFloat(value) : undefined)}
                onBlur={() => handleBlur('settlementValue')}
                validation={validations.settlementValue}
                min={0}
                step={0.01}
                placeholder="24500"
                tooltip="Settlement offer from insurance company"
                helpText="Optional: From insurance settlement"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSaving}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
