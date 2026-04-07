
-- Voting Positions Table
CREATE TABLE IF NOT EXISTS voting_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    criteria TEXT, -- Eligibility criteria for contesting
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voting Contestants Table
CREATE TABLE IF NOT EXISTS voting_contestants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    position_id UUID REFERENCES voting_positions(id) ON DELETE CASCADE,
    user_uid TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
    manifesto TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(position_id, user_uid) -- One entry per member per position
);

-- Voting Votes Table
CREATE TABLE IF NOT EXISTS voting_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    position_id UUID REFERENCES voting_positions(id) ON DELETE CASCADE,
    contestant_id UUID REFERENCES voting_contestants(id) ON DELETE CASCADE,
    voter_uid TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(position_id, voter_uid) -- One vote per member per position
);

-- RLS Policies

-- Voting Positions
ALTER TABLE voting_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view positions" 
ON voting_positions FOR SELECT 
USING (true);

CREATE POLICY "Patrons can create positions" 
ON voting_positions FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE uid = auth.uid()::text AND role = 'PATRON'
    )
);

CREATE POLICY "Patrons can update positions" 
ON voting_positions FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE uid = auth.uid()::text AND role = 'PATRON'
    )
);

-- Voting Contestants
ALTER TABLE voting_contestants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view contestants" 
ON voting_contestants FOR SELECT 
USING (true);

CREATE POLICY "Members can contest" 
ON voting_contestants FOR INSERT 
WITH CHECK (auth.uid()::text = user_uid);

-- Voting Votes
ALTER TABLE voting_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voters can see their own votes" 
ON voting_votes FOR SELECT 
USING (auth.uid()::text = voter_uid);

CREATE POLICY "Patrons can see all votes" 
ON voting_votes FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE uid = auth.uid()::text AND role = 'PATRON'
    )
);

CREATE POLICY "Authenticated users can vote" 
ON voting_votes FOR INSERT 
WITH CHECK (auth.uid()::text = voter_uid);

-- Migration for Feature Flags
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='feature_flags' AND column_name='show_voting') THEN 
        ALTER TABLE public.feature_flags ADD COLUMN show_voting BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;
