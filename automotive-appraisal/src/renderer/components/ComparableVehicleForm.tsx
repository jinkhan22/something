import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ComparableVehicle, ExtractedVehicleData, QualityScoreBreakdown } from '../../types';
import { QualityScoreCalculator } from '../services/qualityScoreCalculator';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useFocusManagement, useFormFocusManagement } from '../hooks/useFocusManagement';
import { announceToScreenReader, announceValidationErrors, announceSuccess, createErrorAttributes } from '../utils/accessibility';
import { Tooltip } from './Tooltip';

interface ComparableVehicleFormProps {
  appraisalId: string;
  lossVehicle: ExtractedVehicleData;
  existingComparable?: ComparableVehicle;
  onSave: (comparable: ComparableVehicle) => void;
  onCancel: () => void;
}

interface FormData {
  source: string;
  sourceUrl: string;
  year: string;
  make: string;
  model: string;
  vin: string;
  trim: string;
  mileage: string;
  location: string;
  listPrice: string;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  equipment: string[];
  notes: string;
}

interface FormErrors {
  source?: string;
  year?: string;
  make?: string;
  model?: string;
  mileage?: string;
  location?: string;
  listPrice?: string;
  equipment?: string;
}

const COMMON_EQUIPMENT = [
  'Navigation',
  'Sunroof',
  'Premium Audio',
  'Sport Package',
  'Leather Seats',
  'Heated Seats',
  'Backup Camera',
  'Blind Spot Monitoring',
  'Adaptive Cruise Control',
  'Parking Sensors',
  'Keyless Entry',
  'Remote Start',
  'Tow Package',
  'All-Wheel Drive',
  'Premium Wheels'
];

const SOURCES = [
  'AutoTrader',
  'Cars.com',
  'CarMax',
  'Carvana',
  'CarGurus',
  'Manual Entry',
  'Other'
];

