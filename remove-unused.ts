import { Project } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});

const sourceFiles = project.getSourceFiles();

for (const sourceFile of sourceFiles) {
  let changed = false;
  
  // Get all diagnostics for the file
  const diagnostics = sourceFile.getPreEmitDiagnostics();
  
  // Filter for unused variable/import diagnostics (TS6133, TS6192)
  const unusedDiagnostics = diagnostics.filter(d => 
    d.getCode() === 6133 || d.getCode() === 6192
  );

  if (unusedDiagnostics.length > 0) {
    console.log(`Fixing unused in ${sourceFile.getFilePath()}`);
    
    // We can use the language service to get code fixes for these diagnostics
    const languageService = project.getLanguageService();
    
    // Apply fixes in reverse order to not mess up positions
    const textChanges = [];
    for (const diagnostic of unusedDiagnostics) {
      const start = diagnostic.getStart();
      const length = diagnostic.getLength();
      if (start !== undefined && length !== undefined) {
        const fixes = languageService.getCodeFixesAtPosition(
          sourceFile,
          start,
          start + length,
          [diagnostic.getCode()],
          {},
          {}
        );
        console.log("Fixes for", diagnostic.getCode(), ":", fixes.map(f => f.getFixName()));
        
        for (const fix of fixes) {
          if (fix.getFixName() === 'unusedIdentifier') {
            for (const change of fix.getChanges()) {
              textChanges.push(...change.getTextChanges());
            }
          }
        }
      }
    }
    
    // Apply text changes
    if (textChanges.length > 0) {
      // Sort in reverse order
      textChanges.sort((a, b) => b.getSpan().getStart() - a.getSpan().getStart());
      
      // Deduplicate
      const uniqueChanges = [];
      let lastStart = -1;
      for (const change of textChanges) {
        if (change.getSpan().getStart() !== lastStart) {
          uniqueChanges.push(change);
          lastStart = change.getSpan().getStart();
        }
      }
      
      for (const change of uniqueChanges) {
        sourceFile.replaceText([change.getSpan().getStart(), change.getSpan().getStart() + change.getSpan().getLength()], change.getNewText());
      }
      changed = true;
    }
  }
  
  if (changed) {
    sourceFile.saveSync();
  }
}

console.log('Done');
