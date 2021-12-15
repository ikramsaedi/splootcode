import * as recast from 'recast'

import { BINARY_OPERATOR, BinaryOperator } from './binary_operator'
import { ChildSetType } from '../../childset'
import { ExpressionKind, UnaryExpressionKind } from 'ast-types/gen/kinds'
import { HTML_SCRIPT_ElEMENT, SplootHtmlScriptElement } from '../html/html_script_element'
import { HighlightColorCategory } from '../../../colors'
import { JavaScriptSplootNode } from '../../javascript_node'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import {
  NodeCategory,
  SuggestionGenerator,
  getAutocompleteFunctionsForCategory,
  registerNodeCateogry,
} from '../../node_category_registry'
import { ParentReference, SplootNode } from '../../node'
import { SuggestedNode } from '../../suggested_node'

export const SPLOOT_EXPRESSION = 'SPLOOT_EXPRESSION'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    // Get all static expression tokens available and wrap them in an expression node.
    const suggestionGeneratorSet = getAutocompleteFunctionsForCategory(NodeCategory.ExpressionToken)
    let staticSuggestions = [] as SuggestedNode[]
    suggestionGeneratorSet.forEach((generator: SuggestionGenerator) => {
      const expressionSuggestions = generator
        .staticSuggestions(parent, index)
        .map((tokenNodeSuggestion: SuggestedNode) => {
          const expressionNode = new SplootExpression(null)
          expressionNode.getTokenSet().addChild(tokenNodeSuggestion.node)
          tokenNodeSuggestion.node = expressionNode
          return tokenNodeSuggestion
        })
      staticSuggestions = staticSuggestions.concat(expressionSuggestions)
    })
    return staticSuggestions
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    const suggestionGeneratorSet = getAutocompleteFunctionsForCategory(NodeCategory.ExpressionToken)
    let staticSuggestions = [] as SuggestedNode[]
    suggestionGeneratorSet.forEach((generator: SuggestionGenerator) => {
      const expressionSuggestions = generator
        .dynamicSuggestions(parent, index, textInput)
        .map((tokenNodeSuggestion: SuggestedNode) => {
          const expressionNode = new SplootExpression(null)
          expressionNode.getTokenSet().addChild(tokenNodeSuggestion.node)
          tokenNodeSuggestion.node = expressionNode
          return tokenNodeSuggestion
        })
      staticSuggestions = staticSuggestions.concat(expressionSuggestions)
    })
    return staticSuggestions
  }
}

function parseLeaf(tokens: SplootNode[], current: number): [ExpressionKind, number] {
  if (current >= tokens.length) {
    console.warn('Index out of bounds attempting to parse leaf')
  }
  const lookahead = tokens[current]
  // If we hit an operator here, it might be a unary operator.
  if (lookahead.type === BINARY_OPERATOR) {
    const op = lookahead as BinaryOperator
    if (['+', '-', '++', '--'].indexOf(op.getOperator()) !== -1) {
      const [argument, newCurrent] = parseLeaf(tokens, current + 1)
      const expr: UnaryExpressionKind = recast.types.builders.unaryExpression(op.getOperator(), argument)
      return [expr, newCurrent]
    }
  }
  return [(tokens[current] as JavaScriptSplootNode).generateJsAst() as ExpressionKind, current + 1]
}

function parseExpression(
  lhs: ExpressionKind,
  tokens: SplootNode[],
  current: number,
  minPrecedence: number
): [ExpressionKind, number] {
  if (current >= tokens.length) {
    return [lhs, current]
  }

  let lookahead = tokens[current]
  while (
    lookahead &&
    lookahead.type === BINARY_OPERATOR &&
    (lookahead as BinaryOperator).getPrecedence() >= minPrecedence
  ) {
    const operator = lookahead as BinaryOperator
    current += 1
    let rhs: ExpressionKind
    ;[rhs, current] = parseLeaf(tokens, current)
    if (current < tokens.length) {
      lookahead = tokens[current]
      while (
        lookahead &&
        lookahead.type === BINARY_OPERATOR &&
        (lookahead as BinaryOperator).getPrecedence() > operator.getPrecedence()
      ) {
        ;[rhs, current] = parseExpression(rhs, tokens, current, (lookahead as BinaryOperator).getPrecedence())
        if (current < tokens.length) {
          lookahead = tokens[current]
        } else {
          lookahead = null
        }
      }
    } else {
      lookahead = null
    }
    lhs = recast.types.builders.binaryExpression(operator.getOperator(), lhs, rhs)
  }
  return [lhs, current]
}

export class SplootExpression extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, SPLOOT_EXPRESSION)
    this.addChildSet('tokens', ChildSetType.Many, NodeCategory.ExpressionToken)
  }

  getTokenSet() {
    return this.getChildSet('tokens')
  }

  generateJsAst(): ExpressionKind {
    if (this.getTokenSet().children.length === 0) {
      // TODO: Raise some kind of error here, a null expression means the user hasn't filled it in yet.
      console.warn('Attempted to get tokens from empty expression')
      return null
    }
    const tokens = this.getTokenSet().children
    const [lhs, index] = parseLeaf(tokens, 0)
    const [ast] = parseExpression(lhs, tokens, index, 0)
    if (ast === null) {
      console.warn('Null AST from nodes: ', this.getTokenSet().children[0])
    }
    return ast
  }

  clean() {
    // If this expression is now empty, call `clean` on the parent.
    // If the parent doesn't allow empty expressions, it'll delete it.
    if (this.getTokenSet().getCount() === 0) {
      this.parent.node.clean()
    }
  }

  static deserializer(serializedNode: SerializedNode): SplootExpression {
    const res = new SplootExpression(null)
    res.deserializeChildSet('tokens', serializedNode)
    return res
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = SPLOOT_EXPRESSION
    typeRegistration.deserializer = SplootExpression.deserializer
    typeRegistration.properties = ['tokens']
    typeRegistration.childSets = { tokens: NodeCategory.ExpressionToken }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.NONE, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'tokens'),
    ])
    typeRegistration.pasteAdapters[HTML_SCRIPT_ElEMENT] = (node: SplootNode) => {
      const scriptEl = new SplootHtmlScriptElement(null)
      scriptEl.getContent().addChild(node)
      return scriptEl
    }

    registerType(typeRegistration)
    // When needed create the expression while autocompleting the expresison token.
    registerNodeCateogry(SPLOOT_EXPRESSION, NodeCategory.Statement, new Generator())
    registerNodeCateogry(SPLOOT_EXPRESSION, NodeCategory.Expression, new Generator())
  }
}