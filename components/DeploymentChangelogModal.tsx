import React from 'react';
import { DeploymentChangelogEntry } from '../deploymentChangelog';
import { XIcon } from './icons/XIcon';

interface DeploymentChangelogModalProps {
  isOpen: boolean;
  latestEntry: DeploymentChangelogEntry | null;
  entries: DeploymentChangelogEntry[];
  onClose: () => void;
}

const DeploymentChangelogModal: React.FC<DeploymentChangelogModalProps> = ({ isOpen, latestEntry, entries, onClose }) => {
  if (!isOpen || !latestEntry) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 transition-colors"
          aria-label="Close changelog"
        >
          <XIcon />
        </button>

        <div className="px-6 sm:px-8 pt-7 pb-5 border-b border-gray-100 dark:border-gray-700">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">
            Latest Deployment
          </p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {latestEntry.headline}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {latestEntry.summary}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 font-medium text-gray-700 dark:text-gray-200">
              Commit: {latestEntry.commit}
            </span>
            <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 font-medium text-gray-700 dark:text-gray-200">
              Deployed: {latestEntry.deployedAt}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 sm:px-8 py-6 space-y-4">
          {entries.map((entry, entryIndex) => (
            <section
              key={entry.id}
              className={`rounded-2xl border p-4 sm:p-5 ${entryIndex === 0
                ? 'border-sky-200 dark:border-sky-900/30 bg-sky-50/60 dark:bg-sky-900/10'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40'
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                    {entryIndex === 0 ? 'Newest' : 'Previous'} Update
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                    {entry.headline}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    {entry.summary}
                  </p>
                </div>
                <div className="flex flex-col gap-2 text-xs flex-shrink-0">
                  <span className="inline-flex items-center rounded-full bg-white dark:bg-gray-800 px-3 py-1 font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                    {entry.commit}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white dark:bg-gray-800 px-3 py-1 font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                    {entry.deployedAt}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {entry.items.map((item, index) => (
                  <div
                    key={`${entry.id}-${index}`}
                    className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-white text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                          {item.title}
                        </h4>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {item.details}
                        </p>
                        <div className="mt-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 px-4 py-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                            What To Expect
                          </p>
                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                            {item.expectation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="px-6 sm:px-8 py-5 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-semibold hover:opacity-90 transition-opacity"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeploymentChangelogModal;
