<script lang="ts">
	import { base } from '$app/paths';

	const {
		variant = 'horizontal',
		tone = 'color',
		width,
		decorative = false,
	}: {
		variant?: 'horizontal' | 'vertical' | 'symbol';
		tone?: 'color' | 'white';
		width?: number;
		decorative?: boolean;
	} = $props();

	const names = { horizontal: 'horizontal', vertical: 'vertical', symbol: 'symbole' };
	const minimum = { horizontal: 128, vertical: 88, symbol: 26 };
	const clearSpace = { horizontal: 0.1, vertical: 0.2, symbol: 0.15 };
	const size = $derived(Math.max(width ?? (variant === 'symbol' ? 32 : minimum[variant]), minimum[variant]));
</script>

<span class="inline-flex shrink-0 items-center justify-center" style:padding={`${size * clearSpace[variant]}px`}>
	<img
		src={`${base}/brand/edaya-${names[variant]}-${tone === 'white' ? 'blanc' : 'couleur'}.svg`}
		alt={decorative ? '' : 'edaya'}
		width={size}
		class="block h-auto max-w-none"
		style:width={`${size}px`}
	/>
</span>
