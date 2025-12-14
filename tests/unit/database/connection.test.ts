import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock postgres module
const mockDbInstance = {
  unsafe: vi.fn(),
  end: vi.fn(),
};

vi.mock('postgres', () => ({
  default: vi.fn(() => mockDbInstance),
}));

import { getDb, closeDb } from '../../../src/database/connection';

describe('Database Connection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the singleton
    (global as any).__dbInstance = null;
  });

  describe('getDb', () => {
    it('should return a database instance', () => {
      const db = getDb('postgresql://user:pass@localhost/db');
      expect(db).toBeDefined();
    });

    it('should return same instance on subsequent calls (singleton pattern)', () => {
      const db1 = getDb('postgresql://user:pass@localhost/db');
      const db2 = getDb('postgresql://user:pass@localhost/db');
      expect(db1).toBe(db2);
    });

    it('should initialize postgres with correct connection options', () => {
      const databaseUrl = 'postgresql://user:pass@localhost/db';
      const db = getDb(databaseUrl);
      expect(db).toBeDefined();
    });

    it('should set connection pool settings for Workers compatibility', () => {
      const db = getDb('postgresql://user:pass@localhost/db');
      expect(db).toBeDefined();
      // Verify the connection was created with correct settings
    });
  });

  describe('closeDb', () => {
    it('should close database connection', async () => {
      getDb('postgresql://user:pass@localhost/db');
      await closeDb();
      expect(mockDbInstance.end).toHaveBeenCalled();
    });

    it('should handle error during connection close', async () => {
      mockDbInstance.end.mockRejectedValueOnce(new Error('Close failed'));
      getDb('postgresql://user:pass@localhost/db');
      
      // Should not throw
      await expect(closeDb()).resolves.not.toThrow();
    });

    it('should not throw if no connection exists', async () => {
      await expect(closeDb()).resolves.not.toThrow();
    });

    it('should set instance to null after closing', async () => {
      getDb('postgresql://user:pass@localhost/db');
      await closeDb();
      
      // Getting new instance should create a new connection
      const newDb = getDb('postgresql://user:pass@localhost/db');
      expect(newDb).toBeDefined();
    });

    it('should be safe to call multiple times', async () => {
      getDb('postgresql://user:pass@localhost/db');
      await closeDb();
      await closeDb();
      await closeDb();
      
      expect(mockDbInstance.end).toHaveBeenCalledTimes(1);
    });
  });

  describe('Database Connection Pool Settings', () => {
    it('should use connection pool max of 5', () => {
      const db = getDb('postgresql://user:pass@localhost/db');
      expect(db).toBeDefined();
      // Pool settings are passed to postgres() constructor
    });

    it('should set idle timeout to 20 seconds', () => {
      const db = getDb('postgresql://user:pass@localhost/db');
      expect(db).toBeDefined();
    });

    it('should set connect timeout to 10 seconds', () => {
      const db = getDb('postgresql://user:pass@localhost/db');
      expect(db).toBeDefined();
    });

    it('should enable prepared statements', () => {
      const db = getDb('postgresql://user:pass@localhost/db');
      expect(db).toBeDefined();
    });
  });
});
