// Lazy pool — avoid throwing at module load so the UI can render even
// when DATABASE_URL is not configured. Server functions that actually
// query the DB will throw when invoked.
import { Pool } from 'pg'

let _pool: Pool | null = null

function getPool(): Pool {
    if (_pool) return _pool
    const url = process.env.DATABASE_URL
    if (!url) {
        throw new Error('DATABASE_URL environment variable is required')
    }
    _pool = new Pool({
        connectionString: url,
        ssl: true,
        max: 2,
        idleTimeoutMillis: 5000,
    })
    return _pool
}

export const pool = new Proxy({} as Pool, {
    get(_t, prop) {
        const p = getPool() as unknown as Record<string, unknown>
        const v = p[prop as string]
        return typeof v === 'function' ? (v as Function).bind(p) : v
    },
})
