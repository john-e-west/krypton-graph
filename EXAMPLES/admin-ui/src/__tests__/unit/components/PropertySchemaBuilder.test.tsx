import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PropertySchemaBuilder from '../../../components/editor/PropertySchemaBuilder';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

const mockProperties = [
  {
    id: 'prop-1',
    name: 'firstName',
    type: 'string',
    required: true,
    description: 'First name of the person',
    constraints: { minLength: 1, maxLength: 50 },
  },
  {
    id: 'prop-2',
    name: 'age',
    type: 'number',
    required: false,
    description: 'Age in years',
    constraints: { min: 0, max: 120 },
  },
];

const mockOnChange = jest.fn();

describe('PropertySchemaBuilder', () => {
  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders empty state when no properties', () => {
    renderWithTheme(
      <PropertySchemaBuilder properties={[]} onChange={mockOnChange} />
    );
    
    expect(screen.getByText('No properties defined')).toBeInTheDocument();
    expect(screen.getByText('Add properties to define the structure of this entity')).toBeInTheDocument();
    expect(screen.getByText('Add First Property')).toBeInTheDocument();
  });

  it('renders properties list when properties exist', () => {
    renderWithTheme(
      <PropertySchemaBuilder properties={mockProperties} onChange={mockOnChange} />
    );
    
    expect(screen.getByText('Properties (2)')).toBeInTheDocument();
    expect(screen.getByText('firstName')).toBeInTheDocument();
    expect(screen.getByText('age')).toBeInTheDocument();
  });

  it('shows property types and required status', () => {
    renderWithTheme(
      <PropertySchemaBuilder properties={mockProperties} onChange={mockOnChange} />
    );
    
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.getByText(/Text \(String\)/)).toBeInTheDocument();
    expect(screen.getByText('Number')).toBeInTheDocument();
  });

  it('handles adding new property', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
      <PropertySchemaBuilder properties={[]} onChange={mockOnChange} />
    );
    
    await user.click(screen.getByText('Add First Property'));
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'property_1',
          type: 'string',
          required: false,
        })
      ]);
    });
  });

  it('handles property deletion', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
      <PropertySchemaBuilder properties={mockProperties} onChange={mockOnChange} />
    );
    
    // Expand first property to show delete button
    await user.click(screen.getByText('firstName'));
    
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'prop-2',
          name: 'age',
        })
      ]);
    });
  });

  it('expands property details when clicked', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
      <PropertySchemaBuilder properties={mockProperties} onChange={mockOnChange} />
    );
    
    await user.click(screen.getByText('firstName'));
    
    expect(screen.getByDisplayValue('firstName')).toBeInTheDocument();
    expect(screen.getByDisplayValue('First name of the person')).toBeInTheDocument();
  });

  it('updates property name', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
      <PropertySchemaBuilder properties={mockProperties} onChange={mockOnChange} />
    );
    
    // Expand property
    await user.click(screen.getByText('firstName'));
    
    const nameInput = screen.getByDisplayValue('firstName');
    await user.clear(nameInput);
    await user.type(nameInput, 'fullName');
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'fullName',
        }),
        expect.objectContaining({
          name: 'age',
        })
      ]);
    });
  });

  it('updates property type and shows appropriate constraints', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
      <PropertySchemaBuilder properties={mockProperties} onChange={mockOnChange} />
    );
    
    // Expand age property (number type)
    await user.click(screen.getByText('age'));
    
    // Should show min/max value fields for number type
    expect(screen.getByLabelText('Min Value')).toBeInTheDocument();
    expect(screen.getByLabelText('Max Value')).toBeInTheDocument();
  });

  it('handles enum type with choices', async () => {
    const enumProperty = {
      id: 'prop-3',
      name: 'status',
      type: 'enum',
      required: false,
      constraints: { enum: ['active', 'inactive', 'pending'] },
    };
    
    const user = userEvent.setup();
    
    renderWithTheme(
      <PropertySchemaBuilder properties={[enumProperty]} onChange={mockOnChange} />
    );
    
    await user.click(screen.getByText('status'));
    
    expect(screen.getByDisplayValue('active, inactive, pending')).toBeInTheDocument();
  });

  it('validates property names', () => {
    const invalidProperty = {
      id: 'prop-invalid',
      name: '123invalid',
      type: 'string',
      required: false,
    };
    
    renderWithTheme(
      <PropertySchemaBuilder 
        properties={[invalidProperty]} 
        onChange={mockOnChange} 
      />
    );
    
    // Enable validation display
    const codeButton = screen.getByRole('button', { name: /toggle validation display/i });
    fireEvent.click(codeButton);
    
    expect(screen.getByText(/1 errors/)).toBeInTheDocument();
  });

  it('handles readonly mode', () => {
    renderWithTheme(
      <PropertySchemaBuilder 
        properties={mockProperties} 
        onChange={mockOnChange}
        readonly={true}
      />
    );
    
    expect(screen.queryByText('Add Property')).not.toBeInTheDocument();
    
    // Expand property - inputs should be disabled
    fireEvent.click(screen.getByText('firstName'));
    
    const nameInput = screen.getByDisplayValue('firstName');
    expect(nameInput).toBeDisabled();
  });

  it('toggles required status', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
      <PropertySchemaBuilder properties={mockProperties} onChange={mockOnChange} />
    );
    
    await user.click(screen.getByText('age'));
    
    const requiredSwitch = screen.getByRole('checkbox', { name: 'Required' });
    await user.click(requiredSwitch);
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'firstName',
        }),
        expect.objectContaining({
          name: 'age',
          required: true,
        })
      ]);
    });
  });

  it('handles string constraints', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
      <PropertySchemaBuilder properties={mockProperties} onChange={mockOnChange} />
    );
    
    await user.click(screen.getByText('firstName'));
    
    const minLengthInput = screen.getByLabelText('Min Length');
    await user.clear(minLengthInput);
    await user.type(minLengthInput, '2');
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'firstName',
            constraints: expect.objectContaining({
              minLength: 2,
            }),
          })
        ])
      );
    });
  });
});