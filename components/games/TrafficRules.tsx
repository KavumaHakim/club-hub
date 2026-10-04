import React, { useRef, useState } from 'react';
import { BigButton, Feedback, GameProps, Hud, OverScreen, StartScreen, pickOne, useCountdown } from './gameKit';

// Conditionals, unplugged: a boda boda rider at a junction follows IF / ELSE IF
// rules, checked top to bottom, first true one wins (exactly like if/elif/else).
// Every few right answers the rules get longer and use AND / OR / NOT.

const ROUND_SECONDS = 60;
const LEVEL_EVERY = 6;

type Light = 'red' | 'amber' | 'green';
type Action = 'STOP' | 'SLOW' | 'GO';
interface Scene { light: Light; crossing: boolean; ambulance: boolean }
interface Rule { text: string; when: (s: Scene) => boolean; then: Action }

// The last rule of each level is the ELSE: always true.
const LEVELS: { shows: (keyof Scene)[]; rules: Rule[] }[] = [
  {
    shows: ['light'],
    rules: [
      { text: 'IF the light is red', when: (s) => s.light === 'red', then: 'STOP' },
      { text: 'ELSE IF the light is amber', when: (s) => s.light === 'amber', then: 'SLOW' },
      { text: 'ELSE', when: () => true, then: 'GO' },
    ],
  },
  {
    shows: ['light', 'crossing'],
    rules: [
      { text: 'IF someone is crossing', when: (s) => s.crossing, then: 'STOP' },
      { text: 'ELSE IF the light is red', when: (s) => s.light === 'red', then: 'STOP' },
      { text: 'ELSE IF the light is amber', when: (s) => s.light === 'amber', then: 'SLOW' },
      { text: 'ELSE', when: () => true, then: 'GO' },
    ],
  },
  {
    shows: ['light', 'crossing', 'ambulance'],
    rules: [
      { text: 'IF an ambulance is coming', when: (s) => s.ambulance, then: 'SLOW' },
      { text: 'ELSE IF the light is red OR someone is crossing', when: (s) => s.light === 'red' || s.crossing, then: 'STOP' },
      { text: 'ELSE IF the light is amber', when: (s) => s.light === 'amber', then: 'SLOW' },
      { text: 'ELSE', when: () => true, then: 'GO' },
    ],
  },
  {
    shows: ['light', 'crossing', 'ambulance'],
    rules: [
      { text: 'IF the light is green AND nobody is crossing AND NOT an ambulance', when: (s) => s.light === 'green' && !s.crossing && !s.ambulance, then: 'GO' },
      { text: 'ELSE IF an ambulance is coming AND the light is NOT red', when: (s) => s.ambulance && s.light !== 'red', then: 'SLOW' },
      { text: 'ELSE IF the light is amber AND nobody is crossing', when: (s) => s.light === 'amber' && !s.crossing, then: 'SLOW' },
      { text: 'ELSE', when: () => true, then: 'STOP' },
    ],
  },
];

const LIGHT_DOT: Record<Light, string> = { red: '#dc2626', amber: '#f59e0b', green: '#16a34a' };
const ACTIONS: Action[] = ['STOP', 'SLOW', 'GO'];

const firstMatch = (rules: Rule[], scene: Scene) => rules.findIndex((r) => r.when(scene));

const newScene = (level: number): Scene => {
  const shows = LEVELS[level].shows;
  return {
    light: pickOne<Light>(['red', 'amber', 'green']),
    crossing: shows.includes('crossing') && Math.random() < 0.4,
    ambulance: shows.includes('ambulance') && Math.random() < 0.3,
  };
};

