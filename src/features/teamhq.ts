/**
 * Team HQ: the simple edition. One place that decides which screens show and what they are
 * called, so the app stays small and every name matches the way a design studio talks.
 * To bring a hidden screen back, add its key or label here. Nothing else needs to change.
 */

export const PRODUCT_NAME = 'Team HQ';

/** Features left out of the simple edition entirely (no routes, no menus). */
export const HIDDEN_FEATURES = ['email', 'marketing', 'ops'] as const;

/** Left rail, by the feature's own label → the Team HQ name. Order follows this list. */
export const RAIL: Record<string, string> = {
  Contacts: 'Clients',
  Documents: 'Files',
  'E-sign': 'Contracts',
  Settings: 'Settings',
};

/** Workspace tab strip, by key → the Team HQ name. */
export const TABS: Record<string, string> = {
  pipeline: 'Clients',
  board: 'Tasks',
  requests: 'Forms',
  messages: 'Messages',
  esign: 'Contracts',
};

/** The New menu, by key → the Team HQ name. */
export const NEW_MENU: Record<string, string> = {
  contact: 'Client',
  'work-item': 'Task',
  request: 'Form',
  envelope: 'Contract',
};

/** Bottom bar figures, by key → the Team HQ name. */
export const COUNTS: Record<string, string> = {
  unread: 'Unread',
  'to-review': 'To review',
  'to-accept': 'Waiting on you',
  clients: 'Clients',
};

/** Tabs on a client's record, by key → the Team HQ name. */
export const CLIENT_TABS: Record<string, string> = {
  activity: 'Updates',
  documents: 'Files',
  requests: 'Forms',
  messages: 'Messages',
  esign: 'Contracts',
  portal: 'Client room',
};

/** Settings sections, by key → the Team HQ name. */
export const SETTINGS: Record<string, string> = {
  identity: 'Your studio',
  appearance: 'Appearance',
  security: 'Security',
  connector: 'Connect your AI',
};

/** Client portal tabs, by label → the Team HQ name. */
export const PORTAL_TABS: Record<string, string> = {
  Home: 'Your project',
  Documents: 'Files',
  Messages: 'Messages',
};

/** Keep only the items named in `names`, rename them, and keep the given order. */
export function pick<T extends { label: string }>(items: readonly T[], names: Record<string, string>, id: (item: T) => string): T[] {
  const order = Object.keys(names);
  return items
    .filter((item) => id(item) in names)
    .map((item) => ({ ...item, label: names[id(item)], order: order.indexOf(id(item)) }));
}
