
import React, { useState } from 'react';
import { XIcon } from './icons/XIcon';
import { HomeIcon } from './icons/HomeIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { CodeIcon } from './icons/CodeIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { IdentificationIcon } from './icons/IdentificationIcon';
import { TrophyIcon } from './icons/TrophyIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { GamepadIcon } from './icons/GamepadIcon';

interface FeatureTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeatureTourModal: React.FC<FeatureTourModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: "Welcome to ICT Club Hub",
      description: "Here’s a detailed tour of every major feature so you can jump in with confidence.",
      icon: <span className="text-6xl animate-icon-bounce-in">🚀</span>
    },
    {
      title: "Feed & Announcements",
      description: "Catch the latest updates, polls, and discussions on the **Feed**.\n\n- Filter by category (announcements, polls, posts)\n- React and comment to join the conversation\n- Pinned posts highlight important club updates",
      icon: (
        <div className="p-6 bg-white/20 text-white animate-icon-bounce-in">
           <HomeIcon />
        </div>
      )
    },
    {
      title: "Activities & Attendance",
      description: "Track events, RSVP, and mark attendance.\n\n- RSVP to upcoming activities\n- View schedule details and locations\n- Patrons can run **quick attendance** and bulk mark members",
      icon: (
        <div className="p-6 bg-white/20 text-white animate-icon-bounce-in">
           <CalendarIcon />
        </div>
      )
    },
    {
      title: "Projects & Teams",
      description: "Organize tasks on the **Project Board**, build teams, and collaborate.\n\n- Kanban workflow for tasks\n- Assign owners and priorities\n- Team collaboration and shared projects",
      icon: (
        <div className="p-6 bg-white/20 text-white animate-icon-bounce-in">
           <ClipboardListIcon />
        </div>
      )
    },
    {
      title: "Playground & Web Projects",
      description: "Code in Python/JS or build **Web projects** with HTML, CSS, and JS together.\n\n- Run and debug instantly\n- Save multi‑file projects\n- Publish or submit challenges from the menu",
      icon: (
         <div className="p-6 bg-white/20 text-white animate-icon-bounce-in">
           <CodeIcon />
        </div>
      )
    },
    {
      title: "Games Lounge",
      description: "Take quick focus breaks in the **Games** tab.\n\n- Reaction timer, quick math, and number guessing\n- Local high scores to challenge yourself\n- Perfect for short brain resets between sessions",
      icon: (
        <div className="p-6 bg-white/20 text-white animate-icon-bounce-in">
           <GamepadIcon />
        </div>
      )
    },
    {
      title: "Resources Library",
      description: "Use the eLibrary to search, filter, and open curated docs, tools, videos, and files.\n\n- Filter by category and type\n- Open videos, docs, and tools quickly\n- Curated by patrons for quality",
      icon: (
        <div className="p-6 bg-white/20 text-white animate-icon-bounce-in">
           <BookOpenIcon />
        </div>
      )
    },
    {
      title: "Showcase & Leaderboard",
      description: "Publish code, view previews, and climb the **Community Leaderboard**.\n\n- Share project highlights\n- Get likes and feedback\n- Build your portfolio reputation",
      icon: (
        <div className="p-6 bg-white/20 text-white animate-icon-bounce-in">
           <GlobeIcon />
        </div>
      )
    },
    {
      title: "Challenges & Roadmaps",
      description: "Take on challenges, submit solutions and quizzes.\n\n- Earn badges from challenges\n- Get instant AI feedback\n- Roadmaps include milestones and quizzes",
      icon: (
        <div className="p-6 bg-white/20 text-white animate-icon-bounce-in">
           <TrophyIcon />
        </div>
      )
    },
    {
      title: "AI Tutor & Chat",
      description: "Get help from **Kevin**, the club‑aware AI Tutor, or chat with members anytime.\n\n- Ask coding questions\n- Kevin knows active challenges & resources\n- Real‑time member chat",
      icon: (
        <div className="p-6 bg-white/20 text-white animate-icon-bounce-in">
           <ChatBubbleIcon />
        </div>
      )
    },
    {
      title: "Member Tools & Admin",
      description: "Manage profiles, portfolios, and (for patrons) moderation, analytics, and feature flags.\n\n- Update your profile and bio\n- View member portfolios\n- Patron tools for governance",
      icon: (
        <div className="p-6 bg-white/20 text-white animate-icon-bounce-in">
           <IdentificationIcon />
        </div>
      )
    },
    {
      title: "Ready to Explore?",
      description: "You’re set. Start building, learning, and collaborating with your club.",
      icon: <span className="text-6xl animate-icon-bounce-in">✨</span>
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70">
      <div className="bg-ch-bg w-full max-w-md overflow-hidden flex flex-col min-h-[500px] animate-initial-fade-in-up relative border-2 border-ch-rule">
        
        {/* Header / Graphic Area */}
        <div className="h-48 bg-ch-accent text-ch-on-accent border-b-2 border-ch-rule flex items-center justify-center relative">
             <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 transition-colors z-10"
                aria-label="Close tour"
            >
                <XIcon />
            </button>
            <div key={currentStep} className="transform scale-125">
                {step.icon}
            </div>
            
            {/* Curved divider */}
            <div className="absolute bottom-0 left-0 right-0">
                <svg viewBox="0 0 1440 320" className="w-full h-12 text-white fill-current block" preserveAspectRatio="none">
                    <path fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,197.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                </svg>
            </div>
        </div>

        {/* Content Area */}
        <div key={`content-${currentStep}`} className="px-8 pb-8 pt-2 flex-1 flex flex-col text-center">
            <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-ch-text mb-3 animate-content-fade-in-up">{step.title}</h2>
            <p className="text-ch-muted leading-relaxed mb-6 flex-grow text-sm sm:text-base animate-content-fade-in-up" style={{ animationDelay: '0.05s' }}>
                {step.description.split('**').map((part, i) => 
                    i % 2 === 1 ? <strong key={i} className="text-ch-text font-semibold">{part}</strong> : part
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
                    className={`text-sm font-medium px-4 py-2 transition-all ${currentStep === 0 ? 'text-ch-rule cursor-not-allowed opacity-0' : 'text-ch-muted hover:bg-ch-surface opacity-100'}`}
                >
                    Back
                </button>
                <button
                    onClick={handleNext}
                    className="bg-ch-text text-ch-bg px-6 py-2.5 font-bold hover:opacity-90 transition-all transform flex items-center justify-center gap-1.5"
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

