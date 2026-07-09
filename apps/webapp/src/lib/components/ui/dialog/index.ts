import { Dialog as DialogPrimitive } from 'bits-ui';
import Content from './dialog-content.svelte';
import Description from './dialog-description.svelte';
import Footer from './dialog-footer.svelte';
import Header from './dialog-header.svelte';
import Title from './dialog-title.svelte';
import Trigger from './dialog-trigger.svelte';

const Root = DialogPrimitive.Root;
const Close = DialogPrimitive.Close;
const Portal = DialogPrimitive.Portal;

export {
	Close,
	Content,
	Description,
	Root as Dialog,
	Content as DialogContent,
	Description as DialogDescription,
	Footer as DialogFooter,
	Header as DialogHeader,
	Title as DialogTitle,
	Trigger as DialogTrigger,
	Footer,
	Header,
	Portal,
	Root,
	Title,
	Trigger,
};
