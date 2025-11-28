import React from 'react';
import { SparklesIcon } from './icons/Icons';

const Header: React.FC = () => {
  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/80 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-16">
           <div className="flex items-center gap-2 text-gray-800">
                <SparklesIcon className="h-6 w-6 text-blue-600" />
                <span className="font-bold text-xl">Free Code Generator</span>
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;