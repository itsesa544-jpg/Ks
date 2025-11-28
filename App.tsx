import React, { useState } from 'react';
import Header from './components/Header';
import EditorView from './components/EditorView';
import type { ProjectFile } from './services/geminiService';

export interface ProcessedFile {
  name: string;
  path: string;
  sourceFiles: ProjectFile[];
  generatedHtml: string;
}

const App: React.FC = () => {
  const [processedFiles, setProcessedFiles] = useState<Record<string, ProcessedFile>>({});
  const [activeFile, setActiveFile] = useState<string | null>(null);

  const handleGenerationStart = (fileData: { name: string; path: string; sourceFiles: ProjectFile[] }) => {
    const newFile: ProcessedFile = { ...fileData, generatedHtml: '' };
    setProcessedFiles(prevFiles => ({
        ...prevFiles,
        [newFile.path]: newFile
    }));
    setActiveFile(newFile.path);
  };

  const handleAddFilesToProject = (projectPath: string, newFiles: ProjectFile[]) => {
      setProcessedFiles(prev => {
          const project = prev[projectPath];
          if (!project) return prev;

          const existingFileNames = new Set(project.sourceFiles.map(f => f.name));
          const uniqueNewFiles = newFiles.filter(f => !existingFileNames.has(f.name));

          if (uniqueNewFiles.length === 0) return prev;

          return {
              ...prev,
              [projectPath]: {
                  ...project,
                  sourceFiles: [...project.sourceFiles, ...uniqueNewFiles],
                  generatedHtml: '' // Reset for regeneration
              }
          }
      });
  };

  const handleStreamUpdate = (path: string, htmlChunk: string) => {
    setProcessedFiles(prevFiles => {
      const existingFile = prevFiles[path];
      if (existingFile) {
        return {
          ...prevFiles,
          [path]: {
            ...existingFile,
            generatedHtml: existingFile.generatedHtml + htmlChunk,
          }
        };
      }
      return prevFiles;
    });
  };

  const handleReset = () => {
    setProcessedFiles({});
    setActiveFile(null);
  };

  const activeFileData = activeFile ? processedFiles[activeFile] : null;

  return (
    <div className="flex flex-col min-h-screen font-sans bg-gray-50 text-gray-800">
      <Header />
      <main className="flex-1 flex flex-col w-full">
        <EditorView 
          onGenerationStart={handleGenerationStart}
          onStreamUpdate={handleStreamUpdate}
          activeFile={activeFileData}
          onAddFilesToProject={handleAddFilesToProject}
          onReset={handleReset}
        />
      </main>
    </div>
  );
};

export default App;