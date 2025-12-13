import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import * as db from './db';

describe('projects.createTask', () => {
  let testUserId: number;
  let testClientId: number;
  let testProjectId: number;

  beforeAll(async () => {
    // Create test user
    const testUser = await db.createUser({
      openId: 'test-createtask-' + Date.now(),
      name: 'Test User',
      email: 'test-createtask@example.com',
      role: 'admin'
    });
    testUserId = testUser.id;

    // Create test client
    const testClient = await db.createClient({
      clientNumber: 'CLI-TEST-' + Date.now(),
      name: 'Test Client for Task',
      email: 'client-task@example.com',
      phone: '1234567890',
      createdBy: testUserId
    });
    testClientId = testClient.id;

    // Create test project
    const testProject = await db.createProject({
      projectNumber: 'PRJ-TEST-' + Date.now(),
      clientId: testClientId,
      name: 'Test Project for Task',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      budget: 100000,
      createdBy: testUserId
    });
    testProjectId = testProject.id;
  });

  it('should create a task successfully', async () => {
    const caller = appRouter.createCaller({
      user: { 
        id: testUserId, 
        openId: 'test-createtask-' + Date.now(), 
        name: 'Test User', 
        email: 'test-createtask@example.com',
        role: 'admin'
      }
    });

    const result = await caller.projects.createTask({
      projectId: testProjectId,
      name: 'Test Task',
      description: 'Test task description',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-02-15')
    });

    expect(result.success).toBe(true);
  });

  it('should create a task without optional fields', async () => {
    const caller = appRouter.createCaller({
      user: { 
        id: testUserId, 
        openId: 'test-createtask-' + Date.now(), 
        name: 'Test User', 
        email: 'test-createtask@example.com',
        role: 'admin'
      }
    });

    const result = await caller.projects.createTask({
      projectId: testProjectId,
      name: 'Minimal Task'
    });

    expect(result.success).toBe(true);
  });

  it('should work for all authenticated users (not just managers)', async () => {
    // Create a designer user
    const designerUser = await db.createUser({
      openId: 'designer-' + Date.now(),
      name: 'Designer User',
      email: 'designer@example.com',
      role: 'designer'
    });

    const caller = appRouter.createCaller({
      user: { 
        id: designerUser.id, 
        openId: 'designer-' + Date.now(), 
        name: 'Designer User', 
        email: 'designer@example.com',
        role: 'designer'
      }
    });

    const result = await caller.projects.createTask({
      projectId: testProjectId,
      name: 'Designer Task',
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-03-31')
    });

    expect(result.success).toBe(true);
  });
});
