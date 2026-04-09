
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
        if (isVotingOpen(pos)) {
            setSelectedPosition(pos);
            if (action === 'contest') {
                setShowContestModal(true);
            } else {
                handleOpenVoteModal(pos);
            }
            return;
        }

        setSelectedPosition(pos);
        if (isUpcoming(pos)) {
            setStatusModalConfig({
                title: 'Voting Not Yet Open',
                message: `The ${action === 'contest' ? 'contest entry' : 'voting'} for this position hasn't started yet. Please check back once the window opens.`,
                type: 'upcoming',
                date: pos.startDate
            });
        } else {
            setStatusModalConfig({
                title: 'Voting Period Closed',
                message: `The ${action === 'contest' ? 'contest entry' : 'voting'} period for this position has ended. You can view the final results in the Results tab.`,
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-premium border border-gray-100 dark:border-gray-700 glassmorphism">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-3 bg-pink-100 dark:bg-pink-900/40 rounded-xl text-pink-600 dark:text-pink-400">
                            <VoteIcon className="w-7 h-7" />
                        </div>
                        Voting Hub
                    </h2>
                    <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-lg">
                        Shape the future of the club. Contest for positions, review candidates, and cast your vote.
                    </p>
                </div>

                <div className="flex p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'active' ? 'bg-white dark:bg-gray-600 text-pink-600 dark:text-pink-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'past' ? 'bg-white dark:bg-gray-600 text-pink-600 dark:text-pink-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                    >
                        Past
                    </button>
                    {currentUser.role === 'PATRON' && (
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'create' ? 'bg-white dark:bg-gray-600 text-pink-600 dark:text-pink-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                        >
                            Manage
                        </button>
                    )}
                    {currentUser.role === 'PATRON' && (
                        <button
                            onClick={() => setActiveTab('vetting')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all relative ${activeTab === 'vetting' ? 'bg-white dark:bg-gray-600 text-pink-600 dark:text-pink-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                        >
                            Vetting
                            {pendingContestants.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 text-white text-[10px] flex items-center justify-center rounded-full animate-pulse">
                                    {pendingContestants.length}
                                </span>
                            )}
                        </button>
                    )}
                    {currentUser.role === 'PATRON' && (
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'analytics' ? 'bg-white dark:bg-gray-600 text-pink-600 dark:text-pink-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                        >
                            Analytics
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">Open now</p>
                    <p className="text-2xl font-extrabold text-green-600 dark:text-green-400 mt-1">{electionStats.open}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">Upcoming</p>
                    <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{electionStats.upcoming}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">Closed</p>
                    <p className="text-2xl font-extrabold text-gray-700 dark:text-gray-200 mt-1">{electionStats.closed}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">Pending vetting</p>
                    <p className="text-2xl font-extrabold text-pink-600 dark:text-pink-400 mt-1">{pendingContestants.length}</p>
                </div>
            </div>

            {votingError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-3">
                    <AlertIcon className="w-5 h-5" />
                    <p>{votingError}</p>
                </div>
            )}

            {isLoadingVoting ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-2xl" />
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
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                            className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        >
                            <option value="all">All statuses</option>
                            <option value="open">Open now</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredActiveElections.length === 0 ? (
                        <div className="col-span-full py-20 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center px-4">
                            <VoteIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Matching Elections</h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Try clearing your search or changing the status filter.</p>
                        </div>
                    ) : filteredActiveElections.map(pos => (
                        <div key={pos.id} className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 p-6 flex flex-col transition-all duration-300 hover:-translate-y-1">
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isVotingOpen(pos) ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'}`}>
                                    {isVotingOpen(pos) ? 'Open' : isUpcoming(pos) ? 'Upcoming' : 'Closed'}
                                </span>
                                <span className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                                    <ClockIcon className="w-3 h-3" />
                                    {isUpcoming(pos) ? `Starts in ${getTimeRemaining(pos.startDate)}` : getTimeRemaining(pos.dueDate)}
                                </span>
                                {currentUser.role === 'PATRON' && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Are you sure you want to delete this position? All candidates and votes will be permanently removed.')) {
                                                deleteVotingPosition(pos.id);
                                            }
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                        title="Delete Position"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-pink-600 transition-colors">
                                {pos.title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-4 flex-grow">
                                {pos.description || 'No description provided.'}
                            </p>

                            {pos.criteria && (
                                <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
                                    <p className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1 mb-1">
                                        <InfoIcon className="w-3.5 h-3.5" />
                                        Contesting Criteria
                                    </p>
                                    <p className="text-xs text-blue-600/80 dark:text-blue-400/80 italic">
                                        {pos.criteria}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                <button
                                    onClick={() => handleActionClick(pos, 'contest')}
                                    disabled={userContestantFor.has(pos.id)}
                                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed ${userContestantFor.has(pos.id) ? 'bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                >
                                    <UserIcon className="w-4 h-4" />
                                    {userContestantFor.has(pos.id) ? (
                                        getContestantStatus(pos.id) === 'APPROVED' ? 'Approved Candidate' :
                                            getContestantStatus(pos.id) === 'REJECTED' ? 'Application Rejected' :
                                                'Applied (Pending)'
                                    ) : 'Contest'}
                                </button>
                                <button
                                    onClick={() => handleActionClick(pos, 'vote')}
                                    className="flex items-center justify-center gap-2 py-3 px-4 bg-pink-600 text-white rounded-xl font-bold hover:bg-pink-700 shadow-lg shadow-pink-500/25 transition-all text-sm"
                                >
                                    <VoteIcon className="w-4 h-4" />
                                    Vote Now
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                </div>
            ) : activeTab === 'past' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pastElections.length === 0 ? (
                        <div className="col-span-full py-20 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center px-4">
                            <BarChart3Icon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Past Elections</h3>
                        </div>
                    ) : pastElections.map(pos => (
                        <div key={pos.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-xs font-bold uppercase tracking-wider">
                                    Closed
                                </span>
                                <span className="text-xs text-gray-400 font-medium">
                                    Ended {new Date(pos.dueDate).toLocaleDateString()}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {pos.title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-6 flex-grow">
                                {pos.description}
                            </p>

                            <button
                                onClick={() => handleOpenResults(pos)}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-xl font-bold hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all text-sm"
                            >
                                <BarChart3Icon className="w-4 h-4" />
                                View Results
                            </button>
                            {currentUser.role === 'PATRON' && (
                                <button
                                    onClick={() => {
                                        if (window.confirm('Are you sure you want to delete this past position? This cannot be undone.')) {
                                            deleteVotingPosition(pos.id);
                                        }
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all text-sm mt-3"
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
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-premium border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Contestant Vetting</h3>
                                <p className="text-gray-500 text-sm mt-1">Review manifestos and approve candidates for the ballot.</p>
                            </div>
                            <div className="px-4 py-2 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 rounded-xl text-xs font-bold uppercase tracking-widest">
                                {pendingContestants.length} Pending
                            </div>
                        </div>

                        {pendingContestants.length === 0 ? (
                            <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                                <CheckIcon className="w-16 h-16 text-green-200 dark:text-green-900/40 mx-auto mb-4" />
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white">All Caught Up!</h4>
                                <p className="text-gray-500 mt-1">No candidates are currently waiting for approval.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {pendingContestants.map(c => {
                                    const pos = votingPositions.find(p => p.id === c.positionId);
                                    return (
                                        <div key={c.id} className="group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex items-center gap-4 mb-4">
                                                <img
                                                    src={c.userAvatarUrl || `https://i.pravatar.cc/100?u=${c.userId}`}
                                                    className="w-12 h-12 rounded-2xl object-cover border-2 border-white dark:border-gray-700 shadow-sm"
                                                />
                                                <div>
                                                    <h4 className="font-bold text-gray-900 dark:text-white">{c.userName}</h4>
                                                    <span className="text-[10px] font-black text-pink-500 uppercase tracking-tighter bg-pink-50 dark:bg-pink-900/20 px-2 py-0.5 rounded">
                                                        For {pos?.title || 'Unknown Position'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl mb-6 text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
                                                "{c.manifesto}"
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => updateContestantStatus(c.id, 'APPROVED')}
                                                    className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-500/20"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => updateContestantStatus(c.id, 'REJECTED')}
                                                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
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
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-premium border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-pink-500/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
                            <div className="flex items-center gap-3 text-pink-600 mb-4">
                                <BarChart3Icon className="w-6 h-6" />
                                <h4 className="font-bold text-xs uppercase tracking-widest">Global Participation</h4>
                            </div>
                            <div className="text-4xl font-black text-gray-900 dark:text-white">
                                {allUsers.length > 0 ? ((analyticsVotes.length / allUsers.length) * 100).toFixed(1) : 0}%
                            </div>
                            <p className="text-xs text-gray-500 mt-2 font-medium">{analyticsVotes.length} votes cast by {allUsers.length} members</p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-premium border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
                            <div className="flex items-center gap-3 text-blue-600 mb-4">
                                <UserIcon className="w-6 h-6" />
                                <h4 className="font-bold text-xs uppercase tracking-widest">Election Density</h4>
                            </div>
                            <div className="text-4xl font-black text-gray-900 dark:text-white">
                                {votingPositions.length > 0 ? (globalContestantsCount / votingPositions.length).toFixed(1) : 0}
                            </div>
                            <p className="text-xs text-gray-500 mt-2 font-medium">Average candidates per election</p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-premium border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
                            <div className="flex items-center gap-3 text-green-600 mb-4">
                                <CheckIcon className="w-6 h-6" />
                                <h4 className="font-bold text-xs uppercase tracking-widest">Vetting Efficiency</h4>
                            </div>
                            <div className="text-4xl font-black text-gray-900 dark:text-white">
                                {globalContestantsCount > 0 ? ((approvedContestants.length / globalContestantsCount) * 100).toFixed(0) : 0}%
                            </div>
                            <p className="text-xs text-gray-500 mt-2 font-medium">{approvedContestants.length} of {globalContestantsCount} apps approved</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-premium border border-gray-100 dark:border-gray-700">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-8">Vote Distribution by Position</h4>
                        <div className="space-y-6">
                            {votingPositions.slice(0, 6).map(pos => {
                                const posVotes = analyticsVotes.filter(v => v.positionId === pos.id).length;
                                const percent = analyticsVotes.length > 0 ? (posVotes / analyticsVotes.length) * 100 : 0;
                                return (
                                    <div key={pos.id} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-pink-500" />
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{pos.title}</span>
                                            </div>
                                            <span className="text-sm font-black text-gray-900 dark:text-white">{posVotes} <span className="text-[10px] text-gray-400 font-normal uppercase ml-1">Votes</span></span>
                                        </div>
                                        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden p-[2px]">
                                            <div
                                                className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-premium border border-gray-100 dark:border-gray-700">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Position</h3>
                    <form onSubmit={handleCreatePosition} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Position Title</label>
                            <input
                                type="text"
                                required
                                className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none transition-all dark:text-white"
                                placeholder="e.g. Club President"
                                value={newPos.title}
                                onChange={e => setNewPos({ ...newPos, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Description</label>
                            <textarea
                                className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none transition-all min-h-[120px] dark:text-white"
                                placeholder="Describe the responsibilities..."
                                value={newPos.description}
                                onChange={e => setNewPos({ ...newPos, description: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Contesting Criteria</label>
                            <textarea
                                className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none transition-all min-h-[80px] dark:text-white"
                                placeholder="Who is eligible? (e.g. Must be a member for 6 months)"
                                value={newPos.criteria}
                                onChange={e => setNewPos({ ...newPos, criteria: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Voting Starts</label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none transition-all dark:text-white"
                                    value={newPos.startDate}
                                    onChange={e => setNewPos({ ...newPos, startDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Voting Ends (Deadline)</label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none transition-all dark:text-white"
                                    value={newPos.dueDate}
                                    onChange={e => setNewPos({ ...newPos, dueDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <button
                            disabled={isSubmitting}
                            className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-pink-500/25 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Posting...' : 'Post Position'}
                        </button>
                    </form>
                </div>
            )}

            {/* Contest Modal */}
            {showContestModal && selectedPosition && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Contest for {selectedPosition.title}</h3>
                                <p className="text-sm text-gray-500 mt-1">Submit your manifesto to the club</p>
                            </div>
                            <button
                                onClick={() => setShowContestModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <XIcon className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {selectedPosition.criteria && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
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
                                            className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 transition-all"
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
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Your Manifesto</label>
                                <textarea
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none transition-all min-h-[160px] dark:text-white text-sm"
                                    placeholder="Explain why you are the best fit for this role..."
                                    value={manifesto}
                                    onChange={e => setManifesto(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowContestModal(false)}
                                    className="flex-1 py-4 text-gray-500 font-bold hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isSubmitting || (selectedPosition.criteria && !criteriaAgreed)}
                                    onClick={handleContest}
                                    className="flex-[2] py-4 bg-pink-600 text-white rounded-2xl font-bold hover:bg-pink-700 transition-all shadow-lg shadow-pink-500/25 disabled:opacity-50"
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
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Vote for {selectedPosition.title}</h3>
                                <p className="text-sm text-gray-500 mt-1">{contestants.length} Contestants</p>
                            </div>
                            <button
                                onClick={() => setShowVoteModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <XIcon className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {!isVotingOpen(selectedPosition) && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                                    <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Voting opens on {formatDateTime(selectedPosition.startDate)}</p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">You can review every candidate manifesto now, and cast your vote once voting officially opens.</p>
                                </div>
                            )}

                            {contestants.length === 0 ? (
                                <div className="text-center py-10">
                                    <UserIcon className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                                    <p className="text-gray-500">No approved candidates available yet.</p>
                                </div>
                            ) : approvedContestants.map(contestant => (
                                <div key={contestant.id} className="p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-sm hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4 mb-4">
                                        <img
                                            src={contestant.userAvatarUrl || `https://i.pravatar.cc/100?u=${contestant.userId}`}
                                            alt={contestant.userName}
                                            className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-gray-700 shadow-sm"
                                        />
                                        <div>
                                            <h4 className="font-extrabold text-gray-900 dark:text-white text-lg">{contestant.userName}</h4>
                                            <p className="text-xs text-pink-600 dark:text-pink-400 font-bold uppercase tracking-widest">Candidate for {selectedPosition.title}</p>
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Manifesto</p>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
                                            {contestant.manifesto?.trim() ? `"${contestant.manifesto}"` : 'No manifesto provided by this candidate yet.'}
                                        </div>
                                    </div>
                                    <button
                                        disabled={isSubmitting || hasUserVoted || !isVotingOpen(selectedPosition)}
                                        onClick={() => handleCastVote(contestant.id)}
                                        className="w-full py-4 bg-white dark:bg-gray-700 border-2 border-pink-100 dark:border-pink-900/30 text-pink-600 dark:text-pink-400 rounded-2xl font-bold hover:bg-pink-600 hover:text-white dark:hover:bg-pink-600 dark:hover:text-white transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
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
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Results: {selectedPosition.title}</h3>
                                <p className="text-sm text-gray-500 mt-1">{votes.length} Votes Cast Total</p>
                            </div>
                            <button
                                onClick={() => setShowResultsModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <XIcon className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {sortedResults.length === 0 ? (
                                <div className="text-center py-10 font-medium text-gray-500">
                                    No data available for this election.
                                </div>
                            ) : sortedResults.map((contestant, index) => {
                                const count = getVoteCount(contestant.id);
                                const percent = votes.length > 0 ? (count / votes.length) * 100 : 0;

                                return (
                                    <div key={contestant.id} className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {index === 0 && <span className="p-1 px-2 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 rounded text-[10px] font-black uppercase">Winner</span>}
                                                <h4 className="font-bold text-gray-900 dark:text-white">{contestant.userName}</h4>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-lg font-black text-gray-900 dark:text-white">{count}</span>
                                                <span className="text-xs text-gray-400 ml-1">votes ({percent.toFixed(0)}%)</span>
                                            </div>
                                        </div>
                                        <div className="h-4 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden p-[2px]">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${index === 0 ? 'bg-gradient-to-r from-pink-500 to-purple-600 shadow-sm' : 'bg-gray-300 dark:bg-gray-500'}`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="mt-8 p-6 bg-pink-50 dark:bg-pink-900/10 rounded-2xl border border-pink-100 dark:border-pink-900/30">
                                <div className="flex items-center gap-3 text-pink-700 dark:text-pink-300">
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
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100 dark:border-gray-700">
                        <div className="p-8 text-center">
                            <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-6 ${statusModalConfig.type === 'upcoming' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                {statusModalConfig.type === 'upcoming' ? <ClockIcon className="w-10 h-10" /> : <BarChart3Icon className="w-10 h-10" />}
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{statusModalConfig.title}</h3>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
                                {statusModalConfig.message}
                            </p>

                            <div className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-700 mb-8 inline-block mx-auto">
                                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest block mb-1">
                                    {statusModalConfig.type === 'upcoming' ? 'Scheduled Start' : 'Ended On'}
                                </span>
                                <span className="text-lg font-black text-pink-600 dark:text-pink-400">
                                    {new Date(statusModalConfig.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                            </div>

                            <button
                                onClick={() => setShowStatusModal(false)}
                                className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl"
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
