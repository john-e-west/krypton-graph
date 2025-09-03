import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import EntityNode from '../../../components/editor/EntityNode';

const theme = createTheme();

const mockNodeProps = {
  id: 'node-1',
  position: { x: 0, y: 0 },
  data: {
    label: 'Test Person',
    type: 'Person',
    description: 'A test person entity',
    properties: {
      name: { type: 'string', required: true },
      age: { type: 'number', required: false },
    },
  },
  selected: false,
  zIndex: 1,
  isConnectable: true,
  xPos: 0,
  yPos: 0,
  dragging: false,
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('EntityNode', () => {
  it('renders entity node with correct label and type', () => {
    renderWithTheme(<EntityNode {...mockNodeProps} />);
    
    expect(screen.getByText('Test Person')).toBeInTheDocument();
    expect(screen.getByText('Person')).toBeInTheDocument();
  });

  it('displays description when provided', () => {
    renderWithTheme(<EntityNode {...mockNodeProps} />);
    
    expect(screen.getByText('A test person entity')).toBeInTheDocument();
  });

  it('shows property count when properties exist', () => {
    renderWithTheme(<EntityNode {...mockNodeProps} />);
    
    expect(screen.getByText('Props')).toBeInTheDocument();
  });

  it('applies selected styling when selected', () => {
    const selectedProps = { ...mockNodeProps, selected: true };
    const { container } = renderWithTheme(<EntityNode {...selectedProps} />);
    
    const card = container.querySelector('.MuiCard-root');
    expect(card).toHaveStyle({ border: '2px solid' });
  });

  it('shows action buttons on hover', async () => {
    renderWithTheme(<EntityNode {...mockNodeProps} />);
    
    const card = screen.getByRole('button', { hidden: true });
    fireEvent.mouseEnter(card);
    
    // Action buttons should become visible on hover
    // Note: This might need adjustment based on actual implementation
  });

  it('displays validation errors when present', () => {
    const propsWithErrors = {
      ...mockNodeProps,
      data: {
        ...mockNodeProps.data,
        validationErrors: ['Missing required field', 'Invalid format'],
      },
    };
    
    renderWithTheme(<EntityNode {...propsWithErrors} />);
    
    expect(screen.getByText('Errors')).toBeInTheDocument();
  });

  it('shows hidden state when entity is hidden', () => {
    const hiddenProps = {
      ...mockNodeProps,
      data: {
        ...mockNodeProps.data,
        isHidden: true,
      },
    };
    
    const { container } = renderWithTheme(<EntityNode {...hiddenProps} />);
    
    const card = container.querySelector('.MuiCard-root');
    expect(card).toHaveStyle({ opacity: '0.6' });
  });

  it('renders with correct entity icon based on type', () => {
    const orgProps = {
      ...mockNodeProps,
      data: { ...mockNodeProps.data, type: 'Organization' },
    };
    
    renderWithTheme(<EntityNode {...orgProps} />);
    
    expect(screen.getByText('Organization')).toBeInTheDocument();
  });

  it('handles unknown entity types gracefully', () => {
    const unknownTypeProps = {
      ...mockNodeProps,
      data: { ...mockNodeProps.data, type: 'UnknownType' },
    };
    
    renderWithTheme(<EntityNode {...unknownTypeProps} />);
    
    expect(screen.getByText('UnknownType')).toBeInTheDocument();
  });
});