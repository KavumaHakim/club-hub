import React from 'react';

// Shared pieces of the flat "Split" layout (see the ch-* tokens in styles.css),
// so every screen opens and tabs the same way the Feed does.

/** Solid accent action — the one filled button per view. */
export const BTN_PRIMARY =
    'inline-flex items-center justify-center gap-2 bg-ch-accent px-5 py-2.5 text-[13px] font-extrabold text-ch-on-accent transition-colors duration-100 hover:bg-ch-accent-deep disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4';

/** Ruled secondary action. */
export const BTN_SECONDARY =
    'inline-flex items-center justify-center gap-2 border-2 border-ch-rule px-5 py-2 text-[13px] font-extrabold text-ch-text transition-colors duration-100 hover:bg-ch-surface disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4';

/** Small uppercase label used above sections and lists. */
export const EYEBROW = 'text-[10px] font-extrabold uppercase tracking-[0.16em] text-ch-accent';

/** Page opener: accent eyebrow, headline, lead and actions over a 2px rule. */
export const PageIntro: React.FC<{
    eyebrow: string;
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}> = ({ eyebrow, title, description, actions, className = '' }) => (
    <div className={`mb-8 flex flex-col gap-5 border-b-2 border-ch-rule pb-6 lg:flex-row lg:items-end lg:justify-between ${className}`}>
        <div className="min-w-0">
            <p className={`mb-2 ${EYEBROW}`}>{eyebrow}</p>
            <h2 className="text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-ch-text">{title}</h2>
            {description && <p className="mt-2 max-w-[62ch] text-[14.5px] leading-relaxed text-ch-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-none flex-wrap items-stretch gap-2">{actions}</div>}
    </div>
);

/** Left-aligned empty / error state, as in the Feed. */
export const EmptyState: React.FC<{
    eyebrow?: string;
    title: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}> = ({ eyebrow = 'Nothing here', title, description, action, className = '' }) => (
    <div className={`border-2 border-dashed border-ch-divider px-6 py-14 sm:px-10 ${className}`}>
        <p className={`mb-2 ${EYEBROW}`}>{eyebrow}</p>
        <h3 className="mb-2 text-[22px] font-extrabold tracking-[-0.02em] text-ch-text">{title}</h3>
        {description && <p className="max-w-[52ch] text-[14px] leading-relaxed text-ch-muted">{description}</p>}
        {action && <div className="mt-6">{action}</div>}
    </div>
);

/** A ruled row of headline numbers. Cells share 1px rules via the gap. */
export const StatStrip: React.FC<{
    stats: Array<{ label: string; value: React.ReactNode; tone?: string }>;
    className?: string;
}> = ({ stats, className = '' }) => (
    <div className={`grid grid-cols-2 gap-px border-2 border-ch-rule bg-ch-divider md:grid-cols-4 ${className}`}>
        {stats.map(stat => (
            <div key={stat.label} className="bg-ch-bg px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ch-muted">{stat.label}</p>
                <p className={`mt-1.5 text-[32px] font-extrabold leading-none tracking-[-0.03em] ${stat.tone || 'text-ch-text'}`}>{stat.value}</p>
            </div>
        ))}
    </div>
);

export interface RuledTab<T extends string> {
    id: T;
    label: React.ReactNode;
    count?: number;
}

/** Ruled segmented tabs; the active cell takes the accent field. */
export function RuledTabs<T extends string>({
    tabs,
    active,
    onChange,
    className = '',
}: {
    // T comes from `active` alone; a useState setter passed as onChange would
    // otherwise widen it to string.
    tabs: RuledTab<NoInfer<T>>[];
    active: T;
    onChange: (id: NoInfer<T>) => void;
    className?: string;
}) {
    return (
        <div role="tablist" className={`ch-scroll mb-6 flex w-fit max-w-full items-stretch overflow-x-auto border-2 border-ch-rule ${className}`}>
            {tabs.map((tab, index) => {
                const isActive = tab.id === active;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(tab.id)}
                        className={`flex flex-none items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors duration-100 ${
                            index > 0 ? 'border-l border-ch-divider' : ''
                        } ${isActive ? 'bg-ch-accent text-ch-on-accent' : 'text-ch-muted hover:bg-ch-surface hover:text-ch-text'}`}
                    >
                        {tab.label}
                        {tab.count !== undefined && <span className={isActive ? 'opacity-80' : 'text-ch-muted'}>{tab.count}</span>}
                    </button>
                );
            })}
        </div>
    );
}
