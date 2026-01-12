import { GraveEntry, DeathCause } from './types';

export const MOCK_GRAVEYARD: GraveEntry[] = [
  {
    id: 'mock-1',
    repoUrl: 'https://github.com/tomhe/old-todo-app',
    name: 'Ultimate-Todo-List',
    description: 'A todo list app that was supposed to revolutionize productivity but I only finished the CSS.',
    language: 'JavaScript',
    stars: 2,
    forks: 0,
    birthDate: '2020-01-15',
    deathDate: '2020-01-20',
    owner: 'indie-dev-99',
    cause: DeathCause.LOST_INTEREST,
    eulogy: "Here lies Ultimate-Todo-List. It promised to organize lives, but couldn't even organize its own component structure. Born in a burst of caffeine, died in a whimper of distraction.",
    respectsPaid: 42,
    epitaph: "It compiled once.",
    burialDate: '2020-01-21'
  },
  {
    id: 'mock-2',
    repoUrl: 'https://github.com/tomhe/crypto-tracker',
    name: 'Moon-Rocket-Crypto',
    description: 'Real-time crypto dashboard using WebSocket.',
    language: 'TypeScript',
    stars: 12,
    forks: 3,
    birthDate: '2021-05-01',
    deathDate: '2022-11-10',
    owner: 'cryptobro',
    cause: DeathCause.FLOPPED,
    eulogy: "Moon-Rocket-Crypto aimed for the stars but ran out of fuel (and API credits). It lies here amidst the bear market, a testament to volatility.",
    respectsPaid: 15,
    burialDate: '2022-11-15'
  }
];