export interface CatalogNamePair {
	fr: string;
	en: string;
}

export const CI_SUBJECTS: Record<string, CatalogNamePair> = {
	ALL: { fr: 'Allemand', en: 'German' },
	ANG: { fr: 'Anglais', en: 'English' },
	AP: { fr: 'Arts Plastiques', en: 'Visual arts' },
	EDHC: { fr: 'Éducation aux Droits de l\'Homme et à la Citoyenneté', en: 'Human rights and citizenship education' },
	EPS: { fr: 'Éducation Physique et Sportive', en: 'Physical education' },
	ESP: { fr: 'Espagnol', en: 'Spanish' },
	FR: { fr: 'Français', en: 'French' },
	HG: { fr: 'Histoire-Géographie', en: 'History and geography' },
	MATH: { fr: 'Mathématiques', en: 'Mathematics' },
	MUS: { fr: 'Éducation Musicale', en: 'Music' },
	PC: { fr: 'Physique-Chimie', en: 'Physics and chemistry' },
	PHILO: { fr: 'Philosophie', en: 'Philosophy' },
	SVT: { fr: 'Sciences de la Vie et de la Terre', en: 'Life and earth sciences' },
	TECH: { fr: 'Technologie', en: 'Technology' },
	TICE: { fr: 'TICE', en: 'ICT' },
};
