import mysql from 'mysql2/promise';

async function main() {
    // We assume this script runs ON the server (SSH), so we connect to localhost
    const host = '127.0.0.1';
    const password = 'Gtd2025@SecureDB';
    const usersToTry = ['root', 'u721226369_gtd', 'u721226369_user', 'admin']; // Common Hostinger prefixes, but usually defined in .env

    let conn;
    let ConnectedUser;

    console.log('Attempting to connect to database...');

    for (const user of usersToTry) {
        try {
            conn = await mysql.createConnection({
                host,
                user,
                password,
            });
            ConnectedUser = user;
            console.log(`Connected successfully as user: ${user}`);
            break;
        } catch (e: any) {
            console.log(`Failed with user ${user}: ${e.message}`);
        }
    }

    if (!conn) {
        console.error('Could not connect with any username.');
        process.exit(1);
    }

    try {
        // 1. List databases to find the right one
        const [rows] = await conn.query('SHOW DATABASES');
        const dbs = (rows as any[]).map(r => r.Database);
        console.log('Available databases:', dbs);

        // Filter for likely candidates
        const nonSystem = dbs.filter(d => !['information_schema', 'mysql', 'performance_schema', 'sys'].includes(d));
        const targetDb = nonSystem.find(d => d.includes('gtd')) || nonSystem[0];

        if (!targetDb) {
            console.error('No suitable database found.');
            process.exit(1);
        }

        console.log(`Selected database: ${targetDb}`);
        await conn.changeUser({ database: targetDb });

        // 2. Add the column
        console.log('Adding column `unit` to `invoiceItems`...');
        try {
            await conn.query('ALTER TABLE invoiceItems ADD COLUMN unit VARCHAR(50)');
            console.log('SUCCESS: Column added.');
        } catch (e: any) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('Column `unit` already exists.');
            } else {
                throw e;
            }
        }

        // 3. Close
        await conn.end();
        console.log('Done.');

    } catch (err) {
        console.error('Error executing migration:', err);
        if (conn) await conn.end();
        process.exit(1);
    }
}

main();
