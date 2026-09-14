/** EDAYA semantic tones. Brand color never determines status meaning. */

export const BADGE = 'bg-secondary text-foreground/80';
export const BADGE_SUCCESS = 'bg-success-soft text-success';
export const BADGE_INFO = 'bg-primary/10 text-primary';
export const BADGE_WARN = 'bg-highlight-soft text-highlight';
export const BADGE_DANGER = 'bg-destructive/10 text-destructive';

/** Resource list status chips (`Resource.status`). */
export const RESOURCE_STATUS_TONE: Record<'available' | 'booked' | 'maintenance', string> = {
	available: BADGE,
	booked: BADGE,
	maintenance: BADGE_DANGER,
};

/** Incident severity chips (list views). */
export const INCIDENT_SEVERITY_TONE: Record<'low' | 'medium' | 'high', string> = {
	low: BADGE,
	medium: BADGE_WARN,
	high: BADGE_DANGER,
};

export const ROW_ACTIVE = 'bg-primary/10';
export const ROW_HOVER = 'hover:bg-secondary';

export const AVATAR
	= 'flex items-center justify-center bg-primary font-display font-semibold text-primary-foreground';

export const SURFACE = 'rounded-xl bg-secondary/50 p-3';
export const SURFACE_INFO = 'rounded-xl bg-primary/5 p-3';
export const SURFACE_WARN = 'rounded-xl bg-highlight-soft/60 p-3';

export const DOT = 'bg-accent';
export const DOT_MUTED = 'bg-muted-foreground/35';
export const DOT_SOFT = 'bg-accent/50';
