import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { StatTile } from './stats.models';

/** Breakdown tiles for account-level stats. */
export const ACCOUNT_STAT_TILES: StatTile[] = [
  {
    label: 'Launcher',
    breakdownId: 'launcher',
    icon: 'fa-rocket-launch',
    colour: 'bluey',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'launcher')}`,
  },
  {
    label: 'Platform',
    breakdownId: 'platform',
    icon: 'fa-desktop',
    colour: 'tangerine',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'platform')}`,
  },
];

/** Breakdown tiles for endeavour stats. */
export const ENDEAVOUR_STAT_TILES: StatTile[] = [
  {
    label: 'Category (% Complete)',
    breakdownId: 'endeavourCategoryPct',
    icon: 'fa-layer',
    colour: 'cool',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'endeavourCategoryPct')}`,
  },
  {
    label: 'Category (Total)',
    breakdownId: 'endeavourCategory',
    icon: 'fa-layer-group',
    colour: 'perano',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'endeavourCategory')}`,
  },
  {
    label: 'Perks (Average)',
    breakdownId: 'endeavourPerkAvg',
    icon: 'fa-sparkles',
    colour: 'sunflower',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'endeavourPerkAvg')}`,
  },
  {
    label: 'Perks (Total)',
    breakdownId: 'endeavourPerk',
    icon: 'fa-stars',
    colour: 'gold',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'endeavourPerk')}`,
  },
];

/** Breakdown tiles for character-level stats. */
export const STAT_TILES: StatTile[] = [
  {
    label: 'Allegiance',
    breakdownId: 'allegiance',
    icon: 'fa-shield-halved',
    colour: 'cool',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'allegiance')}`,
  },
  {
    label: 'Career',
    breakdownId: 'career',
    icon: 'fa-briefcase',
    colour: 'sunflower',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'career')}`,
  },
  {
    label: 'Faction',
    breakdownId: 'faction',
    icon: 'fa-flag',
    colour: 'sky',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'faction')}`,
  },
  {
    label: 'Level',
    breakdownId: 'level',
    icon: 'fa-ranking-star',
    colour: 'gold',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'level')}`,
  },
  {
    label: 'Recruitment',
    breakdownId: 'recruitment',
    icon: 'fa-user-plus',
    colour: 'green',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'recruitment')}`,
  },
  {
    label: 'Sex',
    breakdownId: 'sex',
    icon: 'fa-venus-mars',
    colour: 'violet',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'sex')}`,
  },
  {
    label: 'Species',
    breakdownId: 'species',
    icon: 'fa-dna',
    colour: 'perano',
    link: `/${APP_ROUTES.STO_DASHBOARD_STATS_DETAIL.replace(':breakdownId', 'species')}`,
  },
];
