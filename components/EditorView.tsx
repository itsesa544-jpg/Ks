import React, { useState, useRef, useCallback, useEffect } from 'react';
import { generateHtmlForProjectStream } from '../services/geminiService';
import { UploadIcon, ClipboardCopyIcon, CheckIcon, SparklesIcon, XCircleIcon, ImageIcon, CodeIcon, FileIcon } from './icons/Icons';
import type { ProcessedFile } from '../App';
import type { ProjectFile } from '../services/geminiService';


interface EditorViewProps {
    onGenerationStart: (fileData: { name: string; path: string; sourceFiles: ProjectFile[] }) => void;
    onStreamUpdate: (path: string, htmlChunk: string) => void;
    activeFile: ProcessedFile | null;
    onAddFilesToProject: (projectPath: string, newFiles: ProjectFile[]) => void;
    onReset: () => void;
}


const EditorView: React.FC<EditorViewProps> = ({ onGenerationStart, onStreamUpdate, activeFile, onAddFilesToProject, onReset }) => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
    
    // State for inputs
    const [pastedCode, setPastedCode] = useState<string>('');
    const [inputFileName, setInputFileName] = useState<string>('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [imageMimeType, setImageMimeType] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!activeFile) return;

        if (activeFile.sourceFiles.length > 0 && activeFile.generatedHtml === '') {
            const generate = async () => {
                setIsLoading(true);
                setError(null);
                setActiveTab('preview');
                try {
                    await generateHtmlForProjectStream(activeFile.sourceFiles, { data: imageBase64, mimeType: imageMimeType }, (chunk) => {
                        onStreamUpdate(activeFile.path, chunk);
                    });
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                    setError(errorMessage);
                    console.error("Generation error:", err);
                } finally {
                    setIsLoading(false);
                }
            };
            generate();
        }
    }, [activeFile, imageBase64, imageMimeType, onStreamUpdate]);


    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const fileReadPromises = Array.from(files).map((file: File) => {
            return new Promise<ProjectFile>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve({ name: file.name, code: e.target?.result as string });
                reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
                reader.readAsText(file);
            });
        });

        try {
            const projectFiles = await Promise.all(fileReadPromises);
            
            if (activeFile) {
                onAddFilesToProject(activeFile.path, projectFiles);
            } else {
                const projectName = projectFiles.length > 1 ? `Project (${projectFiles.length} files)` : projectFiles[0].name;
                onGenerationStart({ name: projectName, path: projectName, sourceFiles: projectFiles });
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An error occurred while processing files.";
            setError(`File Read Error: ${errorMessage}`);
            console.error("File reading error:", err);
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

     const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setImagePreview(result);
                const base64Data = result.split(',')[1];
                setImageBase64(base64Data);
                setImageMimeType(file.type);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const removeImage = () => {
        setImagePreview(null);
        setImageBase64(null);
        setImageMimeType(null);
        if(imageInputRef.current) {
            imageInputRef.current.value = '';
        }
    }

    const processPastedCode = (code: string, name: string) => {
        const projectFiles: ProjectFile[] = [{ name, code }];
        onGenerationStart({ name: name, path: name, sourceFiles: projectFiles });
    };
    
    const handleUploadClick = () => fileInputRef.current?.click();
    const handleImageUploadClick = () => imageInputRef.current?.click();

    const handleCopy = useCallback(() => {
        if (activeFile?.generatedHtml) {
            navigator.clipboard.writeText(activeFile.generatedHtml).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            });
        }
    }, [activeFile]);
    
    const handleGenerateFromText = () => {
        setValidationError(null);
        if (!pastedCode.trim()) {
            setValidationError("Please paste some code to convert.");
            return;
        }
        if (!inputFileName.trim() || !inputFileName.includes('.')) {
            setValidationError("Please provide a valid file name with an extension (e.g., script.js).");
            return;
        }
        processPastedCode(pastedCode, inputFileName);
    };
    
    const handleResetAndClear = () => {
      onReset();
      setPastedCode('');
      setInputFileName('');
      setImageBase64(null);
      setImagePreview(null);
      setImageMimeType(null);
      setError(null);
      setValidationError(null);
    }

    const renderContent = () => {
        if (error) {
            return (
                 <div className="flex flex-col items-center justify-center h-full text-red-500 p-8 text-center">
                    <p className="text-lg font-semibold">An Error Occurred</p>
                    <p className="mt-2 text-sm max-w-md text-center text-gray-600">{error}</p>
                    <button onClick={handleResetAndClear} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Try Again
                    </button>
                </div>
            );
        }
        
        if (activeFile) {
             return (
                <div className="w-full h-full flex flex-col bg-gray-50">
                   <div className="flex justify-between items-center p-3 border-b border-gray-200 shrink-0 bg-white">
                        <div className="flex items-center gap-2">
                           <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                                <button 
                                    onClick={() => setActiveTab('preview')}
                                    className={`px-3 py-1 text-sm rounded-md transition-colors ${activeTab === 'preview' ? 'bg-white shadow-sm text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-200'}`}
                                >
                                    Preview
                                </button>
                                <button 
                                    onClick={() => setActiveTab('code')}
                                    className={`px-3 py-1 text-sm rounded-md transition-colors ${activeTab === 'code' ? 'bg-white shadow-sm text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-200'}`}
                                >
                                    HTML
                                </button>
                            </div>
                            <div className='w-px h-6 bg-gray-200 mx-2'></div>
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700">
                                <FileIcon className="w-4 h-4 mr-2 text-gray-500"/>
                                {activeFile.path}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                             <button onClick={handleResetAndClear} className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Start Over</button>
                             <button 
                                onClick={handleUploadClick}
                                disabled={isLoading}
                                className="flex items-center gap-2 bg-white border border-gray-300 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <UploadIcon className="h-4 w-4" />
                                Add File(s)
                            </button>
                            <button 
                                onClick={handleCopy}
                                disabled={isLoading || !activeFile.generatedHtml}
                                className="flex items-center gap-2 bg-blue-600 border border-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCopied ? <CheckIcon className="h-4 w-4" /> : <ClipboardCopyIcon className="h-4 w-4" />}
                                {isCopied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>
                   <div className="flex-1 overflow-auto bg-white shadow-inner">
                        {activeTab === 'preview' ? (
                            <iframe
                                key={activeFile.path}
                                srcDoc={activeFile.generatedHtml}
                                title="HTML Preview"
                                sandbox="allow-scripts allow-same-origin"
                                className="w-full h-full border-0 bg-white"
                            />
                        ) : (
                             <pre className="h-full overflow-auto p-4 text-sm whitespace-pre-wrap bg-[#f8fafc]"><code className="language-html">{activeFile.generatedHtml}</code></pre>
                        )}
                   </div>
                </div>
            );
        }

        return (
           <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
                <div className="bg-white rounded-xl shadow-lg p-8">
                     <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">Generate HTML from any Code</h1>
                        <p className="text-gray-600 mt-2">Paste your code, upload your files, and let AI build a complete, runnable application for you.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        {/* Left: Paste Code */}
                        <div className="flex flex-col gap-4">
                             <div>
                                <label htmlFor="filename" className="block text-sm font-medium text-gray-700 mb-1">File Name</label>
                                <input type="text" id="filename" value={inputFileName} onChange={(e) => setInputFileName(e.target.value)} placeholder="e.g., components/Card.tsx" className="bg-gray-50 border border-gray-300 rounded-lg w-full px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"/>
                                <p className="text-xs text-gray-500 mt-1">Required for language detection.</p>
                            </div>
                            <div>
                                <label htmlFor="code-input" className="block text-sm font-medium text-gray-700 mb-1">Paste Code</label>
                                <textarea id="code-input" value={pastedCode} onChange={(e) => setPastedCode(e.target.value)} placeholder="// Your code goes here..." className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none h-48"></textarea>
                            </div>
                        </div>

                        {/* Right: Upload Files */}
                        <div className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-300 rounded-lg h-full bg-gray-50/50">
                             <div className="mb-4">
                                <UploadIcon className="h-10 w-10 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800">Upload a project or files</h3>
                            <p className="text-gray-500 mt-1 text-sm mb-4">Select multiple files to combine them into a single application.</p>
                            <button onClick={handleUploadClick} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed">
                                Select File(s)
                            </button>
                        </div>
                    </div>
                     <div className="mt-6">
                        {!imagePreview ? (
                            <button onClick={handleImageUploadClick} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-blue-500 text-gray-500 hover:text-blue-600 font-medium py-3 px-4 rounded-lg transition-colors bg-gray-50/50 hover:bg-blue-50">
                                <ImageIcon className="h-5 w-5"/>
                                Add Image Reference (Optional)
                            </button>
                        ) : (
                            <div className="relative border border-gray-300 rounded-lg p-2 bg-gray-50">
                                <p className="text-xs text-gray-500 mb-2 font-medium">Image Reference:</p>
                                <img src={imagePreview} alt="Preview" className="max-h-24 rounded-md" />
                                <button onClick={removeImage} className="absolute -top-2 -right-2 bg-white rounded-full text-gray-500 hover:text-red-500 hover:bg-gray-100 shadow">
                                    <XCircleIcon className="h-6 w-6"/>
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 border-t border-gray-200 pt-6">
                         {validationError && (<p className="text-red-500 text-sm text-center mb-4">{validationError}</p>)}
                         <button onClick={handleGenerateFromText} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-base">
                            <SparklesIcon className="h-5 w-5"/>
                            Generate HTML
                        </button>
                    </div>

                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
             <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="*/*" multiple />
            <input type="file" ref={imageInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
            <div className="flex-1 overflow-auto">
                {renderContent()}
            </div>
        </div>
    );
};

export default EditorView;