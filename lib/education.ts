/**
 * Matières et niveaux — alignés sur le site (src/data/educationData.ts).
 */
export const SUBJECTS: string[] = [
    'Français',
    'Mathématiques',
    'Histoire-Géographie',
    'Sciences de la Vie et de la Terre (SVT)',
    'Physique-Chimie',
    'Technologie',
    'Anglais',
    'Espagnol',
    'Allemand',
    'Italien',
    'Philosophie',
    'Économie',
    'Informatique',
    'Linguistique',
    'Arts Plastiques',
    'Éducation Musicale',
    'EPS',
    'Sciences Économiques et Sociales (SES)',
    'Numérique et Sciences Informatiques (NSI)',
    'Humanités, Littérature et Philosophie (HLP)',
    "Sciences de l'Ingénieur (SI)",
    'Géopolitique (HGGSP)',
    'Littérature et Langues (LLCE)',
    'Droit',
    'Management',
    'Biologie',
    'Géologie',
    'Latin / Grec',
    'Portugais',
    'Chinois',
    'Arabe',
    'Enseignement Moral et Civique (EMC)',
];

export const LEVELS: string[] = [
    '6ème', '5ème', '4ème', '3ème',
    'Seconde', 'Première', 'Terminale',
    'BTS', 'Prépa',
    'Licence 1', 'Licence 2', 'Licence 3',
    'Master 1', 'Master 2', 'Doctorat',
];

/**
 * Icône par matière — même table que le site (educationData.subjectIconComponents,
 * icônes Lucide). Les clés sont celles de components/Icon.
 */
export function subjectIcon(subject: string): string {
    const map: Record<string, string> = {
        'Français': 'book',
        'Mathématiques': 'calculator',
        'Histoire-Géographie': 'earth',
        'Sciences de la Vie et de la Terre (SVT)': 'leaf',
        'Physique-Chimie': 'flask',
        'Technologie': 'hardware-chip',
        'Anglais': 'language',
        'Espagnol': 'language',
        'Allemand': 'language',
        'Italien': 'language',
        'Linguistique': 'language',
        'Philosophie': 'bulb',
        'Économie': 'bar-chart',
        'Informatique': 'code-slash',
        'Arts Plastiques': 'color-palette',
        'Éducation Musicale': 'musical-notes',
        'EPS': 'barbell',
        'Sciences Économiques et Sociales (SES)': 'bar-chart',
        'Numérique et Sciences Informatiques (NSI)': 'code-slash',
        'Humanités, Littérature et Philosophie (HLP)': 'book-text',
        "Sciences de l'Ingénieur (SI)": 'wrench',
        'Géopolitique (HGGSP)': 'landmark',
        'Littérature et Langues (LLCE)': 'pen-tool',
        'Droit': 'scale',
        'Management': 'briefcase',
        'Biologie': 'microscope',
        'Géologie': 'compass',
        'Latin / Grec': 'school',
        'Portugais': 'language',
        'Chinois': 'language',
        'Arabe': 'language',
        'Enseignement Moral et Civique (EMC)': 'people',
    };
    return map[subject] || 'book';
}
