export interface TopicContent {
  pageTitleKey: string;
  topicNameKey: string;
  purposeKey: string;
  roleInProgramKey: string;
}

export interface TopicSubContent {
  titleKey: string;
  descriptionKey: string;
  codeSnippets?: { language: string; code: string }[];
}
