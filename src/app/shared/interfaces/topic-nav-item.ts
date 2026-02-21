export interface TopicNavSubItem {
  id: string;
  labelKey: string;
}

export interface TopicNavItem {
  id: string;
  labelKey: string;
  children?: TopicNavSubItem[];
}