const TrafficRules: React.FC<GameProps> = ({ best, onFinish }) => {
  const [phase, setPhase] = useState<'start' | 'play' | 'over'>('start');
  const [score, setScore] = useState(0);
  const [right, setRight] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(0);
  const [scene, setScene] = useState<Scene>(() => newScene(0));
  const [lastRule, setLastRule] = useState<number | null>(null);
  const [note, setNote] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);
  const scoreRef = useRef(0);
  scoreRef.current = score;

  const start = () => {
    setScore(0);
    setRight(0);
    setWrong(0);
    setStreak(0);
    setLevel(0);
    setScene(newScene(0));
    setLastRule(null);
    setNote(null);
    setPhase('play');
  };
  const end = () => {
    setPhase('over');
    onFinish(scoreRef.current);
  };
  const left = useCountdown(ROUND_SECONDS, phase === 'play', end);

  const rules = LEVELS[level].rules;

  const answer = (action: Action) => {
    const ruleIndex = firstMatch(rules, scene);
    const correct = rules[ruleIndex].then === action;
    setLastRule(ruleIndex);
    if (correct) {
      const nextStreak = streak + 1;
      const points = nextStreak >= 5 ? 2 : 1;
      const nextRight = right + 1;
      setScore((s) => s + points);
      setStreak(nextStreak);
      setRight(nextRight);
      const nextLevel = Math.min(LEVELS.length - 1, Math.floor(nextRight / LEVEL_EVERY));
      if (nextLevel !== level) {
        setLevel(nextLevel);
        setNote({ tone: 'good', text: `Level ${nextLevel + 1}: new rules! Read them top to bottom.` });
        setLastRule(null);
      } else {
        setNote({ tone: 'good', text: `${action}: "${rules[ruleIndex].text}" was the first rule that's true.${points > 1 ? ' Streak bonus +2.' : ''}` });
      }
      setScene(newScene(nextLevel));
    } else {
      setStreak(0);
      setWrong((w) => w + 1);
      setNote({
        tone: 'bad',
        text: `Not ${action}. The first true rule is "${rules[ruleIndex].text}", so it's ${rules[ruleIndex].then}. Rules below it don't count.`,
      });
      setScene(newScene(level));
    }
  };

  if (phase === 'start') {
    return (
      <StartScreen
        concept="IF / ELSE IF / ELSE, AND, OR and NOT"
        howTo={[
          'You\'re riding a boda boda to a junction. Look at the scene.',
          'Read the rules from the top. The first rule that is true decides: STOP, SLOW or GO.',
          'Every few right answers the rules change and get trickier.',
          `Score as many as you can in ${ROUND_SECONDS} seconds. 5 in a row doubles your points.`,
        ]}
        onStart={start}
      />
    );
  }

  if (phase === 'over') {
    return (
      <OverScreen
        score={score}
        best={best}
        lines={[`${right} right, ${wrong} wrong`, `Reached level ${level + 1} of ${LEVELS.length}`]}
        lesson="Programs check if / elif / else from the top and stop at the first condition that's true. That's why order matters: in level 2, someone crossing on a green light still means STOP, because that rule comes first."
        onAgain={start}
      />
    );
  }

  const shows = LEVELS[level].shows;

  return (
    <div className="max-w-3xl">
      <Hud items={[
        { label: 'Time', value: `${left}s`, tone: left <= 10 ? 'warn' : undefined },
        { label: 'Score', value: score, tone: 'accent' },
        { label: 'Streak', value: streak },
        { label: 'Level', value: `${level + 1}/${LEVELS.length}` },
      ]} />

      <div className="grid gap-5 md:grid-cols-[1fr_1.2fr]">
        {/* The junction */}
        <div className="border-2 border-ch-rule p-4">
          <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ch-muted">At the junction</p>
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1.5 bg-neutral-900 p-2" aria-label={`Light is ${scene.light}`}>
              {(['red', 'amber', 'green'] as Light[]).map((c) => (
                <span key={c} className="h-7 w-7 rounded-full" style={{ background: scene.light === c ? LIGHT_DOT[c] : '#3f3f46' }} />
              ))}
            </div>
            <ul className="space-y-2 text-[14px]">
              <li><span className="font-extrabold capitalize">{scene.light}</span> light</li>
              {shows.includes('crossing') && <li>{scene.crossing ? '🚶 Someone is crossing' : 'Nobody crossing'}</li>}
              {shows.includes('ambulance') && <li>{scene.ambulance ? '🚑 Ambulance coming' : 'No ambulance'}</li>}
            </ul>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {ACTIONS.map((a) => (
              <BigButton key={a} tone={a === 'GO' ? 'primary' : 'plain'} onClick={() => answer(a)}>{a}</BigButton>
            ))}
          </div>
        </div>

        {/* The rules, checked top to bottom */}
        <div>
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ch-muted">Rules, checked from the top</p>
          <ol className="border border-ch-divider font-mono text-[12.5px]">
            {rules.map((r, i) => (
              <li key={r.text} className={`flex justify-between gap-3 border-t border-ch-divider px-3 py-2 first:border-t-0 ${lastRule === i ? 'bg-ch-accent-soft' : ''}`}>
                <span>{r.text}</span>
                <span className="flex-none font-extrabold">→ {r.then}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      {note && <Feedback tone={note.tone}>{note.text}</Feedback>}
    </div>
  );
};

export default TrafficRules;
