export const DEVICES = { mobile: { width: 390, height: 844 }, tablet: { width: 820, height: 1180 }, desktop: { width: 1440, height: 1000 } } as const;
export type Device = keyof typeof DEVICES;
export interface ScreenshotOptions {
  devices: Device[];
  locales: Array<'fr' | 'en'>;
  module?: string;
  scenario?: string;
  checkpoint?: string;
  out?: string;
  headed: boolean;
  list: boolean;
  help: boolean;
}
export function parseScreenshotOptions(args: readonly string[]): ScreenshotOptions {
  const options: ScreenshotOptions = { devices: ['mobile', 'tablet', 'desktop'], locales: ['fr', 'en'], headed: false, list: false, help: false };
  const choices = new Set(['--device', '--locale', '--module', '--scenario', '--checkpoint', '--out']);
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;
    if (arg === '--') continue;
    if (arg === '--headed') { options.headed = true; continue; }
    if (arg === '--list') { options.list = true; continue; }
    if (arg === '--help' || arg === '-h') { options.help = true; continue; }
    if (!choices.has(arg)) throw new Error(`Unknown screenshot option: ${arg}`);
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    if (arg === '--device') {
      const values = value.split(',');
      if (values.some(value => !Object.hasOwn(DEVICES, value))) throw new Error('Device must be mobile, tablet, or desktop');
      options.devices = [...new Set(values)] as Device[];
    } else if (arg === '--locale') {
      const values = value.split(',');
      if (values.some(value => value !== 'fr' && value !== 'en')) throw new Error('Locale must be fr or en');
      options.locales = [...new Set(values)] as Array<'fr' | 'en'>;
    } else options[arg.slice(2) as 'module' | 'scenario' | 'checkpoint' | 'out'] = value;
  }
  return options;
}
