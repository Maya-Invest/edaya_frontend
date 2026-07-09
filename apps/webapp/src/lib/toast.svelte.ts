export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
	id: number;
	kind: ToastKind;
	message: string;
}

class ToastStore {
	items = $state<ToastItem[]>([]);
	private nextId = 0;

	push(message: string, kind: ToastKind = 'info', durationMs = 3200) {
		const id = ++this.nextId;
		this.items = [...this.items, { id, kind, message }];
		if (typeof window !== 'undefined') {
			window.setTimeout(() => this.dismiss(id), durationMs);
		}
	}

	success(message: string) {
		this.push(message, 'success');
	}

	error(message: string) {
		this.push(message, 'error');
	}

	info(message: string) {
		this.push(message, 'info');
	}

	dismiss(id: number) {
		this.items = this.items.filter(t => t.id !== id);
	}
}

export const toast = new ToastStore();
