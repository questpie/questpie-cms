/**
 * Key-Value Store Interface
 */
export interface KVAdapter {
	get<T = unknown>(key: string): Promise<T | null>;
	set(key: string, value: unknown, ttl?: number): Promise<void>;
	delete(key: string): Promise<void>;
	has(key: string): Promise<boolean>;
	clear(): Promise<void>;
}

/**
 * In-Memory Adapter (Default)
 * Uses a simple Map with TTL support
 */
export class MemoryKVAdapter implements KVAdapter {
	private store = new Map<string, { value: unknown; expiresAt?: number }>();

	async get<T = unknown>(key: string): Promise<T | null> {
		const entry = this.store.get(key);
		if (!entry) return null;

		if (entry.expiresAt && Date.now() > entry.expiresAt) {
			this.store.delete(key);
			return null;
		}

		return entry.value as T;
	}

	async set(key: string, value: unknown, ttl?: number): Promise<void> {
		const expiresAt = ttl ? Date.now() + ttl * 1000 : undefined;
		this.store.set(key, { value, expiresAt });
	}

	async delete(key: string): Promise<void> {
		this.store.delete(key);
	}

	async has(key: string): Promise<boolean> {
		const entry = this.store.get(key);
		if (!entry) return false;
		if (entry.expiresAt && Date.now() > entry.expiresAt) {
			this.store.delete(key);
			return false;
		}
		return true;
	}

	async clear(): Promise<void> {
		this.store.clear();
	}
}

/**
 * Configuration for the KV Module
 */
export interface KVConfig {
	/**
	 * Custom adapter instance.
	 * If not provided, defaults to MemoryKVAdapter.
	 */
	adapter?: KVAdapter;

	/**
	 * Default TTL in seconds for set operations if not specified
	 */
	defaultTtl?: number;
}

export class KVService {
	private adapter: KVAdapter;
	private config: KVConfig;

	constructor(config: KVConfig = {}) {
		this.config = config;
		this.adapter = config.adapter || new MemoryKVAdapter();
	}

	async get<T = unknown>(key: string): Promise<T | null> {
		return this.adapter.get<T>(key);
	}

	async set(key: string, value: unknown, ttl?: number): Promise<void> {
		return this.adapter.set(key, value, ttl ?? this.config.defaultTtl);
	}

	async delete(key: string): Promise<void> {
		return this.adapter.delete(key);
	}

	async has(key: string): Promise<boolean> {
		return this.adapter.has(key);
	}
}
