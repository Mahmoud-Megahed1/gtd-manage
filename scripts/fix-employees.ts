import * as dotenv from 'dotenv';
dotenv.config();

import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    const db = await getDb();
    if (!db) {
        console.error("Failed to connect to database. Make sure DATABASE_URL is set.");
        process.exit(1);
    }

    try {
        console.log("Starting employee number update...");

        // 1. Update to temp values
        console.log("Updating to temporary values...");
        await db.execute(sql`UPDATE employees SET employeeNumber = CONCAT('TEMP-', id)`);

        // 2. Update to final values
        console.log("Updating to final values (EMP-XXX)...");
        await db.execute(sql`UPDATE employees SET employeeNumber = CONCAT('EMP-', LPAD(id, 3, '0'))`);

        // 3. Select and display
        console.log("Fetching updated records...");
        const result = await db.execute(sql`SELECT id, employeeNumber, userId FROM employees ORDER BY id`);

        // Adjust for drizzle/mysql2 return type [rows, metadata]
        const rows = Array.isArray(result) ? result[0] : result;
        console.table(rows);

        console.log("Successfully completed employee number updates.");
        process.exit(0);
    } catch (error) {
        console.error("Error executing updates:", error);
        process.exit(1);
    }
}

main();
