import React, { useState } from 'react';
import '../components/FormBuilder.css'; // Assuming a CSS file for styling

const FormBuilder = ({ onFormChange, initialFormFields = [] }) => {
    const [formFields, setFormFields] = useState(initialFormFields);
    const [newFieldType, setNewFieldType] = useState('text');
    const [newFieldLabel, setNewFieldLabel] = useState('');

    const addField = () => {
        if (!newFieldLabel.trim()) return;

        const newField = {
            id: Date.now(), // Unique ID for the field
            label: newFieldLabel,
            type: newFieldType,
            required: false,
            options: newFieldType === 'dropdown' ? ['Option 1', 'Option 2'] : [], // Default options for dropdown
        };
        const updatedFormFields = [...formFields, newField];
        setFormFields(updatedFormFields);
        onFormChange(updatedFormFields);
        setNewFieldLabel('');
    };

    const removeField = (id) => {
        const updatedFormFields = formFields.filter((field) => field.id !== id);
        setFormFields(updatedFormFields);
        onFormChange(updatedFormFields);
    };

    const toggleRequired = (id) => {
        const updatedFormFields = formFields.map((field) =>
            field.id === id ? { ...field, required: !field.required } : field
        );
        setFormFields(updatedFormFields);
        onFormChange(updatedFormFields);
    };

    const moveField = (id, direction) => {
        const index = formFields.findIndex((field) => field.id === id);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= formFields.length) return;

        const updatedFormFields = [...formFields];
        const [movedField] = updatedFormFields.splice(index, 1);
        updatedFormFields.splice(newIndex, 0, movedField);
        setFormFields(updatedFormFields);
        onFormChange(updatedFormFields);
    };

    const handleOptionChange = (fieldId, optionIndex, newValue) => {
        const updatedFormFields = formFields.map(field => {
            if (field.id === fieldId && field.type === 'dropdown') {
                const newOptions = [...field.options];
                newOptions[optionIndex] = newValue;
                return { ...field, options: newOptions };
            }
            return field;
        });
        setFormFields(updatedFormFields);
        onFormChange(updatedFormFields);
    };

    const addOption = (fieldId) => {
        const updatedFormFields = formFields.map(field => {
            if (field.id === fieldId && field.type === 'dropdown') {
                return { ...field, options: [...field.options, `Option ${field.options.length + 1}`] };
            }
            return field;
        });
        setFormFields(updatedFormFields);
        onFormChange(updatedFormFields);
    };

    const removeOption = (fieldId, optionIndex) => {
        const updatedFormFields = formFields.map(field => {
            if (field.id === fieldId && field.type === 'dropdown') {
                const newOptions = field.options.filter((_, idx) => idx !== optionIndex);
                return { ...field, options: newOptions };
            }
            return field;
        });
        setFormFields(updatedFormFields);
        onFormChange(updatedFormFields);
    };


    return (
        <div className="form-builder-container">
            <h3>Custom Registration Form Builder</h3>
            <div className="add-field-section">
                <input
                    type="text"
                    placeholder="Field Label"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                />
                <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)}>
                    <option value="text">Text Input</option>
                    <option value="email">Email Input</option>
                    <option value="number">Number Input</option>
                    <option value="textarea">Text Area</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="file">File Upload</option>
                </select>
                <button onClick={addField}>Add Field</button>
            </div>

            <div className="form-fields-list">
                {formFields.length === 0 ? (
                    <p>No custom fields added yet.</p>
                ) : (
                    formFields.map((field, index) => (
                        <div key={field.id} className="form-field-item">
                            <span>{field.label} ({field.type}) {field.required && '*'}</span>
                            <div className="field-controls">
                                <button onClick={() => toggleRequired(field.id)}>
                                    {field.required ? 'Make Flexible' : 'Make Required'}
                                </button>
                                <button onClick={() => moveField(field.id, 'up')} disabled={index === 0}>
                                    Up
                                </button>
                                <button onClick={() => moveField(field.id, 'down')} disabled={index === formFields.length - 1}>
                                    Down
                                </button>
                                <button onClick={() => removeField(field.id)}>Remove</button>
                            </div>
                            {field.type === 'dropdown' && (
                                <div className="dropdown-options">
                                    <h4>Options:</h4>
                                    {field.options.map((option, optIndex) => (
                                        <div key={optIndex} className="dropdown-option-item">
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={(e) => handleOptionChange(field.id, optIndex, e.target.value)}
                                            />
                                            <button onClick={() => removeOption(field.id, optIndex)}>Remove Option</button>
                                        </div>
                                    ))}
                                    <button onClick={() => addOption(field.id)}>Add Option</button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default FormBuilder;