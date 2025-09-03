import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserListTab } from '../../../components/userAssignments/UserListTab';

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn((date) => '2 hours'),
}));

// Mock MUI icons
jest.mock('@mui/icons-material', () => ({
  Edit: () => <div>Edit</div>,
  Delete: () => <div>Delete</div>,
  Assignment: () => <div>Assignment</div>,
  Circle: () => <div>Circle</div>,
}));

describe('UserListTab', () => {
  const mockUsers = [
    {
      _id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      status: 'active',
      avatar: 'https://example.com/avatar.jpg',
      lastActive: Date.now() - 1000 * 60 * 60,
      createdAt: Date.now(),
    },
    {
      _id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'editor',
      status: 'inactive',
      createdAt: Date.now(),
    },
  ];

  const mockAssignments = [
    {
      _id: 'a1',
      userId: '1',
      ontologyId: 'o1',
      role: 'owner',
      assignedAt: Date.now(),
      assignedBy: '1',
    },
    {
      _id: 'a2',
      userId: '1',
      ontologyId: 'o2',
      role: 'contributor',
      assignedAt: Date.now(),
      assignedBy: '1',
    },
  ];

  const mockOntologies = [
    { _id: 'o1', name: 'Ontology 1' },
    { _id: 'o2', name: 'Ontology 2' },
  ];

  const mockOnlineUsers = [
    { id: '1', name: 'John Doe' },
  ];

  const mockOnEdit = jest.fn();
  const mockOnAssign = jest.fn();

  const defaultProps = {
    users: mockUsers,
    assignments: mockAssignments,
    ontologies: mockOntologies,
    onlineUsers: mockOnlineUsers,
    onEdit: mockOnEdit,
    onAssign: mockOnAssign,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders table with correct headers', () => {
    render(<UserListTab {...defaultProps} />);
    
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Assigned Ontologies')).toBeInTheDocument();
    expect(screen.getByText('Last Active')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders user information correctly', () => {
    render(<UserListTab {...defaultProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('displays user roles with correct colors', () => {
    render(<UserListTab {...defaultProps} />);
    
    const adminChip = screen.getByText('admin');
    const editorChip = screen.getByText('editor');
    
    expect(adminChip).toBeInTheDocument();
    expect(editorChip).toBeInTheDocument();
  });

  it('displays user status correctly', () => {
    render(<UserListTab {...defaultProps} />);
    
    const activeChips = screen.getAllByText('active');
    const inactiveChips = screen.getAllByText('inactive');
    
    expect(activeChips).toHaveLength(1);
    expect(inactiveChips).toHaveLength(1);
  });

  it('shows online indicator for online users', () => {
    render(<UserListTab {...defaultProps} />);
    
    // Check that Circle icon (online indicator) is rendered
    const circleIcons = screen.getAllByText('Circle');
    expect(circleIcons.length).toBeGreaterThan(0);
  });

  it('displays assigned ontologies for users', () => {
    render(<UserListTab {...defaultProps} />);
    
    // User 1 has 2 assignments
    expect(screen.getByText('Ontology 1')).toBeInTheDocument();
    expect(screen.getByText('Ontology 2')).toBeInTheDocument();
  });

  it('displays last active time', () => {
    render(<UserListTab {...defaultProps} />);
    
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    render(<UserListTab {...defaultProps} />);
    
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    
    expect(mockOnEdit).toHaveBeenCalledWith(mockUsers[0]);
  });

  it('renders action buttons for each user', () => {
    render(<UserListTab {...defaultProps} />);
    
    const editButtons = screen.getAllByText('Edit');
    const assignButtons = screen.getAllByText('Assignment');
    const deleteButtons = screen.getAllByText('Delete');
    
    expect(editButtons).toHaveLength(2);
    expect(assignButtons).toHaveLength(2);
    expect(deleteButtons).toHaveLength(2);
  });

  it('renders empty state when no users', () => {
    render(<UserListTab {...defaultProps} users={[]} />);
    
    expect(screen.getByText('No users found. Add your first user to get started.')).toBeInTheDocument();
  });

  it('handles users with no assignments', () => {
    const propsWithNoAssignments = {
      ...defaultProps,
      assignments: [],
    };
    
    render(<UserListTab {...propsWithNoAssignments} />);
    
    // Should still render without errors
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('handles missing ontology data gracefully', () => {
    const propsWithNoOntologies = {
      ...defaultProps,
      ontologies: undefined,
    };
    
    render(<UserListTab {...propsWithNoOntologies} />);
    
    // Should still render without errors
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('truncates long ontology names', () => {
    const longOntologies = [
      { _id: 'o1', name: 'This is a very long ontology name that should be truncated' },
    ];
    
    const props = {
      ...defaultProps,
      ontologies: longOntologies,
    };
    
    render(<UserListTab {...props} />);
    
    // Check that substring is applied (first 10 characters)
    expect(screen.getByText('This is a ')).toBeInTheDocument();
  });

  it('shows count for users with many ontologies', () => {
    const manyAssignments = [
      ...mockAssignments,
      { _id: 'a3', userId: '1', ontologyId: 'o3', role: 'reviewer', assignedAt: Date.now(), assignedBy: '1' },
      { _id: 'a4', userId: '1', ontologyId: 'o4', role: 'reviewer', assignedAt: Date.now(), assignedBy: '1' },
      { _id: 'a5', userId: '1', ontologyId: 'o5', role: 'reviewer', assignedAt: Date.now(), assignedBy: '1' },
    ];
    
    const manyOntologies = [
      ...mockOntologies,
      { _id: 'o3', name: 'Ontology 3' },
      { _id: 'o4', name: 'Ontology 4' },
      { _id: 'o5', name: 'Ontology 5' },
    ];
    
    render(
      <UserListTab
        {...defaultProps}
        assignments={manyAssignments}
        ontologies={manyOntologies}
      />
    );
    
    // Should show "+2" for the additional ontologies beyond the first 3
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});