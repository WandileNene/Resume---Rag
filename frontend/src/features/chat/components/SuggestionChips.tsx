interface SuggestionChipsProps {
  onSelect: (query: string) => void;
}

const suggestions = [
  ['Selenium QA · 3 years', 'Selenium automation engineer 3 years'],
  ['Python · machine learning', 'Python developer with machine learning'],
  ['Java · AWS backend', 'Java backend developer AWS cloud'],
  ['Lead QA · Cypress', 'Lead QA engineer with Cypress and CI/CD'],
];

export function SuggestionChips({ onSelect }: SuggestionChipsProps) {
  return (
    <div className="suggestion-chips" aria-label="Suggested searches">
      {suggestions.map(([label, query]) => (
        <button key={query} type="button" onClick={() => onSelect(query)}>{label}</button>
      ))}
    </div>
  );
}