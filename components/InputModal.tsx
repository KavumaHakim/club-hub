
import React, { useState, useEffect, useRef } from 'react';

interface InputModalProps {
  isOpen: boolean;
  promptText: string;
  onSubmit: (value: string) => void;
}

const InputModal: React.FC<InputModalProps> = ({ isOpen, promptText, onSubmit }) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-gray-200 dark:border-gray-700 animate-fade-in-up">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Python Input
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
            {promptText || "Input requested:"}
        </p>
        
        <form onSubmit={handleSubmit}>
            <input 
                ref={inputRef}
                type="text" 
                value={value} 
                onChange={e => setValue(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none mb-4"
                placeholder="Type your input here..."
            />
            <div className="flex justify-end">
                <button 
                    type="submit"
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors shadow-md"
                >
                    Submit
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default InputModal;
