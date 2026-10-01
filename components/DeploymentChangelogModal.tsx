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
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden border-2 border-ch-rule bg-ch-bg flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-ch-muted hover:text-ch-text hover:bg-ch-surface transition-colors"
          aria-label="Close changelog"
        >
          <XIcon />
        </button>

        <div className="px-6 sm:px-8 pt-7 pb-5 border-b border-ch-divider">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-ch-accent">
            Latest Deployment
          </p>
          <h2 className="mt-2 text-[22px] font-extrabold tracking-[-0.02em] text-ch-text">
            {latestEntry.headline}
          </h2>
          <p className="mt-2 text-sm text-ch-muted">
            {latestEntry.summary}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center bg-ch-surface px-3 py-1 font-medium text-ch-text">
              Commit: {latestEntry.commit}
            </span>
            <span className="inline-flex items-center bg-ch-surface px-3 py-1 font-medium text-ch-text">
              Deployed: {latestEntry.deployedAt}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 sm:px-8 py-6 space-y-4">
          {entries.map((entry, entryIndex) => (
            <section
              key={entry.id}
              className={`border p-4 sm:p-5 ${entryIndex === 0
                ? 'border-ch-divider bg-ch-accent-soft'
                : 'border-ch-divider bg-ch-surface'
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ch-muted">
                    {entryIndex === 0 ? 'Newest' : 'Previous'} Update
                  </p>
                  <h3 className="mt-1 text-[17px] font-extrabold tracking-[-0.01em] text-ch-text">
                    {entry.headline}
                  </h3>
                  <p className="mt-1 text-sm text-ch-muted">
                    {entry.summary}
                  </p>
                </div>
                <div className="flex flex-col gap-2 text-xs flex-shrink-0">
                  <span className="inline-flex items-center bg-ch-bg px-3 py-1 font-medium text-ch-text border border-ch-divider">
                    {entry.commit}
                  </span>
                  <span className="inline-flex items-center bg-ch-bg px-3 py-1 font-medium text-ch-text border border-ch-divider">
                    {entry.deployedAt}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {entry.items.map((item, index) => (
                  <div
                    key={`${entry.id}-${index}`}
                    className="bg-ch-bg border border-ch-divider px-4 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 items-center justify-center bg-ch-accent text-ch-on-accent text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base font-semibold text-ch-text">
                          {item.title}
                        </h4>
                        <p className="mt-1 text-sm text-ch-muted">
                          {item.details}
                        </p>
                        <div className="mt-3 bg-ch-surface border border-ch-divider px-4 py-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ch-muted">
                            What To Expect
                          </p>
                          <p className="mt-1 text-sm text-ch-text">
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

        <div className="px-6 sm:px-8 py-5 border-t border-ch-divider flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-ch-text text-ch-bg font-semibold hover:opacity-90 transition-opacity"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeploymentChangelogModal;
