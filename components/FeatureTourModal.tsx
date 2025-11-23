
import React, { useState } from 'react';
import { XIcon } from './icons/XIcon';
import { HomeIcon } from './icons/HomeIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { CodeIcon } from './icons/CodeIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';

interface FeatureTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeatureTourModal: React.FC<FeatureTourModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: "Welcome to ICT Club Hub!",
      description: "We're excited to have you! This is your central place to connect, learn, and build with fellow members. Let's take a quick look around.",
      icon: <span className="text-6xl">👋</span>,
      gradient: "from-pink-500 to-purple-600"
    },
    {
      title: "Stay in the Loop",
      description: "The **Feed** keeps you updated with club announcements. Check **Activities** to see upcoming events, workshops, and deadlines.",
      icon: (
        <div className="flex space-x-6 text-white">
           <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm"><HomeIcon /></div>
           <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm"><CalendarIcon /></div>
        </div>
      ),
      gradient: "from-blue-400 to-indigo-600"
    },
    {
      title: "Collaborate & Chat",
      description: "Manage tasks on the **Projects** board and communicate in real-time with **Messages**. Teamwork makes the dream work!",
      icon: (
        <div className="flex space-x-6 text-white">
           <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm"><ClipboardListIcon /></div>
           <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm"><ChatBubbleIcon /></div>
        </div>
      ),
      gradient: "from-purple-400 to-fuchsia-600"
    },
    {
      title: "Learn & Code",
      description: "Access tutorials in **Resources** or write and execute Python code instantly in the **Playground**.",
      icon: (
         <div className="flex space-x-6 text-white">
           <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm"><BookOpenIcon /></div>
           <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm"><CodeIcon /></div>
        </div>
      ),
      gradient: "from-emerald-400 to-teal-600"
    },
     {
      title: "You're All Set!",
      description: "Explore the app, customize your profile, and start building. If you have questions, ask a Patron or use the club chat.",
      icon: <span className="text-6xl">🚀</span>,
      gradient: "from-orange-400 to-red-500"
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
      <style>{`
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.4s ease-out forwards;
        }
      `}</style>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col min-h-[450px] animate-fade-in-up relative border border-gray-200 dark:border-gray-700">
        
        {/* Header / Graphic Area */}
        <div className={`h-48 bg-gradient-to-br ${step.gradient} flex items-center justify-center relative transition-colors duration-500`}>
             <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 rounded-full text-white transition-colors z-10"
                aria-label="Close tour"
            >
                <XIcon />
            </button>
            <div className="transform scale-110 transition-transform duration-500">
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
        <div className="px-8 pb-8 pt-2 flex-1 flex flex-col text-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3 transition-all duration-300">{step.title}</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6 flex-grow text-sm sm:text-base">
                {step.description.split('**').map((part, i) => 
                    i % 2 === 1 ? <strong key={i} className="text-gray-900 dark:text-white font-semibold">{part}</strong> : part
                )}
            </p>

            {/* Dots Indicator */}
            <div className="flex justify-center space-x-2 mb-6">
                {steps.map((_, index) => (
                    <div 
                        key={index} 
                        className={`h-2 rounded-full transition-all duration-300 ${index === currentStep ? `w-6 bg-gray-800 dark:bg-gray-200` : 'w-2 bg-gray-300 dark:bg-gray-600'}`}
                    />
                ))}
            </div>

            {/* Buttons */}
            <div className="flex justify-between items-center mt-auto gap-4">
                <button
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${currentStep === 0 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400'}`}
                >
                    Back
                </button>
                <button
                    onClick={handleNext}
                    className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2.5 rounded-xl font-bold hover:opacity-90 hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex-1 max-w-[160px]"
                >
                    {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureTourModal;
