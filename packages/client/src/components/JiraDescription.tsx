interface Props {
  html: string;
}

export function JiraDescription({ html }: Props) {
  return (
    <div
      className="jira-description text-xs text-[#32373c] leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
