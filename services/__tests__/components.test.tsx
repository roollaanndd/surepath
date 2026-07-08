// Component tests for key SurePath UI components.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock Supabase for all component tests
vi.mock('../services/db', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data: [], error: null })) })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
    channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn() })) })),
    removeChannel: vi.fn(),
    storage: { from: vi.fn(() => ({ getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' } })) })) },
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  },
  callGateway: vi.fn(async () => ({ data: null })),
}));

// ─── AppSelector ─────────────────────────────────────────────────────────────

import AppSelector from '../../components/AppSelector';

describe('AppSelector', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <AppSelector user={{ name: 'Test', allowed_apps: ['CUSTOMER', 'AGENT'] }} onSelect={vi.fn()} onLogout={vi.fn()} />
    );
    expect(container).toBeDefined();
  });

  it('shows user greeting', () => {
    render(
      <AppSelector user={{ name: 'Roland', allowed_apps: ['CUSTOMER', 'AGENT'] }} onSelect={vi.fn()} onLogout={vi.fn()} />
    );
    expect(screen.getByText(/Roland/i)).toBeTruthy();
  });

  it('shows app cards for each allowed app', () => {
    render(
      <AppSelector user={{ name: 'Test', allowed_apps: ['CUSTOMER', 'AGENT', 'OPERATOR'] }} onSelect={vi.fn()} onLogout={vi.fn()} />
    );
    // Should show 3 app options
    expect(screen.getByText(/Customer App/i)).toBeTruthy();
    expect(screen.getByText(/Agent App/i)).toBeTruthy();
    expect(screen.getByText(/Operator App/i)).toBeTruthy();
  });
});

// ─── OperatorLogin ───────────────────────────────────────────────────────────

import OperatorLogin from '../../components/operator/OperatorLogin';

describe('OperatorLogin', () => {
  it('renders login form', () => {
    const { container } = render(<OperatorLogin onLoginSuccess={vi.fn()} onBack={vi.fn()} />);
    expect(container).toBeDefined();
  });

  it('shows Operator Portal heading', () => {
    render(<OperatorLogin onLoginSuccess={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText(/Operator/i)).toBeTruthy();
  });
});

// ─── InsurerLogin ────────────────────────────────────────────────────────────

import InsurerLogin from '../../components/insurer/InsurerLogin';

describe('InsurerLogin', () => {
  it('renders token entry form', () => {
    const { container } = render(<InsurerLogin onLoginSuccess={vi.fn()} onBack={vi.fn()} />);
    expect(container).toBeDefined();
  });

  it('shows Insurer Portal heading', () => {
    render(<InsurerLogin onLoginSuccess={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText(/Insurer/i)).toBeTruthy();
  });
});

// ─── UI Primitives ───────────────────────────────────────────────────────────

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeTruthy();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Test</Button>);
    screen.getByText('Test').click();
    expect(onClick).toHaveBeenCalled();
  });
});

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeTruthy();
  });
});

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No data" description="Nothing here" />);
    expect(screen.getByText('No data')).toBeTruthy();
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });
});
