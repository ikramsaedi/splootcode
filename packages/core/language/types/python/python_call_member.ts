import { ChildSetType } from '../../childset'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import { NodeCategory, SuggestionGenerator, registerNodeCateogry } from '../../node_category_registry'
import { ParentReference, SplootNode } from '../../node'
import { SuggestedNode } from '../../suggested_node'

import { HighlightColorCategory } from '../../../colors'
import { PYTHON_CALL_VARIABLE } from './python_call_variable'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { PYTHON_VARIABLE_REFERENCE, VariableReferenceGenerator } from './variable_reference'
import { STRING_LITERAL } from '../literals'

export const PYTHON_CALL_MEMBER = 'PYTHON_CALL_MEMBER'

class Generator implements SuggestionGenerator {
  variableGenerator: VariableReferenceGenerator

  constructor() {
    this.variableGenerator = new VariableReferenceGenerator()
  }

  staticSuggestions(parent: ParentReference, index: number) {
    return []
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    // need dynamic suggestions for when we can't infer the type.
    const leftChild = parent.getChildSet().getChild(index - 1)
    if (leftChild && textInput.startsWith('.')) {
      const leftChild = parent.getChildSet().getChild(index - 1)
      if (
        [PYTHON_VARIABLE_REFERENCE, PYTHON_CALL_MEMBER, STRING_LITERAL, PYTHON_CALL_VARIABLE].indexOf(
          leftChild.type
        ) !== -1
      ) {
        const name = textInput.substring(1) // Cut the '.' off
        const node = new PythonCallMember(null, 1)
        node.setMember(name)
        return [
          new SuggestedNode(node, `callmember ${name}`, name, true, 'Call method on object to the left', 'object'),
        ]
      }
    }
    return []
  }
}

export class PythonCallMember extends SplootNode {
  constructor(parentReference: ParentReference, argCount = 0) {
    super(parentReference, PYTHON_CALL_MEMBER)
    this.addChildSet('object', ChildSetType.Single, NodeCategory.PythonExpressionToken)
    this.setProperty('member', '')
    this.addChildSet('arguments', ChildSetType.Many, NodeCategory.PythonExpression)
    for (let i = 0; i < argCount; i++) {
      this.getArguments().addChild(new PythonExpression(null))
    }
  }

  getObjectExpressionToken() {
    return this.getChildSet('object')
  }

  getMember(): string {
    return this.getProperty('member')
  }

  setMember(identifier: string) {
    this.setProperty('member', identifier)
  }

  getArguments() {
    return this.getChildSet('arguments')
  }

  getNodeLayout(): NodeLayout {
    const layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'object'),
      new LayoutComponent(LayoutComponentType.KEYWORD, `.${this.getMember()}`),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments'),
    ])
    return layout
  }

  clean() {
    const numArgs = this.getArguments().children.length
    this.getArguments().children.forEach((child: SplootNode, index: number) => {
      // Don't remove the first argument - leave the brackets there.
      if (!(index == 0 && numArgs == 1) && child.type === PYTHON_EXPRESSION) {
        if ((child as PythonExpression).getTokenSet().getCount() === 0) {
          this.getArguments().removeChild(index)
        }
      }
    })
  }

  static deserializer(serializedNode: SerializedNode): PythonCallMember {
    const node = new PythonCallMember(null)
    node.setMember(serializedNode.properties['member'])
    node.deserializeChildSet('object', serializedNode)
    node.deserializeChildSet('arguments', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_CALL_MEMBER
    typeRegistration.deserializer = PythonCallMember.deserializer
    typeRegistration.childSets = {
      object: NodeCategory.PythonExpressionToken,
      arguments: NodeCategory.PythonExpression,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'object'),
      new LayoutComponent(LayoutComponentType.PROPERTY, 'member'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments'),
    ])
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_CALL_MEMBER, NodeCategory.PythonExpressionToken, new Generator())
  }
}