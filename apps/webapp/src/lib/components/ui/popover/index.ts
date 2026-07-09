import { Popover as PopoverPrimitive } from 'bits-ui';
import Content from './popover-content.svelte';
import Trigger from './popover-trigger.svelte';

const Root = PopoverPrimitive.Root;

export {
	Content,
	Root as Popover,
	Content as PopoverContent,
	Trigger as PopoverTrigger,
	Root,
	Trigger,
};
