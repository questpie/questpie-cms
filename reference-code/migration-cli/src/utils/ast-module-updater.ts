import * as fs from 'node:fs'
import * as ts from 'typescript'

export class AstModuleUpdater {
  updateModuleFile(modulePath: string, moduleName: string, fullPackageName: string): void {
    const sourceCode = fs.readFileSync(modulePath, 'utf-8')
    const sourceFile = ts.createSourceFile(modulePath, sourceCode, ts.ScriptTarget.Latest, true)

    // Transform the AST
    const result = ts.transform(sourceFile, [this.createTransformer(moduleName, fullPackageName)])

    const transformedSourceFile = result.transformed[0] as ts.SourceFile

    // Print the transformed AST back to code
    const printer = ts.createPrinter({
      newLine: ts.NewLineKind.LineFeed,
    })

    const newSourceCode = printer.printFile(transformedSourceFile)

    // Write back to file
    fs.writeFileSync(modulePath, newSourceCode)

    console.info(`✅ Successfully updated module file: ${modulePath}`)
    result.dispose()
  }

  private createTransformer(
    moduleName: string,
    fullPackageName: string,
  ): ts.TransformerFactory<ts.SourceFile> {
    return (context: ts.TransformationContext) => {
      return (sourceFile: ts.SourceFile) => {
        let hasMigrationPropertyAdded = false
        let hasImportAlready = false

        // Check if migration import already exists
        const migrationsVariableName = `${moduleName.replace(/[^a-zA-Z0-9]/g, '_')}Migrations`
        for (const statement of sourceFile.statements) {
          if (ts.isImportDeclaration(statement) && statement.moduleSpecifier) {
            const moduleSpec = statement.moduleSpecifier as ts.StringLiteral
            if (moduleSpec.text.includes('/migrations/index')) {
              hasImportAlready = true
              break
            }
          }
        }

        const visitor = (node: ts.Node): ts.Node => {
          // Update defineModule call to add migrations property
          if (
            ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            node.expression.text === 'defineModule' &&
            !hasMigrationPropertyAdded
          ) {
            hasMigrationPropertyAdded = true
            return this.addMigrationsProperty(node, moduleName)
          }

          return ts.visitEachChild(node, visitor, context)
        }

        let transformedSourceFile = ts.visitNode(sourceFile, visitor) as ts.SourceFile

        // Add import after transformation if needed
        if (!hasImportAlready) {
          transformedSourceFile = this.addImportToSourceFile(
            transformedSourceFile,
            moduleName,
            fullPackageName,
          )
        }

        return transformedSourceFile
      }
    }
  }

  private addImportToSourceFile(
    sourceFile: ts.SourceFile,
    moduleName: string,
    fullPackageName: string,
  ): ts.SourceFile {
    const importStatement = this.createMigrationImport(moduleName, fullPackageName)

    // Find the last import statement
    let lastImportIndex = -1
    for (let i = 0; i < sourceFile.statements.length; i++) {
      const statement = sourceFile.statements[i]
      if (statement && ts.isImportDeclaration(statement)) {
        lastImportIndex = i
      }
    }

    // Insert the new import after the last import
    const newStatements = [...sourceFile.statements]
    newStatements.splice(lastImportIndex + 1, 0, importStatement)

    return ts.factory.updateSourceFile(sourceFile, newStatements)
  }

  private createMigrationImport(moduleName: string, fullPackageName: string): ts.ImportDeclaration {
    const migrationsVariableName = `${moduleName.replace(/[^a-zA-Z0-9]/g, '_')}Migrations`

    return ts.factory.createImportDeclaration(
      undefined,
      ts.factory.createImportClause(
        false,
        undefined,
        ts.factory.createNamedImports([
          ts.factory.createImportSpecifier(
            false,
            undefined,
            ts.factory.createIdentifier(migrationsVariableName),
          ),
        ]),
      ),
      ts.factory.createStringLiteral(`${fullPackageName}/migrations/index`),
      undefined,
    )
  }

  private addMigrationsProperty(
    defineModuleCall: ts.CallExpression,
    moduleName: string,
  ): ts.CallExpression {
    const migrationsVariableName = `${moduleName.replace(/[^a-zA-Z0-9]/g, '_')}Migrations`

    if (defineModuleCall.arguments.length === 0) {
      return defineModuleCall
    }

    const arrowFunction = defineModuleCall.arguments[0] as ts.ArrowFunction
    if (!arrowFunction || !ts.isArrowFunction(arrowFunction)) {
      return defineModuleCall
    }

    const objectLiteral = arrowFunction.body as ts.ParenthesizedExpression
    if (!objectLiteral || !ts.isParenthesizedExpression(objectLiteral)) {
      return defineModuleCall
    }

    const innerObject = objectLiteral.expression as ts.ObjectLiteralExpression
    if (!innerObject || !ts.isObjectLiteralExpression(innerObject)) {
      return defineModuleCall
    }

    // Find the definitions property
    let definitionsProperty: ts.PropertyAssignment | undefined
    let definitionsIndex = -1

    for (let i = 0; i < innerObject.properties.length; i++) {
      const prop = innerObject.properties[i]
      if (
        prop &&
        ts.isPropertyAssignment(prop) &&
        ts.isIdentifier(prop.name) &&
        prop.name.text === 'definitions'
      ) {
        definitionsProperty = prop
        definitionsIndex = i
        break
      }
    }

    if (!definitionsProperty || !ts.isArrayLiteralExpression(definitionsProperty.initializer)) {
      return defineModuleCall
    }

    const definitionsArray = definitionsProperty.initializer as ts.ArrayLiteralExpression

    // Check if migrations already exist in the array
    const hasMigrations = definitionsArray.elements.some(
      (element) => ts.isIdentifier(element) && element.text.includes('Migrations'),
    )

    if (hasMigrations) {
      return defineModuleCall
    }

    // Add migrations to the definitions array
    const migrationsElement = ts.factory.createIdentifier(migrationsVariableName)
    const newElements = [...definitionsArray.elements, migrationsElement]

    // Create new definitions array with proper comma handling
    const updatedDefinitionsArray = ts.factory.createArrayLiteralExpression(
      newElements,
      true, // multiLine = true for proper formatting
    )

    // Create updated definitions property
    const updatedDefinitionsProperty = ts.factory.createPropertyAssignment(
      ts.factory.createIdentifier('definitions'),
      updatedDefinitionsArray,
    )

    // Replace the definitions property in the object
    const updatedProperties = [...innerObject.properties]
    updatedProperties[definitionsIndex] = updatedDefinitionsProperty

    // Create updated object literal
    const updatedObjectLiteral = ts.factory.createObjectLiteralExpression(
      updatedProperties,
      true, // multiLine = true
    )

    const updatedParenthesized = ts.factory.createParenthesizedExpression(updatedObjectLiteral)

    const updatedArrowFunction = ts.factory.createArrowFunction(
      arrowFunction.modifiers,
      arrowFunction.typeParameters,
      arrowFunction.parameters,
      arrowFunction.type,
      arrowFunction.equalsGreaterThanToken,
      updatedParenthesized,
    )

    return ts.factory.createCallExpression(
      defineModuleCall.expression,
      defineModuleCall.typeArguments,
      [updatedArrowFunction],
    )
  }
}
