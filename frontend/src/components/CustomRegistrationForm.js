import React, { useState } from 'react';

const CustomRegistrationForm = ({ registrationForm, onSubmit, loading }) => {
    const [formData, setFormData] = useState({});

    const handleChange = (fieldId, value) => {
        setFormData(prev => ({
            ...prev,
            [fieldId]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const renderFormField = (field) => {
        const commonProps = {
            id: field.id,
            required: field.required,
            className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        };

        switch (field.type) {
            case 'text':
            case 'email':
            case 'tel':
                return (
                    <input
                        type={field.type}
                        {...commonProps}
                        placeholder={field.placeholder || ''}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                    />
                );

            case 'textarea':
                return (
                    <textarea
                        {...commonProps}
                        placeholder={field.placeholder || ''}
                        rows={4}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                    />
                );

            case 'select':
                return (
                    <select
                        {...commonProps}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                    >
                        <option value="">Select an option</option>
                        {field.options?.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                );

            case 'radio':
                return (
                    <div className="space-y-2">
                        {field.options?.map(option => (
                            <label key={option.value} className="flex items-center">
                                <input
                                    type="radio"
                                    name={field.id}
                                    value={option.value}
                                    checked={formData[field.id] === option.value}
                                    onChange={(e) => handleChange(field.id, e.target.value)}
                                    className="mr-2"
                                    required={field.required}
                                />
                                {option.label}
                            </label>
                        ))}
                    </div>
                );

            case 'checkbox':
                return (
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={formData[field.id] || false}
                            onChange={(e) => handleChange(field.id, e.target.checked)}
                            className="mr-2"
                            required={field.required}
                        />
                        {field.label}
                    </label>
                );

            case 'number':
                return (
                    <input
                        type="number"
                        {...commonProps}
                        placeholder={field.placeholder || ''}
                        min={field.min}
                        max={field.max}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                    />
                );

            case 'date':
                return (
                    <input
                        type="date"
                        {...commonProps}
                        min={field.min}
                        max={field.max}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                    />
                );

            default:
                return (
                    <input
                        type="text"
                        {...commonProps}
                        placeholder={field.placeholder || ''}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                    />
                );
        }
    };

    if (!registrationForm || registrationForm.length === 0) {
        return null;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                {registrationForm.map((field, index) => (
                    <div key={field.id || index}>
                        <label htmlFor={field.id || index} className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {renderFormField(field)}
                        {field.description && (
                            <p className="text-sm text-gray-500 mt-1">{field.description}</p>
                        )}
                    </div>
                ))}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Submitting...' : 'Submit Registration'}
                </button>
            </form>
        </div>
    );
};

export default CustomRegistrationForm;
