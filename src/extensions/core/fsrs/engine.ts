import { FSRS, generatorParameters, Rating, State, Card as FSRSCardType, createEmptyCard } from 'ts-fsrs';
import { FSRSCardRecord } from './types';

export function getFsrsInstance(retention = 0.9, maxInterval = 36500): FSRS {
  const params = generatorParameters({
    enable_fuzz: true,
    request_retention: retention,
    maximum_interval: maxInterval,
  });

  return new FSRS(params);
}

export function createNewFSRSCardState(): {
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: State;
  last_review: number | null;
} {
  const empty = createEmptyCard();
  return {
    due: empty.due.getTime(),
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsed_days: empty.elapsed_days,
    scheduled_days: empty.scheduled_days,
    reps: empty.reps,
    lapses: empty.lapses,
    state: empty.state,
    last_review: empty.last_review ? empty.last_review.getTime() : null,
  };
}

export function toFSRSCard(record: FSRSCardRecord): FSRSCardType {
  return {
    due: new Date(record.due),
    stability: record.stability,
    difficulty: record.difficulty,
    elapsed_days: record.elapsed_days,
    scheduled_days: record.scheduled_days,
    reps: record.reps,
    lapses: record.lapses,
    state: record.state,
    last_review: record.last_review ? new Date(record.last_review) : undefined,
  };
}

export interface SchedulingOption {
  rating: Rating;
  label: string;
  intervalText: string;
  nextCard: FSRSCardRecord;
}

export function getSchedulingOptions(
  cardRecord: FSRSCardRecord,
  now: Date = new Date(),
  retention = 0.9,
  maxInterval = 36500
): SchedulingOption[] {
  const fCard = toFSRSCard(cardRecord);
  const fsrsInstance = getFsrsInstance(retention, maxInterval);
  const scheduling = fsrsInstance.repeat(fCard, now);

  const ratings: { rating: Rating; label: string }[] = [
    { rating: Rating.Again, label: 'Again' },
    { rating: Rating.Hard, label: 'Hard' },
    { rating: Rating.Good, label: 'Good' },
    { rating: Rating.Easy, label: 'Easy' },
  ];

  return ratings.map((r) => {
    const item = (scheduling as any)[r.rating];
    const newCard = item.card;
    const intervalText = formatInterval(newCard.due, now);

    const updatedRecord: FSRSCardRecord = {
      ...cardRecord,
      due: newCard.due.getTime(),
      stability: newCard.stability,
      difficulty: newCard.difficulty,
      elapsed_days: newCard.elapsed_days,
      scheduled_days: newCard.scheduled_days,
      reps: newCard.reps,
      lapses: newCard.lapses,
      state: newCard.state,
      last_review: newCard.last_review ? newCard.last_review.getTime() : now.getTime(),
    };

    return {
      rating: r.rating,
      label: r.label,
      intervalText,
      nextCard: updatedRecord,
    };
  });
}

export function formatInterval(due: Date, now: Date = new Date()): string {
  const diffMs = due.getTime() - now.getTime();
  if (diffMs <= 0) return '<1m';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMin < 60) return `${Math.max(1, diffMin)}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 30) return `${diffDays}d`;
  if (diffMonths < 12) return `${diffMonths}mo`;
  return `${diffYears}y`;
}
