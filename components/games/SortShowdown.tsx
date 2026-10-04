import React, { useState } from 'react';
import { BigButton, Feedback, GameProps, Hud, OverScreen, StartScreen, pickOne, randInt, shuffle } from './gameKit';

// Sorting by swapping neighbours (what bubble sort does). The fewest swaps that
// can sort a row equals its number of out-of-order pairs ("inversions"), so every
// round has a known best to aim for.

const ROUNDS = 8;
const STALLS = ['Mangoes', 'Tomatoes', 'Sugar cane', 'Avocados', 'Pineapples', 'Chapatis', 'Rolexes', 'Sodas'];

const inversions = (row: number[]) => {
  let n = 0;
  for (let i = 0; i < row.length; i += 1) for (let j = i + 1; j < row.length; j += 1) if (row[i] > row[j]) n += 1;
  return n;
};

const makeRow = (round: number) => {
  const size = Math.min(8, 4 + Math.floor(round / 2));
  const prices = new Set<number>();
  while (prices.size < size) prices.add(randInt(1, 40) * 100);
  let row = shuffle([...prices]);
  while (inversions(row) < Math.max(2, size - 1)) row = shuffle(row);
  return row;
};

const SortShowdown: React.FC<GameProps> = ({ best, onFinish }) => {
  const [phase, setPhase] = useState<'start' | 'play' | 'over'>('start');
  const [round, setRound] = useState(0);
  const [row, setRow] = useState<number[]>(() => makeRow(0));
  const [target, setTarget] = useState(0);
  const [swaps, setSwaps] = useState(0);
  const [stall, setStall] = useState(STALLS[0]);
  const [score, setScore] = useState(0);
  const [perfect, setPerfect] = useState(0);
  const [note, setNote] = useState<{ tone: 'good' | 'bad' | 'info'; text: string } | null>(null);
  const [done, setDone] = useState(false);

  const setUp = (r: number) => {
    const next = makeRow(r);
    setRow(next);
    setTarget(inversions(next));
    setSwaps(0);
    setStall(pickOne(STALLS));
    setDone(false);
  };

  const start = () => {
    setRound(0);
    setScore(0);
    setPerfect(0);
    setNote(null);
    setUp(0);
    setPhase('play');
  };

  const swap = (i: number) => {
    if (done) return;
    const next = [...row];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    const made = swaps + 1;
    setRow(next);
    setSwaps(made);
    if (inversions(next) === 0) {
      const extra = made - target;
      const points = Math.max(2, 10 - extra * 2);
      setScore((s) => s + points);
      if (extra === 0) setPerfect((p) => p + 1);
      setDone(true);
      setNote({
        tone: extra === 0 ? 'good' : 'info',
        text: extra === 0
          ? `Sorted in ${made} swaps, the fewest possible! +${points}`
          : `Sorted in ${made} swaps; ${target} was possible. Swapping a pair that's already in order undoes progress. +${points}`,
      });
    }
  };

  const nextRound = () => {
    const r = round + 1;
    if (r >= ROUNDS) {
      setPhase('over');
      onFinish(score);
      return;
    }
    setRound(r);
    setNote(null);
    setUp(r);
  };

  if (phase === 'start') {
    return (
      <StartScreen
        concept="sorting algorithms and counting the work they do"
        howTo={[
          'A market stall\'s prices are in a muddle. Sort them from cheapest to dearest.',
          'You can only swap two neighbours: tap the ⇄ between them.',
          'Each row has a smallest possible number of swaps. Hit it for 10 points; every extra swap costs 2.',
          `${ROUNDS} rows, getting longer.`,
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
        lines={[`${perfect} of ${ROUNDS} rows sorted in the fewest swaps`]}
        lesson="Only swapping a pair that's in the wrong order makes progress, and each such swap fixes exactly one out-of-order pair. So the fewest swaps is the number of out-of-order pairs. Bubble sort works this way, which is why it gets slow on long lists."
        onAgain={start}
      />
    );
  }

  return (
    <div className="max-w-3xl">
      <Hud items={[
        { label: 'Row', value: `${round + 1}/${ROUNDS}` },
        { label: 'Score', value: score, tone: 'accent' },
        { label: 'Swaps', value: swaps },
        { label: 'Fewest possible', value: target },
      ]} />
      <p className="mb-3 text-[13px] text-ch-muted">{stall}: prices in UGX, cheapest on the left.</p>

      <div className="flex flex-wrap items-center gap-y-3">
        {row.map((price, i) => {
          const sortedHere = [...row].sort((a, b) => a - b)[i] === price;
          return (
            <React.Fragment key={price}>
              <div className={`flex h-16 min-w-[64px] items-center justify-center border-2 px-2 text-[15px] font-extrabold tabular-nums ${done || sortedHere ? 'border-ch-rule' : 'border-ch-divider'} ${done ? 'bg-green-500/10' : 'bg-ch-bg'}`}>
                {price.toLocaleString()}
              </div>
              {i < row.length - 1 && (
                <button
                  type="button"
                  onClick={() => swap(i)}
                  disabled={done}
                  aria-label={`Swap ${price} and ${row[i + 1]}`}
                  className="mx-1 h-10 w-8 text-[16px] font-extrabold text-ch-muted hover:bg-ch-accent-soft hover:text-ch-accent disabled:opacity-30"
                >
                  ⇄
                </button>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {note && <Feedback tone={note.tone}>{note.text}</Feedback>}
      {done && (
        <BigButton tone="primary" className="mt-4" onClick={nextRound}>{round + 1 >= ROUNDS ? 'Finish' : 'Next row'}</BigButton>
      )}
    </div>
  );
};

export default SortShowdown;
