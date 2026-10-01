
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../DataContext';
import { VotingPosition, VotingContestant, VotingVote, User } from '../types';
import { VoteIcon } from './icons/VoteIcon';
import { UserIcon } from './icons/UserIcon';
import { PlusCircleIcon as PlusIcon } from './icons/PlusCircleIcon';
import { HourglassIcon as ClockIcon } from './icons/HourglassIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { ChartBarIcon as BarChart3Icon } from './icons/ChartBarIcon';
import { ExclamationCircleIcon as AlertIcon } from './icons/ExclamationCircleIcon';
import { CheckCircleIcon as CheckIcon } from './icons/CheckCircleIcon';
import { XIcon } from './icons/XIcon';
import { InformationCircleIcon as InfoIcon } from './icons/InformationCircleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PageIntro, StatStrip } from './SplitKit';

const VotingPage: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const {
        votingPositions,
        fetchVotingPositions,
        createVotingPosition,
        updateVotingPosition,
        fetchVotingContestants,
        contestPosition,
        castVote,
        fetchVotingVotes,
        updateContestantStatus,
        deleteVotingPosition,
        isLoadingVoting,
        votingError,
        showToast,
        showAlert,
        allUsers,
        votingContestants
    } = useData();

    const [activeTab, setActiveTab] = useState<'active' | 'past' | 'create' | 'vetting' | 'analytics'>('active');
    const [selectedPosition, setSelectedPosition] = useState<VotingPosition | null>(null);
    const [showContestModal, setShowContestModal] = useState(false);
    const [showVoteModal, setShowVoteModal] = useState(false);
    const [showResultsModal, setShowResultsModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusModalConfig, setStatusModalConfig] = useState<{ title: string, message: string, type: 'upcoming' | 'closed', date: string } | null>(null);

    const [manifesto, setManifesto] = useState('');
    const [criteriaAgreed, setCriteriaAgreed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [contestants, setContestants] = useState<VotingContestant[]>([]);
    const [votes, setVotes] = useState<VotingVote[]>([]);
    const [analyticsVotes, setAnalyticsVotes] = useState<VotingVote[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'upcoming' | 'closed'>('all');

    // Form state for creating position
    const [newPos, setNewPos] = useState({
        title: '',
        description: '',
        criteria: '',
        startDate: '',
        dueDate: ''
    });

    useEffect(() => {
        fetchVotingPositions();
    }, [fetchVotingPositions]);

    useEffect(() => {
        const loadAnalyticsVotes = async () => {
            if (activeTab !== 'analytics' || votingPositions.length === 0) return;
            try {
                const voteCollections = await Promise.all(votingPositions.map(pos => fetchVotingVotes(pos.id)));
                setAnalyticsVotes(voteCollections.flat());
            } catch (error) {
                console.error('Failed to load analytics votes', error);
            }
        };

        loadAnalyticsVotes();

        // Auto-refresh every 30 seconds when on analytics tab
        if (activeTab === 'analytics') {
            const interval = setInterval(loadAnalyticsVotes, 30000);
            return () => clearInterval(interval);
        }
    }, [activeTab, votingPositions, fetchVotingVotes]);

    const activeElections = useMemo(() =>
        votingPositions.filter(p => p.status === 'OPEN' && new Date(p.dueDate) > new Date()),
        [votingPositions]);

    const userContestantFor = useMemo(() => {
        return new Set(votingContestants.filter(c => c.userId === currentUser.uid).map(c => c.positionId));
    }, [votingContestants, currentUser.uid]);

    const getContestantStatus = (posId: string) => {
        return votingContestants.find(c => c.userId === currentUser.uid && c.positionId === posId)?.status;
    };

    const isUpcoming = (pos: VotingPosition) => new Date(pos.startDate) > new Date();
    const isVotingOpen = (pos: VotingPosition) => {
        const now = new Date();
        return now >= new Date(pos.startDate) && now <= new Date(pos.dueDate);
    };

    const formatDateTime = (date: string) => new Date(date).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short'
    });

    const pastElections = useMemo(() =>
        votingPositions.filter(p => p.status === 'CLOSED' || new Date(p.dueDate) <= new Date()),
        [votingPositions]);

    const electionStats = useMemo(() => {
        const now = new Date();
        const open = votingPositions.filter(p => now >= new Date(p.startDate) && now <= new Date(p.dueDate)).length;
        const upcoming = votingPositions.filter(p => new Date(p.startDate) > now).length;
        const closed = votingPositions.filter(p => now > new Date(p.dueDate) || p.status === 'CLOSED').length;
        return { open, upcoming, closed };
    }, [votingPositions]);

    const filteredActiveElections = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return activeElections
            .filter(pos => !term || pos.title.toLowerCase().includes(term) || (pos.description || '').toLowerCase().includes(term))
            .filter((pos) => {
                if (statusFilter === 'all') return true;
                if (statusFilter === 'open') return isVotingOpen(pos);
                if (statusFilter === 'upcoming') return isUpcoming(pos);
                return !isVotingOpen(pos) && !isUpcoming(pos);
            })
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [activeElections, searchTerm, statusFilter]);

    const handleCreatePosition = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPos.title || !newPos.dueDate) {
            showToast('Title and Due Date are required', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            await createVotingPosition({
                ...newPos,
                createdBy: currentUser.uid
            });
            setNewPos({ title: '', description: '', criteria: '', startDate: '', dueDate: '' });
            setActiveTab('active');
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleContest = async () => {
        if (!selectedPosition) return;
        if (!manifesto.trim()) {
            showToast('Please provide a manifesto', 'warning');
            return;
        }
        if (selectedPosition.criteria && !criteriaAgreed) {
            showToast('You must agree to the criteria', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            await contestPosition(selectedPosition.id, manifesto);
            setShowContestModal(false);
            setManifesto('');
            setCriteriaAgreed(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenVoteModal = async (pos: VotingPosition) => {
        setSelectedPosition(pos);
        const [fetchedContestants, fetchedVotes] = await Promise.all([
            fetchVotingContestants(pos.id),
            fetchVotingVotes(pos.id)
        ]);
        setContestants(fetchedContestants);
        setVotes(fetchedVotes);
        setShowVoteModal(true);
    };

    const handleCastVote = async (contestantId: string) => {
        if (!selectedPosition) return;
        if (!isVotingOpen(selectedPosition)) {
            showToast(`Voting opens on ${formatDateTime(selectedPosition.startDate)}.`, 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            await castVote(selectedPosition.id, contestantId);
            setShowVoteModal(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenResults = async (pos: VotingPosition) => {
        setSelectedPosition(pos);
        const [fetchedContestants, fetchedVotes] = await Promise.all([
            fetchVotingContestants(pos.id),
            fetchVotingVotes(pos.id)
        ]);
        setContestants(fetchedContestants);
        setVotes(fetchedVotes);
        setShowResultsModal(true);
    };

    const handleActionClick = (pos: VotingPosition, action: 'contest' | 'vote') => {
        const now = new Date();
        const hasClosed = now > new Date(pos.dueDate);

        setSelectedPosition(pos);

        if (action === 'contest') {
            if (hasClosed) {
                setStatusModalConfig({
                    title: 'Contest Period Closed',
                    message: 'Contest entries for this position are now closed. You can view the final results in the Results tab.',
                    type: 'closed',
                    date: pos.dueDate
                });
                setShowStatusModal(true);
                return;
            }

            setShowContestModal(true);
            return;
        }

        if (isVotingOpen(pos)) {
            handleOpenVoteModal(pos);
            return;
        }

        if (isUpcoming(pos)) {
            setStatusModalConfig({
                title: 'Voting Not Yet Open',
                message: 'Voting for this position has not started yet. You can still review candidates and manifestos before the opening time.',
                type: 'upcoming',
                date: pos.startDate
            });
        } else {
            setStatusModalConfig({
                title: 'Voting Period Closed',
                message: 'The voting period for this position has ended. You can view the final results in the Results tab.',
                type: 'closed',
                date: pos.dueDate
            });
        }
        setShowStatusModal(true);
    };

    const getVoteCount = (contestantId: string) => {
        return votes.filter(v => v.contestantId === contestantId).length;
    };

    const hasUserVoted = useMemo(() => votes.some(v => v.voterId === currentUser.uid), [votes, currentUser.uid]);

    const approvedContestants = useMemo(() => {
        // If we are looking at a specific position's results/modal, use the local 'contestants' state
        if (showResultsModal || showVoteModal) {
            return contestants.filter(c => c.status === 'APPROVED');
        }
        // Otherwise (for analytics), use the global 'votingContestants'
        return votingContestants.filter(c => c.status === 'APPROVED');
    }, [contestants, votingContestants, showResultsModal, showVoteModal]);

    const pendingContestants = useMemo(() =>
        votingContestants.filter(c => c.status === 'PENDING'),
        [votingContestants]);

    const globalContestantsCount = useMemo(() => votingContestants.length, [votingContestants]);

    const sortedResults = useMemo(() => {
        return [...approvedContestants].sort((a, b) => getVoteCount(b.id) - getVoteCount(a.id));
    }, [approvedContestants, votes]);

    const getTimeRemaining = (dueDate: string) => {
        const total = Date.parse(dueDate) - Date.parse(new Date().toString());
        if (total <= 0) return 'Ended';
        const days = Math.floor(total / (1000 * 60 * 60 * 24));
        const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
        if (days > 0) return `${days}d ${hours}h left`;
        return `${hours}h remaining`;
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header section */}
            <PageIntro
                eyebrow="Club leadership"
                title="Voting Hub"
                description="Shape the future of the club. Contest for positions, review candidates, and cast your vote."
                className="!mb-0"
                actions={
                <div className="flex items-stretch border-2 border-ch-rule [&>button+button]:border-l [&>button+button]:border-ch-divider">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'active' ? 'bg-ch-accent text-ch-on-accent' : 'text-ch-muted hover:text-ch-text'}`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={`px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'past' ? 'bg-ch-accent text-ch-on-accent' : 'text-ch-muted hover:text-ch-text'}`}
                    >
                        Past
                    </button>
                    {currentUser.role === 'PATRON' && (
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'create' ? 'bg-ch-accent text-ch-on-accent' : 'text-ch-muted hover:text-ch-text'}`}
                        >
                            Manage
                        </button>
                    )}
                    {currentUser.role === 'PATRON' && (
                        <button
                            onClick={() => setActiveTab('vetting')}
                            className={`px-4 py-2 text-sm font-semibold transition-all relative ${activeTab === 'vetting' ? 'bg-ch-accent text-ch-on-accent' : 'text-ch-muted hover:text-ch-text'}`}
                        >
                            Vetting
                            {pendingContestants.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-ch-accent text-ch-on-accent text-[10px] flex items-center justify-center animate-pulse">
                                    {pendingContestants.length}
                                </span>
                            )}
                        </button>
                    )}
                    {currentUser.role === 'PATRON' && (
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'analytics' ? 'bg-ch-accent text-ch-on-accent' : 'text-ch-muted hover:text-ch-text'}`}
                        >
                            Analytics
                        </button>
                    )}
                </div>
                }
            />

            <StatStrip
                stats={[
                    { label: 'Open now', value: electionStats.open, tone: 'text-green-600 dark:text-green-400' },
                    { label: 'Upcoming', value: electionStats.upcoming, tone: 'text-amber-600 dark:text-amber-400' },
                    { label: 'Closed', value: electionStats.closed },
                    { label: 'Pending vetting', value: pendingContestants.length, tone: 'text-ch-accent' },
                ]}
            />

            {votingError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center gap-3">
                    <AlertIcon className="w-5 h-5" />
                    <p>{votingError}</p>
                </div>
            )}

            {isLoadingVoting ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-ch-surface-2 animate-pulse" />
                    ))}
                </div>
            ) : activeTab === 'active' ? (
                <div className="space-y-5">
                    <div className="flex flex-col lg:flex-row gap-3">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search elections by title or description..."
                            className="flex-1 px-4 py-3 border border-ch-divider bg-ch-bg text-sm text-ch-text focus:outline-none focus:ring-2 focus:ring-ch-accent"
                        />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                            className="px-4 py-3 border border-ch-divider bg-ch-bg text-sm text-ch-text focus:outline-none focus:ring-2 focus:ring-ch-accent"
                        >
                            <option value="all">All statuses</option>
                            <option value="open">Open now</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredActiveElections.length === 0 ? (
                            <div className="col-span-full py-20 bg-ch-bg border-2 border-dashed border-ch-divider flex flex-col items-center justify-center text-center px-4">
                                <VoteIcon className="w-12 h-12 text-ch-rule mb-4" />
                                <h3 className="text-[17px] font-extrabold tracking-[-0.01em] text-ch-text">No Matching Elections</h3>
                                <p className="text-ch-muted mt-1">Try clearing your search or changing the status filter.</p>
                            </div>
                        ) : filteredActiveElections.map(pos => (
                            <div key={pos.id} className="group bg-ch-bg border border-ch-divider p-6 flex flex-col transition-all duration-300">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest ${isVotingOpen(pos) ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'}`}>
                                        {isVotingOpen(pos) ? 'Open' : isUpcoming(pos) ? 'Upcoming' : 'Closed'}
                                    </span>
                                    <span className="text-xs text-ch-muted flex items-center gap-1 font-medium">
                                        <ClockIcon className="w-3 h-3" />
                                        {isUpcoming(pos) ? `Starts in ${getTimeRemaining(pos.startDate)}` : getTimeRemaining(pos.dueDate)}
                                    </span>
                                    {currentUser.role === 'PATRON' && (
                                        <button
                                            onClick={() => {
                                                showAlert({
                                                    title: 'Delete Position',
                                                    message: 'Are you sure you want to delete this position? All candidates and votes will be permanently removed.',
                                                    type: 'confirm',
                                                    onConfirm: () => deleteVotingPosition(pos.id)
                                                });
                                            }}
                                            className="p-1.5 text-ch-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                            title="Delete Position"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text mb-2 group-hover:text-ch-accent transition-colors">
                                    {pos.title}
                                </h3>
                                <p className="text-ch-muted text-sm line-clamp-3 mb-4 flex-grow">
                                    {pos.description || 'No description provided.'}
                                </p>

                                {pos.criteria && (
                                    <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                                        <p className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1 mb-1">
                                            <InfoIcon className="w-3.5 h-3.5" />
                                            Contesting Criteria
                                        </p>
                                        <p className="text-xs text-blue-600/80 dark:text-blue-400/80 italic">
                                            {pos.criteria}
                                        </p>
                                    </div>
                                )}

                                <div className={`grid gap-3 mt-auto ${currentUser.role === 'PATRON' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    {currentUser.role === 'PATRON' && (
                                        <button
                                            onClick={() => handleActionClick(pos, 'contest')}
                                            disabled={userContestantFor.has(pos.id)}
                                            className={`flex items-center justify-center gap-2 py-3 px-4 font-bold transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed ${userContestantFor.has(pos.id) ? 'bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800' : 'bg-ch-surface text-ch-text hover:bg-ch-surface-2'}`}
                                        >
                                            <UserIcon className="w-4 h-4" />
                                            {userContestantFor.has(pos.id) ? (
                                                getContestantStatus(pos.id) === 'APPROVED' ? 'Approved Candidate' :
                                                    getContestantStatus(pos.id) === 'REJECTED' ? 'Application Rejected' :
                                                        'Applied (Pending)'
                                            ) : 'Add Candidate'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleActionClick(pos, 'vote')}
                                        className={`flex items-center justify-center gap-2 py-3 px-4 font-bold transition-all text-sm ${isVotingOpen(pos)
                                            ? 'bg-ch-accent text-ch-on-accent hover:bg-ch-accent-deep'
                                            : 'bg-ch-surface text-ch-muted cursor-not-allowed'}`}
                                    >
                                        <VoteIcon className="w-4 h-4" />
                                        {isVotingOpen(pos) ? 'Vote Now' : isUpcoming(pos) ? 'Starts Soon' : 'Closed'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : activeTab === 'past' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pastElections.length === 0 ? (
                        <div className="col-span-full py-20 bg-ch-bg border-2 border-dashed border-ch-divider flex flex-col items-center justify-center text-center px-4">
                            <BarChart3Icon className="w-12 h-12 text-ch-rule mb-4" />
                            <h3 className="text-[17px] font-extrabold tracking-[-0.01em] text-ch-text">No Past Elections</h3>
                        </div>
                    ) : pastElections.map(pos => (
                        <div key={pos.id} className="bg-ch-bg border border-ch-divider p-6 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <span className="px-3 py-1 bg-ch-surface text-ch-muted text-xs font-bold uppercase tracking-wider">
                                    Closed
                                </span>
                                <span className="text-xs text-ch-muted font-medium">
                                    Ended {new Date(pos.dueDate).toLocaleDateString()}
                                </span>
                            </div>
                            <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text mb-2">
                                {pos.title}
                            </h3>
                            <p className="text-ch-muted text-sm line-clamp-2 mb-6 flex-grow">
                                {pos.description}
                            </p>

                            <button
                                onClick={() => handleOpenResults(pos)}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-ch-accent-soft text-ch-violet font-bold hover:bg-ch-accent-soft transition-all text-sm"
                            >
                                <BarChart3Icon className="w-4 h-4" />
                                View Results
                            </button>
                            {currentUser.role === 'PATRON' && (
                                <button
                                    onClick={() => {
                                        showAlert({
                                            title: 'Delete Record',
                                            message: 'Are you sure you want to delete this past position? This cannot be undone.',
                                            type: 'confirm',
                                            onConfirm: () => deleteVotingPosition(pos.id)
                                        });
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all text-sm mt-3"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                    Delete Record
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            ) : activeTab === 'vetting' ? (
                <div className="space-y-6">
                    <div className="bg-ch-bg p-8 border border-ch-divider">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-[22px] font-extrabold tracking-[-0.02em] text-ch-text">Contestant Vetting</h3>
                                <p className="text-ch-muted text-sm mt-1">Review manifestos and approve candidates for the ballot.</p>
                            </div>
                            <div className="px-4 py-2 bg-ch-accent-soft text-ch-accent text-xs font-bold uppercase tracking-widest">
                                {pendingContestants.length} Pending
                            </div>
                        </div>

                        {pendingContestants.length === 0 ? (
                            <div className="text-center py-20 bg-ch-surface border-2 border-dashed border-ch-divider">
                                <CheckIcon className="w-16 h-16 text-green-200 dark:text-green-900/40 mx-auto mb-4" />
                                <h4 className="text-[17px] font-extrabold tracking-[-0.01em] text-ch-text">All Caught Up!</h4>
                                <p className="text-ch-muted mt-1">No candidates are currently waiting for approval.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {pendingContestants.map(c => {
                                    const pos = votingPositions.find(p => p.id === c.positionId);
                                    return (
                                        <div key={c.id} className="group bg-ch-bg border border-ch-divider p-6 transition-all">
                                            <div className="flex items-center gap-4 mb-4">
                                                <img
                                                    src={c.userAvatarUrl || `https://i.pravatar.cc/100?u=${c.userId}`}
                                                    className="w-12 h-12 object-cover border-2 border-white"
                                                />
                                                <div>
                                                    <h4 className="font-bold text-ch-text">{c.userName}</h4>
                                                    <span className="text-[10px] font-black text-ch-accent uppercase tracking-tighter bg-ch-accent-soft px-2 py-0.5">
                                                        For {pos?.title || 'Unknown Position'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-ch-surface mb-6 text-sm text-ch-text italic leading-relaxed">
                                                "{c.manifesto}"
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => updateContestantStatus(c.id, 'APPROVED')}
                                                    className="flex-1 py-3 bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-all"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => updateContestantStatus(c.id, 'REJECTED')}
                                                    className="flex-1 py-3 bg-ch-surface text-ch-muted text-sm font-bold hover:bg-ch-surface-2 transition-all"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            ) : activeTab === 'analytics' ? (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-ch-bg p-6 border border-ch-divider relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-ch-accent-soft transition-transform duration-700" />
                            <div className="flex items-center gap-3 text-ch-accent mb-4">
                                <BarChart3Icon className="w-6 h-6" />
                                <h4 className="font-bold text-xs uppercase tracking-widest">Global Participation</h4>
                            </div>
                            <div className="text-4xl font-black text-ch-text">
                                {allUsers.length > 0 ? ((analyticsVotes.length / allUsers.length) * 100).toFixed(1) : 0}%
                            </div>
                            <p className="text-xs text-ch-muted mt-2 font-medium">{analyticsVotes.length} votes cast by {allUsers.length} members</p>
                        </div>

                        <div className="bg-ch-bg p-6 border border-ch-divider relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 transition-transform duration-700" />
                            <div className="flex items-center gap-3 text-blue-600 mb-4">
                                <UserIcon className="w-6 h-6" />
                                <h4 className="font-bold text-xs uppercase tracking-widest">Election Density</h4>
                            </div>
                            <div className="text-4xl font-black text-ch-text">
                                {votingPositions.length > 0 ? (globalContestantsCount / votingPositions.length).toFixed(1) : 0}
                            </div>
                            <p className="text-xs text-ch-muted mt-2 font-medium">Average candidates per election</p>
                        </div>

                        <div className="bg-ch-bg p-6 border border-ch-divider relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/5 transition-transform duration-700" />
                            <div className="flex items-center gap-3 text-green-600 mb-4">
                                <CheckIcon className="w-6 h-6" />
                                <h4 className="font-bold text-xs uppercase tracking-widest">Vetting Efficiency</h4>
                            </div>
                            <div className="text-4xl font-black text-ch-text">
                                {globalContestantsCount > 0 ? ((approvedContestants.length / globalContestantsCount) * 100).toFixed(0) : 0}%
                            </div>
                            <p className="text-xs text-ch-muted mt-2 font-medium">{approvedContestants.length} of {globalContestantsCount} apps approved</p>
                        </div>
                    </div>

                    <div className="bg-ch-bg p-8 border border-ch-divider">
                        <div className="flex items-center justify-between mb-8">
                            <h4 className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text">Live Vote Breakdown</h4>
                            <button
                                onClick={async () => {
                                    try {
                                        const voteCollections = await Promise.all(votingPositions.map(pos => fetchVotingVotes(pos.id)));
                                        setAnalyticsVotes(voteCollections.flat());
                                    } catch (e) {
                                        console.error('Refresh failed', e);
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-ch-accent-soft text-ch-accent text-sm font-bold hover:bg-ch-accent-soft transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                Refresh
                            </button>
                        </div>

                        {votingPositions.length === 0 ? (
                            <div className="text-center py-16 text-ch-muted">No elections to display.</div>
                        ) : (
                            <div className="space-y-8">
                                {votingPositions.map(pos => {
                                    const posContestants = votingContestants
                                        .filter(c => c.positionId === pos.id && c.status === 'APPROVED');
                                    const posVotes = analyticsVotes.filter(v => v.positionId === pos.id);
                                    const totalPosVotes = posVotes.length;
                                    const ranked = [...posContestants].sort((a, b) =>
                                        posVotes.filter(v => v.contestantId === b.id).length -
                                        posVotes.filter(v => v.contestantId === a.id).length
                                    );
                                    const medals = ['🥇', '🥈', '🥉'];
                                    const statusLabel = isVotingOpen(pos) ? 'LIVE' : isUpcoming(pos) ? 'Upcoming' : 'Closed';

                                    return (
                                        <div key={pos.id} className="border border-ch-divider overflow-hidden">
                                            {/* Position Header */}
                                            <div className="flex items-center justify-between px-6 py-4 bg-ch-surface">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${isVotingOpen(pos) ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 animate-pulse' :
                                                        isUpcoming(pos) ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                                                            'bg-ch-surface-2 text-ch-muted'
                                                        }`}>{statusLabel}</span>
                                                    <h5 className="font-bold text-ch-text">{pos.title}</h5>
                                                </div>
                                                <span className="text-sm font-black text-ch-muted">
                                                    {totalPosVotes} vote{totalPosVotes !== 1 ? 's' : ''}
                                                </span>
                                            </div>

                                            {/* Candidate Leaderboard */}
                                            <div className="divide-y divide-gray-50">
                                                {ranked.length === 0 ? (
                                                    <div className="px-6 py-5 text-sm text-ch-muted italic">No approved candidates yet.</div>
                                                ) : ranked.map((contestant, idx) => {
                                                    const cVotes = posVotes.filter(v => v.contestantId === contestant.id).length;
                                                    const pct = totalPosVotes > 0 ? (cVotes / totalPosVotes) * 100 : 0;
                                                    const isLeading = idx === 0 && cVotes > 0;

                                                    return (
                                                        <div key={contestant.id} className={`px-6 py-4 flex items-center gap-4 ${isLeading ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}>
                                                            {/* Rank / Medal */}
                                                            <div className="w-8 text-center text-lg flex-shrink-0">
                                                                {idx < 3 && cVotes > 0 ? medals[idx] : <span className="text-sm font-bold text-ch-muted">#{idx + 1}</span>}
                                                            </div>

                                                            {/* Avatar */}
                                                            <img
                                                                src={contestant.userAvatarUrl || `https://i.pravatar.cc/60?u=${contestant.userId}`}
                                                                alt={contestant.userName}
                                                                className="w-9 h-9 object-cover border-2 border-white flex-shrink-0"
                                                            />

                                                            {/* Name + Bar */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between mb-1.5">
                                                                    <span className="text-sm font-bold text-ch-text truncate">{contestant.userName}</span>
                                                                    <span className="text-sm font-black text-ch-text ml-3 flex-shrink-0">
                                                                        {cVotes} <span className="text-[11px] font-medium text-ch-muted">({pct.toFixed(0)}%)</span>
                                                                    </span>
                                                                </div>
                                                                <div className="h-2.5 bg-ch-surface overflow-hidden">
                                                                    <div
                                                                        className={`h-full transition-all duration-700 ease-out ${isLeading
                                                                            ? 'bg-ch-accent'
                                                                            : 'bg-ch-accent'
                                                                            }`}
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="max-w-2xl mx-auto bg-ch-bg p-8 border border-ch-divider">
                    <h3 className="text-[22px] font-extrabold tracking-[-0.02em] text-ch-text mb-6">Create New Position</h3>
                    <form onSubmit={handleCreatePosition} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-ch-text">Position Title</label>
                            <input
                                type="text"
                                required
                                className="w-full p-4 bg-ch-surface border border-ch-divider focus:ring-2 focus:ring-ch-accent outline-none transition-all"
                                placeholder="e.g. Club President"
                                value={newPos.title}
                                onChange={e => setNewPos({ ...newPos, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-ch-text">Description</label>
                            <textarea
                                className="w-full p-4 bg-ch-surface border border-ch-divider focus:ring-2 focus:ring-ch-accent outline-none transition-all min-h-[120px]"
                                placeholder="Describe the responsibilities..."
                                value={newPos.description}
                                onChange={e => setNewPos({ ...newPos, description: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-ch-text">Contesting Criteria</label>
                            <textarea
                                className="w-full p-4 bg-ch-surface border border-ch-divider focus:ring-2 focus:ring-ch-accent outline-none transition-all min-h-[80px]"
                                placeholder="Who is eligible? (e.g. Must be a member for 6 months)"
                                value={newPos.criteria}
                                onChange={e => setNewPos({ ...newPos, criteria: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-ch-text">Voting Starts</label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="w-full p-4 bg-ch-surface border border-ch-divider focus:ring-2 focus:ring-ch-accent outline-none transition-all"
                                    value={newPos.startDate}
                                    onChange={e => setNewPos({ ...newPos, startDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-ch-text">Voting Ends (Deadline)</label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="w-full p-4 bg-ch-surface border border-ch-divider focus:ring-2 focus:ring-ch-accent outline-none transition-all"
                                    value={newPos.dueDate}
                                    onChange={e => setNewPos({ ...newPos, dueDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <button
                            disabled={isSubmitting}
                            className="w-full py-4 text-ch-on-accent font-bold hover:opacity-90 transition-all disabled:opacity-50 bg-ch-accent"
                        >
                            {isSubmitting ? 'Posting...' : 'Post Position'}
                        </button>
                    </form>
                </div>
            )}

            {/* Contest Modal */}
            {showContestModal && selectedPosition && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-300">
                    <div className="bg-ch-bg w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-ch-divider flex justify-between items-center">
                            <div>
                                <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text">Contest for {selectedPosition.title}</h3>
                                <p className="text-sm text-ch-muted mt-1">Submit your manifesto to the club</p>
                            </div>
                            <button
                                onClick={() => setShowContestModal(false)}
                                className="p-2 hover:bg-ch-surface transition-colors"
                            >
                                <XIcon className="w-6 h-6 text-ch-muted" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {selectedPosition.criteria && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                    <h4 className="text-sm font-extrabold text-amber-800 dark:text-amber-400 mb-1 flex items-center gap-2">
                                        <AlertIcon className="w-4 h-4" />
                                        Confirm Eligibility
                                    </h4>
                                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-3 italic">
                                        {selectedPosition.criteria}
                                    </p>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 border-amber-300 text-amber-600 focus:ring-amber-500 transition-all"
                                            checked={criteriaAgreed}
                                            onChange={e => setCriteriaAgreed(e.target.checked)}
                                        />
                                        <span className="text-sm font-medium text-amber-800/80 dark:text-amber-400/80 group-hover:text-amber-900">
                                            I confirm that I meet the criteria for this position.
                                        </span>
                                    </label>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-ch-text">Your Manifesto</label>
                                <textarea
                                    className="w-full p-4 bg-ch-surface border border-ch-divider focus:ring-2 focus:ring-ch-accent outline-none transition-all min-h-[160px] text-sm"
                                    placeholder="Explain why you are the best fit for this role..."
                                    value={manifesto}
                                    onChange={e => setManifesto(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowContestModal(false)}
                                    className="flex-1 py-4 text-ch-muted font-bold hover:text-ch-text transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isSubmitting || (selectedPosition.criteria && !criteriaAgreed)}
                                    onClick={handleContest}
                                    className="flex-[2] py-4 bg-ch-accent text-ch-on-accent font-bold hover:bg-ch-accent-deep transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Entry'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Vote Modal */}
            {showVoteModal && selectedPosition && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-300">
                    <div className="bg-ch-bg w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-ch-divider flex justify-between items-center bg-ch-surface">
                            <div>
                                <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text">Vote for {selectedPosition.title}</h3>
                                <p className="text-sm text-ch-muted mt-1">{contestants.length} Contestants</p>
                            </div>
                            <button
                                onClick={() => setShowVoteModal(false)}
                                className="p-2 hover:bg-ch-surface transition-colors"
                            >
                                <XIcon className="w-6 h-6 text-ch-muted" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {!isVotingOpen(selectedPosition) && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                    <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Voting opens on {formatDateTime(selectedPosition.startDate)}</p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">You can review every candidate manifesto now, and cast your vote once voting officially opens.</p>
                                </div>
                            )}

                            {contestants.length === 0 ? (
                                <div className="text-center py-10">
                                    <UserIcon className="w-12 h-12 text-ch-rule mx-auto mb-4" />
                                    <p className="text-ch-muted">No approved candidates available yet.</p>
                                </div>
                            ) : approvedContestants.map(contestant => (
                                <div key={contestant.id} className="p-6 bg-ch-bg border border-ch-divider transition-all">
                                    <div className="flex items-center gap-4 mb-4">
                                        <img
                                            src={contestant.userAvatarUrl || `https://i.pravatar.cc/100?u=${contestant.userId}`}
                                            alt={contestant.userName}
                                            className="w-14 h-14 object-cover border-2 border-white"
                                        />
                                        <div>
                                            <h4 className="font-extrabold text-ch-text text-lg">{contestant.userName}</h4>
                                            <p className="text-xs text-ch-accent font-bold uppercase tracking-widest">Candidate for {selectedPosition.title}</p>
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <p className="text-[11px] font-black text-ch-muted uppercase tracking-widest mb-2">Manifesto</p>
                                        <div className="p-4 bg-ch-surface text-sm text-ch-text italic leading-relaxed">
                                            {contestant.manifesto?.trim() ? `"${contestant.manifesto}"` : 'No manifesto provided by this candidate yet.'}
                                        </div>
                                    </div>
                                    <button
                                        disabled={isSubmitting || hasUserVoted || !isVotingOpen(selectedPosition)}
                                        onClick={() => handleCastVote(contestant.id)}
                                        className="w-full py-4 bg-ch-bg border-2 border-ch-divider text-ch-accent font-bold hover:bg-ch-accent-deep hover:text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {hasUserVoted ? 'Vote Already Cast' : !isVotingOpen(selectedPosition) ? `Vote opens ${new Date(selectedPosition.startDate).toLocaleDateString()}` : `Vote for ${contestant.userName}`}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Results Modal */}
            {showResultsModal && selectedPosition && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-300">
                    <div className="bg-ch-bg w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-ch-divider flex justify-between items-center bg-ch-surface">
                            <div>
                                <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-ch-text">Results: {selectedPosition.title}</h3>
                                <p className="text-sm text-ch-muted mt-1">{votes.length} Votes Cast Total</p>
                            </div>
                            <button
                                onClick={() => setShowResultsModal(false)}
                                className="p-2 hover:bg-ch-surface transition-colors"
                            >
                                <XIcon className="w-6 h-6 text-ch-muted" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {sortedResults.length === 0 ? (
                                <div className="text-center py-10 font-medium text-ch-muted">
                                    No data available for this election.
                                </div>
                            ) : sortedResults.map((contestant, index) => {
                                const count = getVoteCount(contestant.id);
                                const percent = votes.length > 0 ? (count / votes.length) * 100 : 0;

                                return (
                                    <div key={contestant.id} className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {index === 0 && <span className="p-1 px-2 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 text-[10px] font-black uppercase">Winner</span>}
                                                <h4 className="font-bold text-ch-text">{contestant.userName}</h4>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[17px] font-extrabold tracking-[-0.01em] text-ch-text">{count}</span>
                                                <span className="text-xs text-ch-muted ml-1">votes ({percent.toFixed(0)}%)</span>
                                            </div>
                                        </div>
                                        <div className="h-4 w-full bg-ch-surface overflow-hidden p-[2px]">
                                            <div
                                                className={`h-full transition-all duration-1000 ${index === 0 ? 'bg-ch-accent' : 'bg-ch-surface-2'}`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="mt-8 p-6 bg-ch-accent-soft border border-ch-divider">
                                <div className="flex items-center gap-3 text-ch-accent">
                                    <CheckIcon className="w-6 h-6" />
                                    <div>
                                        <h5 className="font-bold">Election Finalized</h5>
                                        <p className="text-sm opacity-80">This election is officially closed and the results are final.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Status Modal (Upcoming/Closed) */}
            {showStatusModal && statusModalConfig && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-300">
                    <div className="bg-ch-bg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border-2 border-ch-rule">
                        <div className="p-8 text-center">
                            <div className={`w-20 h-20 mx-auto flex items-center justify-center mb-6 ${statusModalConfig.type === 'upcoming' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-ch-surface text-ch-muted'}`}>
                                {statusModalConfig.type === 'upcoming' ? <ClockIcon className="w-10 h-10" /> : <BarChart3Icon className="w-10 h-10" />}
                            </div>
                            <h3 className="text-[22px] font-extrabold tracking-[-0.02em] text-ch-text mb-2">{statusModalConfig.title}</h3>
                            <p className="text-ch-muted leading-relaxed mb-8">
                                {statusModalConfig.message}
                            </p>

                            <div className="p-4 bg-ch-surface border border-ch-divider mb-8 inline-block mx-auto">
                                <span className="text-sm font-bold text-ch-muted uppercase tracking-widest block mb-1">
                                    {statusModalConfig.type === 'upcoming' ? 'Scheduled Start' : 'Ended On'}
                                </span>
                                <span className="text-lg font-black text-ch-accent">
                                    {new Date(statusModalConfig.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                            </div>

                            <button
                                onClick={() => setShowStatusModal(false)}
                                className="w-full py-4 bg-ch-text text-ch-bg font-bold hover:opacity-90 transition-all"
                            >
                                Understood
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VotingPage;
