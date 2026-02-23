import { dbService } from './sqlite-service';

/**
 * Compatibility helper for existing code (getDb)
 */
export function getDb() {
    return dbService.getRawDb();
}

/**
 * Re-export dbService singleton
 */
export { dbService };
