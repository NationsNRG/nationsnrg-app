'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

interface Team {
    id: string;
    name: string;
    owner_id: string;
}

interface TeamSwitcherProps {
    className?: string;
}

export default function TeamSwitcher({ className = '' }: TeamSwitcherProps) {
    const [teams, setTeams] = useState<Team[]>([]);
    const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Load teams on mount
    useEffect(() => {
        let mounted = true;

        async function loadTeams() {
            try {
                setLoading(true);
                setError(null);

                // Get current user and store their ID
                const {
                  data: { user },
                  error: userError,
                } = await supabase.auth.getUser();

                if (userError || !user) {
                  setTeams([]);
                  setCurrentTeam(null);
                  setLoading(false);
                  return;
                }

                // Store user ID for owner check
                setCurrentUserId(user.id);

                // Fetch all teams user belongs to
                const { data: memberships, error: membershipError } = await supabase
                    .from('team_members')
                    .select(`
                        team:team_id (
                            id,
                            name,
                            owner_id,
                            created_at
                        )
                    `)
                    .eq('user_id', user.id);

                if (membershipError) throw membershipError;

                if (mounted && memberships) {
                    // Transform the data to match our Team interface
                    const userTeams: Team[] = memberships
                        .map((item: any) => {
                            const teamData = Array.isArray(item.team) ? item.team[0] : item.team;
                            return teamData ? {
                                id: teamData.id,
                                name: teamData.name,
                                owner_id: teamData.owner_id
                            } : null;
                        })
                        .filter((team): team is Team => team !== null);

                    setTeams(userTeams);

                    // Determine current team
                    const savedTeamId = localStorage.getItem('currentTeam');
                    const savedTeam = userTeams.find(t => t.id === savedTeamId);
                    
                    if (savedTeam) {
                        setCurrentTeam(savedTeam);
                    } else if (userTeams.length > 0) {
                        setCurrentTeam(userTeams[0]);
                        localStorage.setItem('currentTeam', userTeams[0].id);
                    }
                }

            } catch (err) {
                console.error('Error loading teams:', err);
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Failed to load teams');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        loadTeams();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            loadTeams();
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const handleTeamSwitch = useCallback((team: Team) => {
        setCurrentTeam(team);
        localStorage.setItem('currentTeam', team.id);
        setIsOpen(false);
        
        // Dispatch custom event for dashboard to listen to
        window.dispatchEvent(new CustomEvent('teamChanged', { detail: team }));
        
        // No more window.location.reload() - dashboard will update via event
    }, []);

    // Memoized display name
    const displayName = useMemo(() => {
        if (currentTeam) return currentTeam.name;
        if (teams.length > 0) return 'Select Team';
        return 'No Teams';
    }, [currentTeam, teams]);

    // Fix 1: Owner logic now compares owner_id with currentUserId, not team.id
    const isOwner = useCallback((team: Team) => {
        return team.owner_id === currentUserId;
    }, [currentUserId]);

    // Loading state
    if (loading) {
        return (
            <div className={`relative inline-block ${className}`}>
                <div className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm text-gray-600">Loading teams...</span>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={`relative inline-block ${className}`}>
                <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg shadow-sm">
                    <span className="text-sm text-red-600">Error loading teams</span>
                </div>
            </div>
        );
    }

    // No teams state
    if (teams.length === 0) {
        return (
            <div className={`relative inline-block ${className}`}>
                <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
                    <span className="text-sm text-gray-500">No teams available</span>
                </div>
            </div>
        );
    }

    // Single team - just display (no dropdown needed)
    if (teams.length === 1 && currentTeam) {
        return (
            <div className={`relative inline-block ${className}`}>
                <div className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-gray-700">{currentTeam.name}</span>
                    {isOwner(currentTeam) && (
                        <span className="ml-2 text-xs text-gray-500">(Owner)</span>
                    )}
                </div>
            </div>
        );
    }

    // Multiple teams - show dropdown
    return (
        <div className={`relative inline-block text-left ${className}`}>
            <div>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="inline-flex items-center justify-between w-full px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    <div className="flex items-center min-w-0">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 flex-shrink-0"></div>
                        <span className="text-sm font-medium text-gray-700 truncate max-w-[150px]">
                            {displayName}
                        </span>
                    </div>
                    <svg 
                        className={`w-5 h-5 ml-2 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'transform rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

            {/* Dropdown menu */}
            {isOpen && (
                <>
                    {/* Backdrop for clicking outside */}
                    <div 
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    
                    <div className="absolute right-0 z-20 w-56 mt-2 origin-top-right bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                        <div className="py-1 max-h-96 overflow-y-auto">
                            {teams.map((team) => {
                                const selected = currentTeam?.id === team.id;
                                const owner = isOwner(team);
                                
                                return (
                                    <button
                                        key={team.id}
                                        onClick={() => handleTeamSwitch(team)}
                                        className={`
                                            w-full text-left px-4 py-2 text-sm relative
                                            ${selected 
                                                ? 'bg-blue-50 text-blue-700' 
                                                : 'text-gray-700 hover:bg-gray-100'
                                            }
                                            transition-colors duration-150
                                        `}
                                        role="menuitem"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium truncate">{team.name}</span>
                                            {owner && (
                                                <span className="ml-2 text-xs text-gray-500 flex-shrink-0">Owner</span>
                                            )}
                                        </div>
                                        {selected && (
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        
                        {/* Footer with team count */}
                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 rounded-b-lg">
                            <p className="text-xs text-gray-500">
                                {teams.length} {teams.length === 1 ? 'team' : 'teams'}
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}