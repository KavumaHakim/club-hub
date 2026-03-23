
import React, { useState } from 'react';
import { XIcon } from './icons/XIcon';
import { HomeIcon } from './icons/HomeIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { CodeIcon } from './icons/CodeIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { IdentificationIcon } from './icons/IdentificationIcon';
import { TrophyIcon } from './icons/TrophyIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { MapIcon } from './icons/MapIcon';

interface FeatureTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeatureTourModal: React.FC<FeatureTourModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: "Welcome to ICT Club Hub 2.0!",
      description: "We've upgraded your experience with powerful AI tools and community features. Let's take a tour of what's new!",
      icon: <span className="text-6xl animate-icon-bounce-in">🚀</span>,
      gradient: "from-pink-500 to-purple-600"
    },
    {
      title: "AI Learning Roadmaps",
      description: "Stuck on what to learn? Use the **Roadmap** tab to generate a personalized curriculum for ANY topic using Gemini AI. Complete milestones and take **AI-generated quizzes** to test your skills.",
      icon: (
        <div className="p-6 bg-white/20 rounded-full backdrop-blur-sm text-white animate-icon-bounce-in">
           <MapIcon />
        </div>
      ),
      gradient: "from-teal-400 to-emerald-600"
    },
    {
      title: "Advanced Code Playground",
      description: "Our Python environment now supports **interactive input** (just like a real terminal!). You can also **save your scripts to the cloud** and access them anywhere.",
      icon: (
         <div className="p-6 bg-white/20 rounded-full backdrop-blur-sm text-white animate-icon-bounce-in">
           <CodeIcon />
        </div>
      ),
      gradient: "from-yellow-400 to-orange-500"
    },
    {
      title: "Enhanced Projects & Grading",
      description: "Submit your project tasks and receive **detailed written feedback** alongside your grade from patrons. The AI Auto-Grader is also there to give you instant preliminary reviews.",
      icon: (
        <div className="p-6 bg-white/20 rounded-full backdrop-blur-sm text-white animate-icon-bounce-in">
           <ClipboardListIcon />
        </div>
      ),
      gradient: "from-purple-400 to-fuchsia-600"
    },
    {
      title: "Interactive Showcase",
      description: "The Showcase isn't just for viewing anymore. **Comment** on code snippets, ask questions, and build a community around your creations.",
      icon: (
        <div className="p-6 bg-white/20 rounded-full backdrop-blur-sm text-white animate-icon-bounce-in">
           <GlobeIcon />
        </div>
      ),
      gradient: "from-indigo-500 to-blue-600"
    },
    {
      title: "Smart Activities",
      description: "Manage club events with ease. Patrons can now **delete activities**, and everyone can track attendance stats in their profile.",
      icon: (
        <div className="p-6 bg-white/20 rounded-full backdrop-blur-sm text-white animate-icon-bounce-in">
           <CalendarIcon />
        </div>
      ),
      gradient: "from-red-400 to-pink-600"
    },
    {
        title: "AI Tutor & Chat",
        description: "Your **AI Tutor** is smarter than ever, aware of all club activities. Chat with peers or the bot for help at any time.",
        icon: (
          <div className="p-6 bg-white/20 rounded-full backdrop-blur-sm text-white animate-icon-bounce-in">
             <ChatBubbleIcon />
          </div>
        ),
        gradient: "from-cyan-400 to-blue-500"
    },
     {
      title: "Ready to Explore?",
      description: "That's the tour! Dive in, start building, and make the most of the ICT Club Hub.",
      icon: <span className="text-6xl animate-icon-bounce-in">✨</span>,
      gradient: "from-gray-700 to-black"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
      if (currentStep > 0) {
          setCurrentStep(prev => prev - 1);
      }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col min-h-[500px] animate-initial-fade-in-up relative border border-gray-200 dark:border-gray-700">
        
        {/* Header / Graphic Area */}
        <div className={`h-48 bg-gradient-to-br ${step.gradient} flex items-center justify-center relative transition-colors duration-500`}>
             <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 rounded-full text-white transition-colors z-10"
                aria-label="Close tour"
            >
                <XIcon />
            </button>
            <div key={currentStep} className="transform scale-125">
                {step.icon}
            </div>
            
            {/* Curved divider */}
            <div className="absolute bottom-0 left-0 right-0">
                <svg viewBox="0 0 1440 320" className="w-full h-12 text-white dark:text-gray-800 fill-current block" preserveAspectRatio="none">
                    <path fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,197.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                </svg>
            </div>
        </div>

        {/* Content Area */}
        <div key={`content-${currentStep}`} className="px-8 pb-8 pt-2 flex-1 flex flex-col text-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3 animate-content-fade-in-up">{step.title}</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6 flex-grow text-sm sm:text-base animate-content-fade-in-up" style={{ animationDelay: '0.05s' }}>
                {step.description.split('**').map((part, i) => 
                    i % 2 === 1 ? <strong key={i} className="text-gray-900 dark:text-white font-semibold">{part}</strong> : part
                )}
            </p>

            {/* Dots Indicator */}
            <div className="flex justify-center space-x-2 mb-8">
                {steps.map((_, index) => (
                    <div 
                        key={index} 
                        className={`h-1.5 rounded-full transition-all duration-300 ${index === currentStep ? `w-6 bg-gray-800 dark:bg-gray-200` : 'w-1.5 bg-gray-300 dark:bg-gray-600'}`}
                    />
                ))}
            </div>

            {/* Buttons */}
            <div className="flex justify-between items-center mt-auto gap-4">
                <button
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${currentStep === 0 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-0' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 opacity-100'}`}
                >
                    Back
                </button>
                <button
                    onClick={handleNext}
                    className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2.5 rounded-xl font-bold hover:opacity-90 hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-1.5"
                >
                    {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                    {currentStep < steps.length - 1 && <ChevronRightIcon className="w-4 h-4" />}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureTourModal;
