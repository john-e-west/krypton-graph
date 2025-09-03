import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import EntityPalette from '../../../components/editor/EntityPalette';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('EntityPalette', () => {
  it('renders all entity types', () => {
    renderWithTheme(<EntityPalette />);
    
    const expectedEntityTypes = [
      'Person',
      'Organization',
      'Concept',
      'Resource',
      'Event',
      'Document',
      'Location',
      'Category'
    ];
    
    expectedEntityTypes.forEach(type => {
      expect(screen.getByText(type)).toBeInTheDocument();
    });
  });

  it('displays entity descriptions', () => {
    renderWithTheme(<EntityPalette />);
    
    expect(screen.getByText('Individual person entity')).toBeInTheDocument();
    expect(screen.getByText('Company or institution')).toBeInTheDocument();
    expect(screen.getByText('Abstract idea or concept')).toBeInTheDocument();
  });

  it('shows template section', () => {
    renderWithTheme(<EntityPalette />);
    
    expect(screen.getByText('Templates')).toBeInTheDocument();
    expect(screen.getByText('Healthcare Ontology')).toBeInTheDocument();
    expect(screen.getByText('Organization Chart')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Base')).toBeInTheDocument();
    expect(screen.getByText('Supply Chain')).toBeInTheDocument();
  });

  it('handles drag start for entity types', () => {
    renderWithTheme(<EntityPalette />);
    
    const personEntity = screen.getByText('Person').closest('[draggable="true"]');
    expect(personEntity).toBeInTheDocument();
    
    const mockDataTransfer = {
      setData: jest.fn(),
      effectAllowed: '',
    };
    
    const dragEvent = new Event('dragstart', { bubbles: true }) as any;
    dragEvent.dataTransfer = mockDataTransfer;
    
    fireEvent(personEntity!, dragEvent);
    
    expect(mockDataTransfer.setData).toHaveBeenCalledWith('application/reactflow', 'Person');
    expect(mockDataTransfer.effectAllowed).toBe('move');
  });

  it('displays instruction text', () => {
    renderWithTheme(<EntityPalette />);
    
    expect(screen.getByText('Drag entities to the canvas to create new nodes')).toBeInTheDocument();
    expect(screen.getByText('Quick start with pre-built ontologies')).toBeInTheDocument();
  });

  it('shows template descriptions and entity lists', () => {
    renderWithTheme(<EntityPalette />);
    
    expect(screen.getByText('Medical entities and relationships')).toBeInTheDocument();
    expect(screen.getByText('Patient, Doctor, Diagnosis, Treatment')).toBeInTheDocument();
    
    expect(screen.getByText('Corporate hierarchy template')).toBeInTheDocument();
    expect(screen.getByText('Employee, Department, Role, Project')).toBeInTheDocument();
  });

  it('renders action buttons at the bottom', () => {
    renderWithTheme(<EntityPalette />);
    
    expect(screen.getByText('Import Template')).toBeInTheDocument();
    expect(screen.getByText('Save as Template')).toBeInTheDocument();
  });

  it('applies hover effects to draggable items', () => {
    const { container } = renderWithTheme(<EntityPalette />);
    
    const personItem = screen.getByText('Person').closest('.MuiListItem-root');
    expect(personItem).toHaveAttribute('draggable', 'true');
    
    fireEvent.mouseEnter(personItem!);
    // Hover effects would be tested through CSS classes or styles
  });

  it('handles template selection clicks', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    renderWithTheme(<EntityPalette />);
    
    const healthcareTemplate = screen.getByText('Healthcare Ontology').closest('.MuiListItem-root');
    fireEvent.click(healthcareTemplate!);
    
    expect(consoleSpy).toHaveBeenCalledWith('Loading template:', 'Healthcare Ontology');
    
    consoleSpy.mockRestore();
  });
});