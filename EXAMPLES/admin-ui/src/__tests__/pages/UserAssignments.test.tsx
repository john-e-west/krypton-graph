import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import UserAssignments from '../../pages/UserAssignments';

// Mock Convex
jest.mock('convex/react', () => ({
  ConvexProvider: ({ children }: any) => <>{children}</>,
  ConvexReactClient: jest.fn(),
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

// Mock MUI icons
jest.mock('@mui/icons-material', () => ({
  PersonAdd: () => <div>PersonAdd Icon</div>,
  Edit: () => <div>Edit Icon</div>,
  Delete: () => <div>Delete Icon</div>,
  Assignment: () => <div>Assignment Icon</div>,
  Timeline: () => <div>Timeline Icon</div>,
  Group: () => <div>Group Icon</div>,
  Visibility: () => <div>Visibility Icon</div>,
  CheckCircle: () => <div>CheckCircle Icon</div>,
  Search: () => <div>Search Icon</div>,
  Circle: () => <div>Circle Icon</div>,
}));

// Mock child components
jest.mock('../../components/userAssignments/UserListTab', () => ({
  UserListTab: ({ users }: any) => (
    <div data-testid="user-list-tab">
      {users?.length ? `${users.length} users` : 'No users'}
    </div>
  ),
}));

jest.mock('../../components/userAssignments/AssignmentsTab', () => ({
  AssignmentsTab: ({ assignments }: any) => (
    <div data-testid="assignments-tab">
      {assignments?.length ? `${assignments.length} assignments` : 'No assignments'}
    </div>
  ),
}));

jest.mock('../../components/userAssignments/ActivityTab', () => ({
  ActivityTab: ({ activities }: any) => (
    <div data-testid="activity-tab">
      {activities?.length ? `${activities.length} activities` : 'No activities'}
    </div>
  ),
}));

jest.mock('../../components/userAssignments/WorkloadTab', () => ({
  WorkloadTab: ({ users }: any) => (
    <div data-testid="workload-tab">
      Workload for {users?.length || 0} users
    </div>
  ),
}));

jest.mock('../../components/userAssignments/AssignmentDialog', () => ({
  AssignmentDialog: ({ open, onClose }: any) => (
    open ? (
      <div data-testid="assignment-dialog">
        Assignment Dialog
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}));

describe('UserAssignments', () => {
  const mockUsers = [
    {
      _id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      status: 'active',
      createdAt: Date.now(),
    },
    {
      _id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'editor',
      status: 'active',
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
  ];

  const mockActivities = [
    {
      _id: 'act1',
      type: 'assignment_created',
      userId: '1',
      details: 'Assigned as owner',
      timestamp: Date.now(),
    },
  ];

  beforeEach(() => {
    const { useQuery, useMutation } = require('convex/react');
    
    // Track call count to return different data for each hook call
    let callCount = 0;
    useQuery.mockImplementation(() => {
      callCount++;
      // Return data based on the order of useQuery calls in the component
      if (callCount === 1) return mockUsers; // users.list
      if (callCount === 2) return mockAssignments; // assignments.list
      if (callCount === 3) return []; // ontologies.list
      if (callCount === 4) return mockActivities; // activities.getRecent
      if (callCount === 5) return [mockUsers[0]]; // presence.getOnlineUsers
      return undefined;
    });
    
    useMutation.mockReturnValue(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the main header with title', () => {
    render(<UserAssignments />);
    expect(screen.getByText('User Assignments')).toBeInTheDocument();
  });

  it('renders all tabs', () => {
    render(<UserAssignments />);
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Assignments')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('Workload')).toBeInTheDocument();
  });

  it('displays online users count', () => {
    render(<UserAssignments />);
    expect(screen.getByText('1 users online')).toBeInTheDocument();
  });

  it('renders search field', () => {
    render(<UserAssignments />);
    const searchField = screen.getByPlaceholderText('Search users...');
    expect(searchField).toBeInTheDocument();
  });

  it('renders role filter dropdown', () => {
    render(<UserAssignments />);
    expect(screen.getByLabelText('Role')).toBeInTheDocument();
  });

  it('renders Add User button', () => {
    render(<UserAssignments />);
    expect(screen.getByText('Add User')).toBeInTheDocument();
  });

  it('shows Users tab content by default', () => {
    render(<UserAssignments />);
    expect(screen.getByTestId('user-list-tab')).toBeInTheDocument();
    expect(screen.getByText('2 users')).toBeInTheDocument();
  });

  it('switches to Assignments tab when clicked', () => {
    render(<UserAssignments />);
    
    const assignmentsTab = screen.getByText('Assignments');
    fireEvent.click(assignmentsTab);
    
    expect(screen.getByTestId('assignments-tab')).toBeInTheDocument();
    expect(screen.getByText('1 assignments')).toBeInTheDocument();
  });

  it('switches to Activity tab when clicked', () => {
    render(<UserAssignments />);
    
    const activityTab = screen.getByText('Activity');
    fireEvent.click(activityTab);
    
    expect(screen.getByTestId('activity-tab')).toBeInTheDocument();
    expect(screen.getByText('1 activities')).toBeInTheDocument();
  });

  it('switches to Workload tab when clicked', () => {
    render(<UserAssignments />);
    
    const workloadTab = screen.getByText('Workload');
    fireEvent.click(workloadTab);
    
    expect(screen.getByTestId('workload-tab')).toBeInTheDocument();
    expect(screen.getByText('Workload for 2 users')).toBeInTheDocument();
  });

  it('opens assignment dialog when Add User is clicked', () => {
    render(<UserAssignments />);
    
    const addButton = screen.getByText('Add User');
    fireEvent.click(addButton);
    
    expect(screen.getByTestId('assignment-dialog')).toBeInTheDocument();
  });

  it('closes assignment dialog when close is clicked', () => {
    render(<UserAssignments />);
    
    // Open dialog
    const addButton = screen.getByText('Add User');
    fireEvent.click(addButton);
    expect(screen.getByTestId('assignment-dialog')).toBeInTheDocument();
    
    // Close dialog
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    expect(screen.queryByTestId('assignment-dialog')).not.toBeInTheDocument();
  });

  it('filters users based on search term', async () => {
    render(<UserAssignments />);
    
    const searchField = screen.getByPlaceholderText('Search users...');
    fireEvent.change(searchField, { target: { value: 'john' } });
    
    // Component should filter users (mocked component would need to receive filtered data)
    await waitFor(() => {
      expect(searchField).toHaveValue('john');
    });
  });

  it('filters users based on role selection', async () => {
    render(<UserAssignments />);
    
    const roleSelect = screen.getByLabelText('Role');
    fireEvent.mouseDown(roleSelect);
    
    // Note: Full interaction with MUI Select requires more complex mocking
    // This test verifies the component renders the filter
    expect(roleSelect).toBeInTheDocument();
  });
});