import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock firebase/database functions
vi.mock('firebase/database', () => {
  return {
    ref: vi.fn((r) => r),
    get: vi.fn(),
    update: vi.fn(),
  };
});

import { get, update } from 'firebase/database';
import dashboardConfig from '../dashboardConfig';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DashboardConfigService', () => {
  it('assignModuleToPlot assigns when module unassigned', async () => {
    // get should return snapshot with val() => null
    get.mockResolvedValue({ val: () => null });
    update.mockResolvedValue(true);

    await expect(dashboardConfig.assignModuleToPlot('user1', 'MOD123', 'plotA')).resolves.not.toThrow();

    expect(get).toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });

  it('assignModuleToPlot fails when module owned by other user', async () => {
    get.mockResolvedValue({ val: () => ({ assignedTo: 'someoneElse' }) });

    await expect(dashboardConfig.assignModuleToPlot('user1', 'MOD123', 'plotA')).rejects.toThrow('Module already assigned to another user');

    expect(get).toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('unassignModule removes module entries and updates registry', async () => {
    // Mock farms having the module
    get.mockImplementation((refArg) => {
      if (String(refArg).includes('users/user1/farms')) {
        return Promise.resolve({ exists: () => true, val: () => ({ plotA: { modules: { MOD123: { createdAt: 1 } } } }) });
      }
      return Promise.resolve({ val: () => null });
    });

    update.mockResolvedValue(true);

    await expect(dashboardConfig.unassignModule('user1', 'MOD123')).resolves.not.toThrow();
    expect(get).toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });

  it('removeModule deletes module and references when owner', async () => {
    get.mockImplementation((refArg) => {
      if (String(refArg).includes('modules/MOD123')) {
        return Promise.resolve({ val: () => ({ assignedTo: 'user1' }) });
      }
      if (String(refArg).includes('users/user1/farms')) {
        return Promise.resolve({ exists: () => true, val: () => ({ plotA: { modules: { MOD123: { createdAt: 1 } } } }) });
      }
      return Promise.resolve({ val: () => null });
    });

    update.mockResolvedValue(true);

    await expect(dashboardConfig.removeModule('user1', 'MOD123')).resolves.not.toThrow();
    expect(get).toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });

  it('force remove works when caller is admin', async () => {
    // Mock module assigned to someone else
    get.mockImplementation((refArg) => {
      if (String(refArg).includes('modules/MOD123')) {
        return Promise.resolve({ val: () => ({ assignedTo: 'otherUser' }) });
      }
      if (String(refArg).includes('users/user1/farms')) {
        return Promise.resolve({ exists: () => true, val: () => ({}) });
      }
      return Promise.resolve({ val: () => null });
    });

    // Mock Firestore getDoc for admin role
    const firestoreMock = await import('firebase/firestore');
    firestoreMock.getDoc = vi.fn().mockResolvedValue({ exists: () => true, data: () => ({ role: 'admin' }) });

    update.mockResolvedValue(true);

    await expect(dashboardConfig.removeModule('user1', 'MOD123', { force: true })).resolves.not.toThrow();
    expect(update).toHaveBeenCalled();
  });

  it('force remove throws when caller not admin', async () => {
    get.mockResolvedValue({ val: () => ({ assignedTo: 'otherUser' }) });
    const firestoreMock = await import('firebase/firestore');
    firestoreMock.getDoc = vi.fn().mockResolvedValue({ exists: () => true, data: () => ({ role: 'member' }) });

    await expect(dashboardConfig.removeModule('user1', 'MOD123', { force: true })).rejects.toThrow('Not authorized to force remove module');
  });

  it('removeModule throws when not owner', async () => {
    get.mockResolvedValue({ val: () => ({ assignedTo: 'otherUser' }) });
    await expect(dashboardConfig.removeModule('user1', 'MOD123')).rejects.toThrow('Not authorized to remove module');
  });
});
