export enum HighlightColorCategory {
  NONE = 0,
  FUNCTION,
  FUNCTION_DEFINITION,
  VARIABLE,
  VARIABLE_DECLARATION,
  LITERAL_NUMBER,
  LITERAL_STRING,
  LITERAL_LIST,
  CONTROL,
  KEYWORD,
  OPERATOR,
  HTML_ELEMENT,
  HTML_ATTRIBUTE,
  STYLE_RULE,
  STYLE_PROPERTY,
}

export enum ColorUsageType {
  NODE_TEXT = 0,
  CAP_TEXT,
}

function colorBase(category: HighlightColorCategory): string {
  switch (category) {
    case HighlightColorCategory.FUNCTION:
      return 'code-yellow'
    case HighlightColorCategory.FUNCTION_DEFINITION:
      return 'code-purple'
    case HighlightColorCategory.VARIABLE_DECLARATION:
      return 'code-purple'
    case HighlightColorCategory.VARIABLE:
      return 'code-lightblue'
    case HighlightColorCategory.LITERAL_NUMBER:
      return 'code-blue'
    case HighlightColorCategory.LITERAL_STRING:
      return 'code-green'
    case HighlightColorCategory.LITERAL_LIST:
      return 'code-purple'
    case HighlightColorCategory.KEYWORD:
      return 'code-purple'
    case HighlightColorCategory.CONTROL:
      return 'code-purple'
  }
  return 'code-neutral'
}

export function getColor(category: HighlightColorCategory, usage: ColorUsageType): string {
  // Hardcode for now, but could be configurable in the future
  const base = colorBase(category)
  if (usage == ColorUsageType.CAP_TEXT) {
    return `var(--${base}-700)`
  }
  return `var(--${base}-200)`
}