export const ComparableVehicleForm: React.FC<ComparableVehicleFormProps> = ({
  appraisalId,
  lossVehicle,
  existingComparable,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<FormData>({
    source: existingComparable?.source || '',
    sourceUrl: existingComparable?.sourceUrl || '',
    year: existingComparable?.year?.toString() || '',
    make: existingComparable?.make || '',
    model: existingComparable?.model || '',
    vin: existingComparable?.vin || '',
    trim: existingComparable?.trim || '',
    mileage: existingComparable?.mileage?.toString() || '',
    location: existingComparable?.location || '',
    listPrice: existingComparable?.listPrice?.toString() || '',
    condition: existingComparable?.condition || 'Good',
    equipment: existingComparable?.equipment || [],
    notes: existingComparable?.notes || ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [previewScore, setPreviewScore] = useState<QualityScoreBreakdown | null>(null);

  const qualityCalculator = useMemo(() => new QualityScoreCalculator(), []);
  
  // Accessibility hooks
  const { containerRef, focusFirstError } = useFocusManagement({ autoFocus: true, trapFocus: true });
  const { setFirstErrorRef, focusFirstError: focusFirstFormError, clearFirstError } = useFormFocusManagement();
  
  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: () => {
      const form = containerRef.current?.querySelector('form');
      if (form) {
        form.requestSubmit();
      }
    },
    onCancel,
    context: 'form'
  });

  // Auto-complete suggestions based on loss vehicle
  const makeSuggestions = useMemo(() => {
    const suggestions = [lossVehicle.make];
    // Add common variations
    if (lossVehicle.make) {
      suggestions.push(lossVehicle.make);
    }
    return [...new Set(suggestions)].filter(Boolean);
  }, [lossVehicle.make]);

  const modelSuggestions = useMemo(() => {
    if (formData.make === lossVehicle.make) {
      return [lossVehicle.model].filter(Boolean);
    }
    return [];
  }, [formData.make, lossVehicle.make, lossVehicle.model]);

  // Real-time validation
  useEffect(() => {
    const newErrors: FormErrors = {};

    if (touched.has('source') && !formData.source) {
      newErrors.source = 'Source is required';
    }

    if (touched.has('year')) {
      const year = parseInt(formData.year);
      const currentYear = new Date().getFullYear();
      if (!formData.year) {
        newErrors.year = 'Year is required';
      } else if (isNaN(year) || year < 1900 || year > currentYear + 1) {
        newErrors.year = `Year must be between 1900 and ${currentYear + 1}`;
      }
    }

    if (touched.has('make') && !formData.make) {
      newErrors.make = 'Make is required';
    }

    if (touched.has('model') && !formData.model) {
      newErrors.model = 'Model is required';
    }

    if (touched.has('mileage')) {
      const mileage = parseInt(formData.mileage);
      if (!formData.mileage) {
        newErrors.mileage = 'Mileage is required';
      } else if (isNaN(mileage) || mileage < 0) {
        newErrors.mileage = 'Mileage must be a positive number';
      } else if (mileage > 500000) {
        newErrors.mileage = 'Mileage seems unrealistically high';
      } else if (formData.year) {
        const year = parseInt(formData.year);
        const vehicleAge = new Date().getFullYear() - year;
        const avgMilesPerYear = mileage / Math.max(vehicleAge, 1);
        if (avgMilesPerYear > 30000) {
          newErrors.mileage = `High mileage for age (${Math.round(avgMilesPerYear)} miles/year)`;
        }
      }
    }

    if (touched.has('location')) {
      if (!formData.location) {
        newErrors.location = 'Location is required';
      } else if (!/^[A-Za-z\s]+,\s*[A-Z]{2}$/.test(formData.location)) {
        newErrors.location = 'Format: City, ST (e.g., Los Angeles, CA)';
      }
    }

    if (touched.has('listPrice')) {
      const price = parseFloat(formData.listPrice);
      if (!formData.listPrice) {
        newErrors.listPrice = 'Price is required';
      } else if (isNaN(price) || price <= 0) {
        newErrors.listPrice = 'Price must be a positive number';
      } else if (price < 500) {
        newErrors.listPrice = 'Price seems unrealistically low';
      } else if (price > 500000) {
        newErrors.listPrice = 'Price seems unrealistically high';
      }
    }

    setErrors(newErrors);
    
    // Announce validation errors to screen readers
    if (Object.keys(newErrors).length > 0) {
      const errorMessages = Object.values(newErrors);
      announceValidationErrors(errorMessages);
    } else if (touched.size > 0) {
      clearFirstError();
    }
  }, [formData, touched, clearFirstError]);

  // Real-time quality score preview
  useEffect(() => {
    if (
      formData.year &&
      formData.make &&
      formData.model &&
      formData.mileage &&
      formData.location &&
      !errors.year &&
      !errors.mileage
    ) {
      try {
        const partialComparable = {
          year: parseInt(formData.year),
          make: formData.make,
          model: formData.model,
          mileage: parseInt(formData.mileage),
          location: formData.location,
          distanceFromLoss: 50, // Placeholder until geocoded
          equipment: formData.equipment,
          condition: formData.condition
        };

        const score = qualityCalculator.calculateScore(partialComparable, lossVehicle);
        setPreviewScore(score);
      } catch (error) {
        setPreviewScore(null);
      }
    } else {
      setPreviewScore(null);
    }
  }, [formData, errors, lossVehicle, qualityCalculator]);

  const handleChange = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => new Set(prev).add(field));
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched(prev => new Set(prev).add(field));
  };

  const toggleEquipment = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.includes(feature)
        ? prev.equipment.filter(f => f !== feature)
        : [...prev.equipment, feature]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const allFields = new Set(Object.keys(formData));
    setTouched(allFields);

    // Validate all required fields
    const requiredFields = ['source', 'year', 'make', 'model', 'mileage', 'location', 'listPrice'];
    const hasErrors = requiredFields.some(field => {
      const value = formData[field as keyof FormData];
      return !value || (typeof value === 'string' && value.trim() === '');
    });

    if (hasErrors || Object.keys(errors).length > 0) {
      // Focus on first error field
      focusFirstFormError();
      announceToScreenReader('Please fix the validation errors before submitting', 'assertive');
      return;
    }

    const comparable: ComparableVehicle = {
      id: existingComparable?.id || `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      appraisalId,
      source: formData.source,
      sourceUrl: formData.sourceUrl || undefined,
      dateAdded: existingComparable?.dateAdded || new Date(),
      year: parseInt(formData.year),
      make: formData.make,
      model: formData.model,
      vin: formData.vin || undefined,
      trim: formData.trim || undefined,
      mileage: parseInt(formData.mileage),
      location: formData.location,
      distanceFromLoss: 0, // Will be calculated by service
      listPrice: parseFloat(formData.listPrice),
      condition: formData.condition,
      equipment: formData.equipment,
      qualityScore: 0, // Will be calculated by service
      qualityScoreBreakdown: {
        baseScore: 100,
        distancePenalty: 0,
        agePenalty: 0,
        ageBonus: 0,
        mileagePenalty: 0,
        mileageBonus: 0,
        equipmentPenalty: 0,
        equipmentBonus: 0,
        finalScore: 0,
        explanations: {
          distance: '',
          age: '',
          mileage: '',
          equipment: ''
        }
      },
      adjustments: {
        mileageAdjustment: {
          mileageDifference: 0,
          depreciationRate: 0,
          adjustmentAmount: 0,
          explanation: ''
        },
        equipmentAdjustments: [],
        conditionAdjustment: {
          comparableCondition: formData.condition,
          lossVehicleCondition: lossVehicle.condition || 'Good',
          multiplier: 1,
          adjustmentAmount: 0,
          explanation: ''
        },
        totalAdjustment: 0,
        adjustedPrice: parseFloat(formData.listPrice)
      },
      notes: formData.notes || undefined,
      createdAt: existingComparable?.createdAt || new Date(),
      updatedAt: new Date()
    };

    // Announce success
    const action = existingComparable ? 'updated' : 'added';
    announceSuccess(`Comparable vehicle ${action} successfully`);
    
    onSave(comparable);
  };

  const isFormValid = () => {
    const requiredFields = ['source', 'year', 'make', 'model', 'mileage', 'location', 'listPrice'];
    const allFilled = requiredFields.every(field => {
      const value = formData[field as keyof FormData];
      return value && (typeof value !== 'string' || value.trim() !== '');
    });
    return allFilled && Object.keys(errors).length === 0;
  };

  return (
    <div 
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto"
      role="dialog"
      aria-labelledby="form-title"
      aria-describedby="form-description"
    >
      <h2 id="form-title" className="text-2xl font-bold mb-6">
        {existingComparable ? 'Edit Comparable Vehicle' : 'Add Comparable Vehicle'}
      </h2>
      
      <p id="form-description" className="sr-only">
        {existingComparable 
          ? 'Edit the details of the comparable vehicle. Required fields are marked with an asterisk.' 
          : 'Add a new comparable vehicle to your market analysis. Required fields are marked with an asterisk.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Source Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label htmlFor="source" className="block text-sm font-medium text-gray-700">
                Source <span className="text-red-500" aria-label="required">*</span>
              </label>
              <Tooltip content="Select where you found this comparable vehicle. This helps track data sources and credibility for your analysis.">
                <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <select
              id="source"
              value={formData.source}
              onChange={(e) => handleChange('source', e.target.value)}
              onBlur={() => handleBlur('source')}
              required
              aria-required="true"
              aria-invalid={errors.source ? 'true' : 'false'}
              aria-describedby={errors.source ? 'source-error' : 'source-help'}
              ref={errors.source ? setFirstErrorRef : undefined}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.source ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select source...</option>
              {SOURCES.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
            {errors.source && (
              <p id="source-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.source}
              </p>
            )}
            <p id="source-help" className="mt-1 text-xs text-gray-500">
              Choose the website or platform where you found this comparable
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <label htmlFor="sourceUrl" className="block text-sm font-medium text-gray-700">
                Source URL
              </label>
              <Tooltip content="Optional: Paste the direct link to the vehicle listing. This allows you to quickly reference the original listing later.">
                <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <input
              id="sourceUrl"
              type="url"
              value={formData.sourceUrl}
              onChange={(e) => handleChange('sourceUrl', e.target.value)}
              placeholder="https://..."
              aria-label="Source URL for the comparable vehicle listing"
              aria-describedby="sourceUrl-help"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p id="sourceUrl-help" className="mt-1 text-xs text-gray-500">
              Link to the original listing for future reference
            </p>
          </div>
        </div>

        {/* Vehicle Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                Year <span className="text-red-500" aria-label="required">*</span>
              </label>
              <Tooltip content="Model year of the comparable vehicle. Closer years to your loss vehicle will receive higher quality scores (within 2 years is ideal).">
                <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <input
              id="year"
              type="number"
              value={formData.year}
              onChange={(e) => handleChange('year', e.target.value)}
              onBlur={() => handleBlur('year')}
              placeholder={lossVehicle.year?.toString() || '2020'}
              required
              aria-required="true"
              aria-invalid={errors.year ? 'true' : 'false'}
              aria-describedby={errors.year ? 'year-error' : 'year-help'}
              ref={errors.year && !errors.source ? setFirstErrorRef : undefined}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.year ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.year && (
              <p id="year-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.year}
              </p>
            )}
            <p id="year-help" className="mt-1 text-xs text-gray-500">
              Loss vehicle: {lossVehicle.year || 'Unknown'}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <label htmlFor="make" className="block text-sm font-medium text-gray-700">
                Make <span className="text-red-500" aria-label="required">*</span>
              </label>
              <Tooltip content="Vehicle manufacturer. Same make as your loss vehicle will receive the highest quality score. Different makes are still valuable for market analysis.">
                <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <input
              id="make"
              type="text"
              value={formData.make}
              onChange={(e) => handleChange('make', e.target.value)}
              onBlur={() => handleBlur('make')}
              placeholder={lossVehicle.make || 'Toyota'}
              list="make-suggestions"
              required
              aria-required="true"
              aria-invalid={errors.make ? 'true' : 'false'}
              aria-describedby={errors.make ? 'make-error' : 'make-help'}
              aria-autocomplete="list"
              ref={errors.make && !errors.source && !errors.year ? setFirstErrorRef : undefined}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.make ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <datalist id="make-suggestions">
              {makeSuggestions.map(make => (
                <option key={make} value={make} />
              ))}
            </datalist>
            {errors.make && (
              <p id="make-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.make}
              </p>
            )}
            <p id="make-help" className="mt-1 text-xs text-gray-500">
              Loss vehicle: {lossVehicle.make || 'Unknown'}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <label htmlFor="model" className="block text-sm font-medium text-gray-700">
                Model <span className="text-red-500" aria-label="required">*</span>
              </label>
              <Tooltip content="Specific model name. Same model as your loss vehicle provides the most accurate comparison. Similar models in the same class are also valuable.">
                <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <input
              id="model"
              type="text"
              value={formData.model}
              onChange={(e) => handleChange('model', e.target.value)}
              onBlur={() => handleBlur('model')}
              placeholder={lossVehicle.model || 'Camry'}
              list="model-suggestions"
              required
              aria-required="true"
              aria-invalid={errors.model ? 'true' : 'false'}
              aria-describedby={errors.model ? 'model-error' : 'model-help'}
              aria-autocomplete="list"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.model ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <datalist id="model-suggestions">
              {modelSuggestions.map(model => (
                <option key={model} value={model} />
              ))}
            </datalist>
            {errors.model && (
              <p id="model-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.model}
              </p>
            )}
            <p id="model-help" className="mt-1 text-xs text-gray-500">
              Loss vehicle: {lossVehicle.model || 'Unknown'}
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <label htmlFor="vin" className="block text-sm font-medium text-gray-700">
              VIN
            </label>
            <Tooltip content="Vehicle Identification Number (17 characters). The unique identifier for this comparable vehicle. Helps track and verify the specific vehicle being used as a comparable.">
              <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </Tooltip>
          </div>
          <input
            id="vin"
            type="text"
            value={formData.vin}
            onChange={(e) => handleChange('vin', e.target.value.toUpperCase())}
            placeholder="1HGBH41JXMN109186"
            maxLength={17}
            aria-describedby="vin-help"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <p id="vin-help" className="mt-1 text-xs text-gray-500">
            Optional: VIN of the comparable vehicle (17 characters)
          </p>
        </div>

        {/* Mileage and Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label htmlFor="mileage" className="block text-sm font-medium text-gray-700">
                Mileage <span className="text-red-500">*</span>
              </label>
              <Tooltip content="Total odometer reading. Mileage within 20% of your loss vehicle gets bonus points. System will automatically calculate mileage adjustments based on vehicle age.">
                <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <input
              id="mileage"
              type="number"
              value={formData.mileage}
              onChange={(e) => handleChange('mileage', e.target.value)}
              onBlur={() => handleBlur('mileage')}
              placeholder={lossVehicle.mileage?.toString() || '50000'}
              aria-describedby="mileage-help"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.mileage ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.mileage && (
              <p className="mt-1 text-sm text-red-600">{errors.mileage}</p>
            )}
            <p id="mileage-help" className="mt-1 text-xs text-gray-500">
              Loss vehicle: {lossVehicle.mileage?.toLocaleString() || 'Unknown'} miles
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <label htmlFor="listPrice" className="block text-sm font-medium text-gray-700">
                List Price <span className="text-red-500">*</span>
              </label>
              <Tooltip content="Asking price from the listing. This will be adjusted for mileage, equipment, and condition differences to calculate the final comparable value.">
                <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                id="listPrice"
                type="number"
                step="0.01"
                value={formData.listPrice}
                onChange={(e) => handleChange('listPrice', e.target.value)}
                onBlur={() => handleBlur('listPrice')}
                placeholder="25000"
                aria-describedby="listPrice-help"
                className={`w-full pl-7 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.listPrice ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.listPrice && (
              <p className="mt-1 text-sm text-red-600">{errors.listPrice}</p>
            )}
            <p id="listPrice-help" className="mt-1 text-xs text-gray-500">
              Enter the advertised asking price
            </p>
          </div>
        </div>

        {/* Location */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location <span className="text-red-500">*</span>
            </label>
            <Tooltip content="Where the comparable vehicle is located. Closer locations (within 100 miles) receive higher quality scores. Distance is automatically calculated from your loss vehicle location.">
              <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </Tooltip>
          </div>
          <input
            id="location"
            type="text"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            onBlur={() => handleBlur('location')}
            placeholder="Los Angeles, CA"
            aria-describedby="location-help"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.location ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.location && (
            <p className="mt-1 text-sm text-red-600">{errors.location}</p>
          )}
          <p id="location-help" className="mt-1 text-xs text-gray-500">
            Format: City, ST (e.g., Los Angeles, CA) • Loss vehicle: {lossVehicle.location || 'Unknown'}
          </p>
        </div>

        {/* Condition */}
        <div role="group" aria-labelledby="condition-label">
          <div className="flex items-center gap-2 mb-2">
            <label id="condition-label" className="block text-sm font-medium text-gray-700">
              Condition <span className="text-red-500" aria-label="required">*</span>
            </label>
            <Tooltip content="Overall condition of the comparable vehicle. This affects the final adjusted price: Excellent (+5%), Good (baseline), Fair (-5%), Poor (-15%). Choose based on the listing description and photos.">
              <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </Tooltip>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(['Excellent', 'Good', 'Fair', 'Poor'] as const).map(condition => (
              <button
                key={condition}
                type="button"
                onClick={() => handleChange('condition', condition)}
                role="radio"
                aria-checked={formData.condition === condition}
                aria-label={`Condition: ${condition}`}
                className={`px-4 py-2 rounded-md border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  formData.condition === condition
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                {condition}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500 grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="text-center">Like new, no issues</div>
            <div className="text-center">Minor wear, well maintained</div>
            <div className="text-center">Noticeable wear, some issues</div>
            <div className="text-center">Significant wear/damage</div>
          </div>
        </div>

        {/* Equipment */}
        <div role="group" aria-labelledby="equipment-label">
          <div className="flex items-center gap-2 mb-2">
            <label id="equipment-label" className="block text-sm font-medium text-gray-700">
              Equipment Features
            </label>
            <Tooltip content="Select all features this comparable has. Equipment matching your loss vehicle gets bonus points (+15 for all matches). Missing features get penalties (-10 each), extra features get small bonuses (+5 each). Standard values are used for price adjustments.">
              <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </Tooltip>
          </div>
          <div 
            className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-md"
            role="group"
            aria-describedby="equipment-count equipment-help"
          >
            {COMMON_EQUIPMENT.map(feature => (
              <label
                key={feature}
                className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={formData.equipment.includes(feature)}
                  onChange={() => toggleEquipment(feature)}
                  aria-label={`Equipment feature: ${feature}`}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{feature}</span>
              </label>
            ))}
          </div>
          <p id="equipment-count" className="mt-1 text-sm text-gray-500" aria-live="polite">
            Selected: {formData.equipment.length} feature{formData.equipment.length !== 1 ? 's' : ''}
          </p>
          <p id="equipment-help" className="mt-1 text-xs text-gray-500">
            Select all features mentioned in the listing. Loss vehicle equipment: {lossVehicle.equipment?.join(', ') || 'None specified'}
          </p>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
            placeholder="Additional notes about this comparable..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Quality Score Preview */}
        {previewScore && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-blue-900">Quality Score Preview</h3>
              <Tooltip content="Quality scores range from 0-120+. Scores above 80 are excellent, 60-80 are good, below 60 may need better comparables. This preview uses estimated distance - final score calculated after saving.">
                <svg className="w-4 h-4 text-blue-600 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`text-3xl font-bold ${
                previewScore.finalScore >= 80 ? 'text-green-700' :
                previewScore.finalScore >= 60 ? 'text-yellow-700' : 'text-red-700'
              }`}>
                {previewScore.finalScore.toFixed(1)}
              </div>
              <div className="text-sm text-blue-600 flex-1">
                <p className="font-medium">
                  {previewScore.finalScore >= 80 ? 'Excellent comparable!' :
                   previewScore.finalScore >= 60 ? 'Good comparable' : 'Consider finding a closer match'}
                </p>
                <p className="text-xs mt-1">
                  Final score calculated after geocoding. Based on year, mileage, equipment, and estimated distance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel and close form"
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel <span className="sr-only">(Press Escape)</span>
          </button>
          <button
            type="submit"
            disabled={!isFormValid()}
            aria-label={existingComparable ? 'Update comparable vehicle' : 'Add comparable vehicle'}
            aria-disabled={!isFormValid()}
            className={`px-6 py-2 rounded-md text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isFormValid()
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {existingComparable ? 'Update Comparable' : 'Add Comparable'}
            <span className="sr-only">(Press Command+S)</span>
          </button>
        </div>
      </form>
    </div>
  );
};
