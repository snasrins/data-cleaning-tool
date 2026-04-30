export const API = '/api';

export const STEPS = [
  { num: 1, label: 'Upload' },
  { num: 2, label: 'Preview' },
  { num: 3, label: 'Configure Rules' },
  { num: 4, label: 'Analysing' },
  { num: 5, label: 'Report' },
];

export const SCHEMA_DESC = {
  // Identity
  id:               'Child ID / MyKid / IC',
  nama:             'Child name',
  jantina:          'Gender (M/F)',
  tarikh_lahir:     'Date of birth',
  // Geography
  negeri:           'State (Negeri)',
  daerah:           'District (Daerah)',
  taska:            'TASKA / Clinic name',
  // Socioeconomic
  pendapatan:       'Income group (B40/M40/T20)',
  kumpulan_umur:    'Age group label (from source)',
  // Measurement
  tarikh_ukur:      'Measurement / assessment date',
  berat_kg:         'Weight (kg)',
  tinggi_cm:        'Height / Length (cm)',
  bmi:              'BMI value',
  // Nutrition status labels (validated against WHO 2006)
  status_berat:     'Weight-for-age status label',
  status_tinggi:    'Height-for-age status label',
  status_bmi:       'BMI-for-age status label',
  // Metadata
  tahun_ukur:       'Measurement year',
  sumber:           'Data source tag',
  // Klinik-specific
  vaccine_name:     'Vaccine name (klinik data)',
  status_assessment:'Assessment completion status',
};

// Fields that are critical for WHO z-score computation
export const ZSCORE_REQUIRED_FIELDS = ['berat_kg', 'tinggi_cm', 'tarikh_lahir', 'tarikh_ukur', 'jantina'];

// Fields required for KKM indicators
export const INDICATOR_REQUIRED_FIELDS = ['negeri', 'daerah', 'jantina'];

export const LOADING_MSGS = [
  'Reading file and detecting data source...',
  'Validating IC / MyKid numbers...',
  'Checking missing values and sentinels...',
  'Normalising gender, income, status fields...',
  'Detecting spelling anomalies in status columns...',
  'Computing age in months from date of birth...',
  'Mapping Kawasan/Bahagian for Sabah & Sarawak...',
  'Computing WHO 2006 z-scores (WAZ, HAZ, BAZ)...',
  'Comparing z-scores against source labels...',
  'Computing 4 KKM nutrition indicators...',
  'Breaking down by State, Region, District...',
  'Building chart data and yearly trends...',
  'Building Tableau aggregation table...',
  'Computing data quality score (7 dimensions)...',
  'Finalising EDA report...',
];

export const REPORT_TABS = [
  { key: 'dashboard',     label: 'Dashboard', icon: 'dashboard', priority: 'high' },
  { key: 'indicators',    label: 'Indicators Detail', icon: 'chartUp', priority: 'high' },
  { key: 'taska',         label: 'TASKA Performance', icon: 'school', priority: 'high', condition: 'hasTASKA' },
  { key: 'charts',        label: 'Charts', icon: 'chartDown', priority: 'high' },
  { key: 'profile',       label: 'Data Profile', icon: 'search', priority: 'medium' },
  { key: 'missing',       label: 'Missing Values', icon: 'warning', priority: 'medium', condition: 'hasMissing' },
  { key: 'ic',            label: 'IC Validation', icon: 'idCard', priority: 'medium', condition: 'hasIC' },
  { key: 'duplicates',    label: 'Duplicates', icon: 'duplicate', priority: 'low', condition: 'hasDuplicates' },
  { key: 'zscore',        label: 'WHO Z-Scores', icon: 'ruler', priority: 'medium', condition: 'hasZScores' },
  { key: 'numerical',     label: 'Numerical Stats', icon: 'numbers', priority: 'low' },
  { key: 'categorical',   label: 'Categorical', icon: 'tag', priority: 'low' },
  { key: 'bmi',           label: 'BMI', icon: 'scale', priority: 'low', condition: 'hasBMI' },
  { key: 'age',           label: 'Age Distribution', icon: 'baby', priority: 'low', condition: 'hasAge' },
  { key: 'tableau_prep',  label: 'Tableau Prep', icon: 'clipboard', priority: 'low' },
  { key: 'changes',       label: 'Changes Log', icon: 'note', priority: 'low' },
  { key: 'preview',       label: 'Data Preview', icon: 'eye', priority: 'low' },
  { key: 'completeness',  label: 'Completeness', icon: 'completeness', priority: 'low', condition: 'hasCompleteness' },
  { key: 'spelling',      label: 'Spelling', icon: 'spelling', priority: 'low', condition: 'hasSpelling' },
];

// MyVass clinic dataset tabs (vaccine surveillance data)
export const MYVASS_TABS = [
  { key: 'dashboard',     label: 'Dataset Summary', icon: 'dashboard', priority: 'high' },
  { key: 'profile',       label: 'Data Profile', icon: 'search', priority: 'high' },
  { key: 'charts',        label: 'Charts & Distributions', icon: 'chartDown', priority: 'high' },
  { key: 'quality',       label: 'Data Quality', icon: 'warning', priority: 'high' },
  { key: 'ic',            label: 'IC Validation', icon: 'idCard', priority: 'medium', condition: 'hasIC' },
  { key: 'missing',       label: 'Missing Values', icon: 'warning', priority: 'medium', condition: 'hasMissing' },
  { key: 'duplicates',    label: 'Duplicates', icon: 'duplicate', priority: 'low', condition: 'hasDuplicates' },
  { key: 'numerical',     label: 'Numerical Stats', icon: 'numbers', priority: 'low' },
  { key: 'categorical',   label: 'Categorical', icon: 'tag', priority: 'low' },
  { key: 'preview',       label: 'Data Preview', icon: 'eye', priority: 'low' },
];

// KKM School Health dataset tabs (Berat & Tinggi)
export const KKM_TABS = [
  { key: 'dashboard',      label: 'Dashboard', icon: 'dashboard', priority: 'high' },
  { key: 'kkm_quality',    label: 'Business Rules', icon: 'warning', priority: 'high' },
  { key: 'visualizations', label: 'BMI & Growth Charts', icon: 'chartUp', priority: 'high' },
  { key: 'duplicates_kkm', label: 'Duplicate IDs', icon: 'duplicate', priority: 'high' },
  { key: 'profile',        label: 'Data Profile', icon: 'search', priority: 'medium' },
  { key: 'charts',         label: 'Charts', icon: 'chartDown', priority: 'medium' },
  { key: 'missing',        label: 'Missing Values', icon: 'warning', priority: 'medium', condition: 'hasMissing' },
  { key: 'numerical',      label: 'Numerical Stats', icon: 'numbers', priority: 'low' },
  { key: 'categorical',    label: 'Categorical', icon: 'tag', priority: 'low' },
  { key: 'preview',        label: 'Data Preview', icon: 'eye', priority: 'low' },
];
