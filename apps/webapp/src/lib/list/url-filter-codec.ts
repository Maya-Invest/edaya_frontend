export interface SearchFieldConfig {
	type: 'search';
	default: '';
}

export interface StringFieldConfig {
	type: 'string';
	default: string;
}

export interface EnumFieldConfig<T extends string = string> {
	type: 'enum';
	default: T;
	values: readonly T[];
}

export interface PageFieldConfig {
	type: 'page';
	default: '1';
}

export type FilterFieldConfig = SearchFieldConfig | StringFieldConfig | EnumFieldConfig | PageFieldConfig;

export type FilterSchema = Record<string, FilterFieldConfig>;

type FilterValues<S extends FilterSchema> = {
	[K in keyof S]: string;
};

function readField(url: URL, key: string, config: FilterFieldConfig): string {
	const raw = url.searchParams.get(key);

	switch (config.type) {
		case 'search':
			return raw ?? config.default;
		case 'string':
			return raw ?? config.default;
		case 'enum':
			return raw && (config.values as readonly string[]).includes(raw)
				? raw
				: config.default;
		case 'page': {
			const parsed = Number(raw);
			if (!raw || !Number.isFinite(parsed) || parsed < 1)
				return config.default;
			return String(Math.trunc(parsed));
		}
	}
}

function writeField(
	next: URL,
	key: string,
	value: string,
	config: FilterFieldConfig,
): void {
	switch (config.type) {
		case 'search': {
			const trimmed = value.trim();
			if (trimmed)
				next.searchParams.set(key, trimmed);
			else
				next.searchParams.delete(key);
			return;
		}
		case 'string':
		case 'enum':
		case 'page': {
			if (value !== config.default)
				next.searchParams.set(key, value);
			else
				next.searchParams.delete(key);
		}
	}
}

export function defineUrlFilterCodec<S extends FilterSchema>(schema: S) {
	return {
		read(url: URL): FilterValues<S> {
			const filters = {} as FilterValues<S>;
			for (const [key, config] of Object.entries(schema)) {
				filters[key as keyof S] = readField(url, key, config);
			}
			return filters;
		},
		write(url: URL, filters: FilterValues<S>): string {
			const next = new URL(url);
			for (const [key, config] of Object.entries(schema)) {
				writeField(next, key, filters[key as keyof S], config);
			}
			return `${next.pathname}${next.search}`;
		},
	};
}
