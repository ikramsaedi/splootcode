{"type":"PYTHON_FILE","properties":{},"childSets":{"body":[{"type":"PYTHON_ASSIGNMENT","properties":{},"childSets":{"left":[{"type":"PYTHON_DECLARED_IDENTIFIER","properties":{"identifier":"celsius"},"childSets":{}}],"right":[{"type":"PYTHON_EXPRESSION","properties":{},"childSets":{"tokens":[{"type":"PYTHON_CALL_VARIABLE","properties":{"identifier":"input"},"childSets":{"arguments":[{"type":"PYTHON_EXPRESSION","properties":{},"childSets":{"tokens":[{"type":"STRING_LITERAL","properties":{"value":"Temperature in C: "},"childSets":{}}]}}]}}]}}]}},{"type":"PYTHON_ASSIGNMENT","properties":{},"childSets":{"left":[{"type":"PYTHON_DECLARED_IDENTIFIER","properties":{"identifier":"celsius"},"childSets":{}}],"right":[{"type":"PYTHON_EXPRESSION","properties":{},"childSets":{"tokens":[{"type":"PYTHON_CALL_VARIABLE","properties":{"identifier":"int"},"childSets":{"arguments":[{"type":"PYTHON_EXPRESSION","properties":{},"childSets":{"tokens":[{"type":"PYTHON_VARIABLE_REFERENCE","properties":{"identifier":"celsius"},"childSets":{}}]}}]}}]}}]}},{"type":"PYTHON_ASSIGNMENT","properties":{},"childSets":{"left":[{"type":"PYTHON_DECLARED_IDENTIFIER","properties":{"identifier":"fahrenheit"},"childSets":{}}],"right":[{"type":"PYTHON_EXPRESSION","properties":{},"childSets":{"tokens":[{"type":"PYTHON_VARIABLE_REFERENCE","properties":{"identifier":"celsius"},"childSets":{}},{"type":"PYTHON_BINARY_OPERATOR","properties":{"operator":"*"},"childSets":{}},{"type":"NUMERIC_LITERAL","properties":{"value":9},"childSets":{}},{"type":"PYTHON_BINARY_OPERATOR","properties":{"operator":"/"},"childSets":{}},{"type":"NUMERIC_LITERAL","properties":{"value":5},"childSets":{}},{"type":"PYTHON_BINARY_OPERATOR","properties":{"operator":"+"},"childSets":{}},{"type":"NUMERIC_LITERAL","properties":{"value":32},"childSets":{}}]}}]}},{"type":"PYTHON_EXPRESSION","properties":{},"childSets":{"tokens":[{"type":"PYTHON_CALL_VARIABLE","properties":{"identifier":"print"},"childSets":{"arguments":[{"type":"PYTHON_EXPRESSION","properties":{},"childSets":{"tokens":[{"type":"STRING_LITERAL","properties":{"value":"Temperature in F is: "},"childSets":{}},{"type":"PYTHON_BINARY_OPERATOR","properties":{"operator":"+"},"childSets":{}},{"type":"PYTHON_CALL_VARIABLE","properties":{"identifier":"str"},"childSets":{"arguments":[{"type":"PYTHON_EXPRESSION","properties":{},"childSets":{"tokens":[{"type":"PYTHON_VARIABLE_REFERENCE","properties":{"identifier":"fahrenheit"},"childSets":{}}]}}]}}]}}]}}]}}]}}